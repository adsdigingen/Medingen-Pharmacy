import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '../common/DataTable';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { 
  FiAlertTriangle, FiAlertCircle, FiTrendingUp, FiTrendingDown, 
  FiInfo, FiLayers, FiList, FiActivity 
} from 'react-icons/fi';

interface InventoryTabProps {
  inventorySubTab: 'stock' | 'batches' | 'ledger' | 'adjustments';
  setInventorySubTab: (val: 'stock' | 'batches' | 'ledger' | 'adjustments') => void;
  inventories: any[];
  batches: any[];
  handleOpenAdjustModal: (batch: any) => void;
  allProducts: any[];
  purchaseOrders: any[];
  invoices: any[];
  API_BASE: string;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  inventorySubTab,
  setInventorySubTab,
  inventories,
  batches,
  handleOpenAdjustModal,
  allProducts,
  purchaseOrders,
  invoices,
  API_BASE,
}) => {
  const [selectedInventory, setSelectedInventory] = useState<any | null>(null);
  const [detailTab, setDetailTab] = useState<'summary' | 'batches' | 'ledger' | 'adjustments' | 'purchases' | 'sales'>('summary');
  
  // Dynamic details fetching state
  const [productLedger, setProductLedger] = useState<any[]>([]);
  const [productAdjustments, setProductAdjustments] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Fetch product-specific ledger/adjustments when detail tab changes
  useEffect(() => {
    if (!selectedInventory) return;
    
    if (detailTab === 'ledger' || detailTab === 'adjustments') {
      setLedgerLoading(true);
      fetch(`${API_BASE}/inventory/ledger?limit=100&productId=${selectedInventory.product.id}`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(envelope => {
          const data = envelope.data || [];
          setProductLedger(data);
          // Filter adjustments from ledger list or general list
          setProductAdjustments(data.filter((it: any) => it.transactionType === 'ADJUSTMENT'));
        })
        .catch(() => {})
        .finally(() => setLedgerLoading(false));
    }
  }, [selectedInventory, detailTab, API_BASE]);

  // Aggregate stats across all batches
  const metrics = React.useMemo(() => {
    let available = 0;
    let reserved = 0;
    let damaged = 0;
    let expired = 0;
    let lowStockCount = 0;
    let nearExpiryCount = 0;

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    // Summarize from inventories list
    inventories.forEach(inv => {
      available += inv.availableQty || 0;
      reserved += inv.reservedQty || 0;
      damaged += inv.damagedQty || 0;
      expired += inv.expiredQty || 0;
      if (inv.availableQty <= (inv.product?.minStockLevel || 0)) {
        lowStockCount++;
      }
    });

    // Count near expiry batches
    batches.forEach(b => {
      const exp = new Date(b.expiryDate);
      if (exp > now && exp <= ninetyDaysFromNow) {
        nearExpiryCount++;
      }
    });

    return {
      available,
      reserved,
      damaged,
      expired,
      lowStockCount,
      nearExpiryCount,
      totalBatches: batches.length
    };
  }, [inventories, batches]);

  // Filter Purchase History for a specific product
  const productPurchases = React.useMemo(() => {
    if (!selectedInventory) return [];
    const list: any[] = [];
    purchaseOrders.forEach(po => {
      if (po.items) {
        po.items.forEach((it: any) => {
          if (it.productId === selectedInventory.product.id) {
            list.push({
              poNumber: po.poNumber,
              supplierName: po.supplier?.name || 'Unknown',
              purchaseDate: po.purchaseDate || po.createdAt,
              batchNumber: it.batchNumber,
              expiryDate: it.expiryDate,
              purchasePrice: it.purchasePrice,
              quantity: it.quantity + (it.freeQuantity || 0),
              status: po.status
            });
          }
        });
      }
    });
    return list;
  }, [selectedInventory, purchaseOrders]);

  // Filter Sales History for a specific product
  const productSales = React.useMemo(() => {
    if (!selectedInventory) return [];
    const list: any[] = [];
    invoices.forEach(inv => {
      if (inv.billItems) {
        inv.billItems.forEach((it: any) => {
          if (it.batch?.productId === selectedInventory.product.id) {
            list.push({
              billNumber: inv.billNumber,
              customerMobile: inv.customer?.mobile || 'Walk-in',
              createdAt: inv.createdAt,
              batchNumber: it.batch?.batchNumber || 'N/A',
              sellingPrice: it.sellingPrice,
              quantity: it.quantity,
              totalAmount: it.totalAmount
            });
          }
        });
      }
    });
    return list;
  }, [selectedInventory, invoices]);

  // Main Columns
  const stockColumns: Column<any>[] = [
    {
      header: 'Medicine Name',
      accessor: (row) => (
        <div onClick={() => { setSelectedInventory(row); setDetailTab('summary'); }} className="cursor-pointer group">
          <span className="font-bold text-slate-100 block group-hover:text-teal-400 transition-colors">{row.product?.name || 'Unknown Product'}</span>
          {row.product?.genericName && <span className="text-[10px] text-slate-500 block">{row.product.genericName}</span>}
        </div>
      ),
      sortKey: 'product.name',
      exportValue: (row) => row.product?.name || ''
    },
    {
      header: 'Min Alert level',
      accessor: (row) => <span className="font-mono text-slate-400">{row.product?.minStockLevel || 0} units</span>,
      sortKey: 'product.minStockLevel',
      exportValue: (row) => row.product?.minStockLevel || '0'
    },
    {
      header: 'Available Stock',
      accessor: (row) => (
        <span className={`font-mono font-bold ${
          row.availableQty <= (row.product?.minStockLevel || 0) ? 'text-rose-400 font-extrabold' : 'text-slate-200'
        }`}>{row.availableQty} units</span>
      ),
      sortKey: 'availableQty',
      exportValue: (row) => row.availableQty
    },
    {
      header: 'Expired',
      accessor: (row) => <span className={`font-mono ${row.expiredQty > 0 ? 'text-rose-450 font-bold' : 'text-slate-500'}`}>{row.expiredQty} units</span>,
      sortKey: 'expiredQty',
      exportValue: (row) => row.expiredQty
    },
    {
      header: 'Damaged',
      accessor: (row) => <span className={`font-mono ${row.damagedQty > 0 ? 'text-rose-500' : 'text-slate-500'}`}>{row.damagedQty} units</span>,
      sortKey: 'damagedQty',
      exportValue: (row) => row.damagedQty
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button 
          onClick={() => { setSelectedInventory(row); setDetailTab('batches'); }} 
          variant="outline" 
          size="sm"
          className="py-1 px-2.5 text-[9px] hover:border-teal-500/40 hover:text-teal-400 cursor-pointer"
        >
          View Details
        </Button>
      ),
      exportValue: () => ''
    }
  ];

  const batchColumns: Column<any>[] = [
    {
      header: 'Medicine',
      accessor: (row) => <span className="font-bold text-slate-100">{row.product?.name || 'Unknown'}</span>,
      sortKey: 'product.name',
      exportValue: (row) => row.product?.name || ''
    },
    {
      header: 'Batch No.',
      accessor: (row) => <span className="font-mono font-bold text-teal-400">{row.batchNumber}</span>,
      sortKey: 'batchNumber',
      exportValue: (row) => row.batchNumber
    },
    {
      header: 'Expiry Date',
      accessor: (row) => {
        const isExpired = new Date(row.expiryDate) < new Date();
        return (
          <span className={`font-mono font-semibold ${isExpired ? 'text-rose-450 font-extrabold' : 'text-slate-350'}`}>
            {new Date(row.expiryDate).toLocaleDateString()} {isExpired ? '(EXPIRED)' : ''}
          </span>
        );
      },
      sortKey: 'expiryDate',
      exportValue: (row) => new Date(row.expiryDate).toLocaleDateString()
    },
    {
      header: 'Pricing',
      accessor: (row) => (
        <div className="font-mono text-[10px]">
          <div>MRP: ₹{row.mrp.toFixed(2)}</div>
          <div>Sell: ₹{row.sellingPrice.toFixed(2)}</div>
        </div>
      ),
      exportValue: (row) => `MRP: ₹${row.mrp} Sell: ₹${row.sellingPrice}`
    },
    {
      header: 'Available Stock',
      accessor: (row) => <span className="font-mono font-bold text-slate-200">{row.availableQty} units</span>,
      sortKey: 'availableQty',
      exportValue: (row) => row.availableQty
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <Button 
          onClick={() => handleOpenAdjustModal(row)} 
          variant="outline" 
          size="sm"
          className="py-1 px-2.5 text-[9px] hover:border-teal-500/40 hover:text-teal-400 cursor-pointer"
        >
          Adjust Stock
        </Button>
      ),
      exportValue: () => ''
    }
  ];

  const currentProductBatches = React.useMemo(() => {
    if (!selectedInventory) return [];
    return batches.filter(b => b.productId === selectedInventory.product.id);
  }, [selectedInventory, batches]);

  return (
    <div className="space-y-4 animate-fadeIn text-xs text-slate-400 font-sans relative">
      
      {/* Title / Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Inventory & Ledgers</h2>
          <p className="text-[11px] text-slate-500 font-medium">Verify stock aggregate quantities, adjust batches, and filter low inventory</p>
        </div>
        
        <div className="flex gap-1.5 bg-slate-900/40 p-1.5 border border-slate-850 rounded-xl font-bold">
          <button type="button" onClick={() => setInventorySubTab('stock')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${inventorySubTab === 'stock' ? 'bg-teal-500 text-slate-955' : 'text-slate-400 hover:text-slate-200'}`}>Current Stock</button>
          <button type="button" onClick={() => setInventorySubTab('batches')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${inventorySubTab === 'batches' ? 'bg-teal-500 text-slate-955' : 'text-slate-400 hover:text-slate-200'}`}>Batch Details</button>
        </div>
      </div>

      {/* METRICS HEADER BANNER CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Available Stock</span>
          <span className="text-lg font-bold font-mono text-slate-100 block leading-tight">{metrics.available} <span className="text-[10px] text-slate-500">U</span></span>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Reserved Stock</span>
          <span className="text-lg font-bold font-mono text-slate-250 block leading-tight">{metrics.reserved} <span className="text-[10px] text-slate-500">U</span></span>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Expired Batches</span>
          <span className={`text-lg font-bold font-mono block leading-tight ${metrics.expired > 0 ? 'text-rose-455' : 'text-slate-400'}`}>{metrics.expired} <span className="text-[10px] text-slate-500">U</span></span>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow">
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Damaged Qty</span>
          <span className={`text-lg font-bold font-mono block leading-tight ${metrics.damaged > 0 ? 'text-rose-400' : 'text-slate-400'}`}>{metrics.damaged} <span className="text-[10px] text-slate-500">U</span></span>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow flex items-center justify-between col-span-1">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Low Stock Alert</span>
            <span className={`text-lg font-bold font-mono block leading-tight ${metrics.lowStockCount > 0 ? 'text-rose-450' : 'text-slate-400'}`}>{metrics.lowStockCount} <span className="text-[10px] text-slate-500">Items</span></span>
          </div>
          {metrics.lowStockCount > 0 && <FiAlertCircle className="w-5 h-5 text-rose-450" />}
        </div>

        <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl shadow flex items-center justify-between col-span-1">
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-0.5">Soon Expiring</span>
            <span className={`text-lg font-bold font-mono block leading-tight ${metrics.nearExpiryCount > 0 ? 'text-rose-450' : 'text-slate-400'}`}>{metrics.nearExpiryCount} <span className="text-[10px] text-slate-500">Batches</span></span>
          </div>
          {metrics.nearExpiryCount > 0 && <FiAlertTriangle className="w-5 h-5 text-rose-450" />}
        </div>
      </div>

      {/* TABLE RENDERS */}
      {inventorySubTab === 'stock' && (
        <DataTable
          data={inventories}
          columns={stockColumns}
          emptyMessage="No stock aggregate inventory records found."
          tableName="inventory_stock"
        />
      )}

      {inventorySubTab === 'batches' && (
        <DataTable
          data={batches}
          columns={batchColumns}
          emptyMessage="No inventory batch details found."
          tableName="inventory_batches"
        />
      )}

      {/* ==================== INVENTORY DETAILS MODAL ==================== */}
      {selectedInventory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-xs text-slate-300">
            
            {/* Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-850 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">Inventory Details Console</span>
                <span className="text-sm font-bold text-white block">{selectedInventory.product?.name}</span>
                {selectedInventory.product?.genericName && <span className="text-[10px] text-slate-500">{selectedInventory.product.genericName}</span>}
              </div>
              <button 
                type="button"
                onClick={() => setSelectedInventory(null)} 
                className="text-slate-500 hover:text-slate-300 font-bold text-sm cursor-pointer"
              >
                Close (ESC)
              </button>
            </div>

            {/* Sub-tabs inside modal */}
            <div className="bg-slate-950/60 border-b border-slate-850 px-4 flex gap-1 font-bold text-[11px] overflow-x-auto">
              <button onClick={() => setDetailTab('summary')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'summary' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Stock Summary</button>
              <button onClick={() => setDetailTab('batches')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'batches' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Batches ({currentProductBatches.length})</button>
              <button onClick={() => setDetailTab('ledger')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'ledger' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Stock Ledger</button>
              <button onClick={() => setDetailTab('adjustments')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'adjustments' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Manual Adjustments</button>
              <button onClick={() => setDetailTab('purchases')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'purchases' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Purchase Orders</button>
              <button onClick={() => setDetailTab('sales')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'sales' ? 'border-teal-500 text-teal-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>Sales History</button>
            </div>

            {/* Modal Body Panels */}
            <div className="p-6 max-h-[380px] overflow-y-auto space-y-4">
              
              {/* Tab 1: Summary */}
              {detailTab === 'summary' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 leading-normal">
                    <div className="bg-slate-950 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">SKU / Code</span>
                      <span className="font-bold text-white font-mono text-[11px]">{selectedInventory.product?.sku || 'Unassigned'}</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Barcode</span>
                      <span className="font-bold text-white font-mono text-[11px]">{selectedInventory.product?.barcode || 'No Barcode'}</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Rack Location</span>
                      <span className="font-bold text-teal-400 text-[11px]">{selectedInventory.product?.rackLocation || 'Unallocated'}</span>
                    </div>
                    <div className="bg-slate-955 p-3 rounded-xl">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">Tax Tier</span>
                      <span className="font-bold text-white font-mono text-[11px]">{selectedInventory.product?.gstPercentage || 0}% GST</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Aggregate stocks */}
                    <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 space-y-2">
                      <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-850 pb-1.5 flex items-center gap-1.5"><FiLayers /> Quantity Cache Summary</h4>
                      <div className="grid grid-cols-2 gap-3 leading-normal font-semibold">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Available Units:</span>
                          <span className="font-mono text-xs text-slate-250 font-bold">{selectedInventory.availableQty} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Reserved Units:</span>
                          <span className="font-mono text-xs text-slate-350">{selectedInventory.reservedQty} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Expired Count:</span>
                          <span className="font-mono text-xs text-rose-455">{selectedInventory.expiredQty} units</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Damaged Count:</span>
                          <span className="font-mono text-xs text-rose-500">{selectedInventory.damagedQty} units</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Alert Badge card */}
                    <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-850 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-slate-200 uppercase text-[10px] tracking-wider border-b border-slate-850 pb-1.5 flex items-center gap-1.5"><FiAlertCircle /> Reorder Trigger Status</h4>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-slate-400 font-semibold">Alert Trigger level:</span>
                          <span className="font-bold text-white font-mono">{selectedInventory.product?.minStockLevel || 0} units</span>
                        </div>
                      </div>

                      <div className="mt-4">
                        {selectedInventory.availableQty <= (selectedInventory.product?.minStockLevel || 0) ? (
                          <div className="p-2.5 bg-rose-955/40 text-rose-450 border border-rose-900/35 rounded-lg font-bold flex items-center gap-2">
                            <FiAlertCircle /> LOW STOCK TRIGGER TRIGGERED
                          </div>
                        ) : (
                          <div className="p-2.5 bg-emerald-955/20 text-emerald-400 border border-emerald-900/30 rounded-lg font-bold flex items-center gap-2">
                            <FiInfo /> Stock levels healthy
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Batches */}
              {detailTab === 'batches' && (
                <div className="space-y-3">
                  {currentProductBatches.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No stock batches available for this medicine catalog ID.
                    </div>
                  ) : (
                    <table className="w-full text-left text-slate-350">
                      <thead className="bg-slate-950 text-[9px] text-slate-500 uppercase border-b border-slate-850 font-mono font-bold">
                        <tr>
                          <th className="py-2 px-3">Batch Number</th>
                          <th className="py-2 px-3">Expiry Date</th>
                          <th className="py-2 px-3 text-right">MRP (₹)</th>
                          <th className="py-2 px-3 text-right">Selling (₹)</th>
                          <th className="py-2 px-3 text-center">Available</th>
                          <th className="py-2 px-3 text-center">Damaged</th>
                          <th className="py-2 px-3 text-center"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40">
                        {currentProductBatches.map((b: any, idx: number) => {
                          const isExpired = new Date(b.expiryDate) < new Date();
                          return (
                            <tr key={idx} className="hover:bg-slate-850/10">
                              <td className="py-2 px-3 font-mono font-bold text-teal-400">{b.batchNumber}</td>
                              <td className={`py-2 px-3 font-mono ${isExpired ? 'text-rose-450 font-bold' : ''}`}>
                                {new Date(b.expiryDate).toLocaleDateString()} {isExpired ? '(EXPIRED)' : ''}
                              </td>
                              <td className="py-2 px-3 text-right font-mono">₹{b.mrp.toFixed(2)}</td>
                              <td className="py-2 px-3 text-right font-mono">₹{b.sellingPrice.toFixed(2)}</td>
                              <td className="py-2 px-3 text-center font-mono font-bold text-slate-200">{b.availableQty} units</td>
                              <td className="py-2 px-3 text-center font-mono">{b.damagedQty} units</td>
                              <td className="py-2 px-3 text-center">
                                <Button 
                                  onClick={() => handleOpenAdjustModal(b)} 
                                  variant="outline" 
                                  size="sm"
                                  className="py-0.5 px-2 text-[9px] cursor-pointer"
                                >
                                  Adjust
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 3: Ledger */}
              {detailTab === 'ledger' && (
                <div className="space-y-3">
                  {ledgerLoading ? (
                    <div className="text-center py-8 text-slate-500 font-bold">Querying system ledger ledger trail...</div>
                  ) : productLedger.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No stock movement audit records logged.
                    </div>
                  ) : (
                    <table className="w-full text-left text-slate-350">
                      <thead className="bg-slate-950 text-[9px] text-slate-500 uppercase border-b border-slate-850 font-mono font-bold">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Batch</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Delta</th>
                          <th className="py-2 px-3 text-right">Balance</th>
                          <th className="py-2 px-3">Reference No</th>
                          <th className="py-2 px-3">Remarks / Operator</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40 font-semibold text-[11px]">
                        {productLedger.map((lg: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-500">{new Date(lg.timestamp).toLocaleString()}</td>
                            <td className="py-2 px-3 font-mono text-teal-400">{lg.batch?.batchNumber || 'N/A'}</td>
                            <td className="py-2 px-3">
                              <Badge variant={
                                lg.transactionType === 'PURCHASE' || lg.transactionType === 'SALES_RETURN' ? 'success' :
                                lg.transactionType === 'SALES' || lg.transactionType === 'PURCHASE_RETURN' ? 'gray' : 'info'
                              }>
                                {lg.transactionType}
                              </Badge>
                            </td>
                            <td className={`py-2 px-3 text-right font-mono font-bold ${lg.quantity > 0 ? 'text-emerald-400' : 'text-rose-455'}`}>
                              {lg.quantity > 0 ? `+${lg.quantity}` : lg.quantity}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-200">{lg.balanceQty} units</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-450">{lg.referenceNumber}</td>
                            <td className="py-2 px-3 text-slate-400 leading-tight">
                              <div className="max-w-[200px] truncate">{lg.remarks}</div>
                              <span className="text-[9px] text-slate-550 block font-bold">By: {lg.createdBy || 'SYSTEM'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 4: Manual Adjustments */}
              {detailTab === 'adjustments' && (
                <div className="space-y-3">
                  {ledgerLoading ? (
                    <div className="text-center py-8 text-slate-500 font-bold">Querying stock adjustments logs...</div>
                  ) : productAdjustments.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No manual adjustments logs found for this medicine item.
                    </div>
                  ) : (
                    <table className="w-full text-left text-slate-350">
                      <thead className="bg-slate-950 text-[9px] text-slate-500 uppercase border-b border-slate-850 font-mono font-bold">
                        <tr>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3">Batch No</th>
                          <th className="py-2 px-3">Type</th>
                          <th className="py-2 px-3 text-right">Delta</th>
                          <th className="py-2 px-3">Reference No</th>
                          <th className="py-2 px-3">Reason / Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40 text-[11px] font-semibold">
                        {productAdjustments.map((adj: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="py-2 px-3 font-mono text-slate-550 text-[10px]">{new Date(adj.timestamp).toLocaleString()}</td>
                            <td className="py-2 px-3 font-mono text-teal-400">{adj.batch?.batchNumber}</td>
                            <td className="py-2 px-3 text-slate-200">
                              {adj.quantity > 0 ? (
                                <span className="text-emerald-400 flex items-center gap-1"><FiTrendingUp /> INCREASE</span>
                              ) : (
                                <span className="text-rose-455 flex items-center gap-1"><FiTrendingDown /> DECREASE</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">{adj.quantity} units</td>
                            <td className="py-2 px-3 font-mono text-[10px] text-slate-450">{adj.referenceNumber}</td>
                            <td className="py-2 px-3 leading-normal">
                              <span className="font-bold text-slate-300 block">{adj.remarks || 'Adjustment audit count'}</span>
                              <span className="text-[9px] text-slate-500 font-bold block">Operator: {adj.createdBy}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 5: Purchase History */}
              {detailTab === 'purchases' && (
                <div className="space-y-3">
                  {productPurchases.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No supplier purchases found for this medicine item.
                    </div>
                  ) : (
                    <table className="w-full text-left text-slate-350">
                      <thead className="bg-slate-950 text-[9px] text-slate-500 uppercase border-b border-slate-850 font-mono font-bold">
                        <tr>
                          <th className="py-2 px-3">PO Code</th>
                          <th className="py-2 px-3">Supplier Name</th>
                          <th className="py-2 px-3">Received Date</th>
                          <th className="py-2 px-3">Batch Number</th>
                          <th className="py-2 px-3 text-right">Cost (₹)</th>
                          <th className="py-2 px-3 text-center">Received Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40 text-[11px] font-semibold">
                        {productPurchases.map((pc: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="py-2 px-3 font-mono text-teal-400 font-bold">{pc.poNumber}</td>
                            <td className="py-2 px-3 text-slate-200">{pc.supplierName}</td>
                            <td className="py-2 px-3 font-mono text-slate-500">{new Date(pc.purchaseDate).toLocaleDateString()}</td>
                            <td className="py-2 px-3 font-mono">{pc.batchNumber}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{pc.purchasePrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-200">{pc.quantity} units</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Tab 6: Sales History */}
              {detailTab === 'sales' && (
                <div className="space-y-3">
                  {productSales.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
                      No patient sales checkouts found for this medicine item.
                    </div>
                  ) : (
                    <table className="w-full text-left text-slate-350">
                      <thead className="bg-slate-950 text-[9px] text-slate-500 uppercase border-b border-slate-850 font-mono font-bold">
                        <tr>
                          <th className="py-2 px-3">Invoice Code</th>
                          <th className="py-2 px-3">Customer Mobile</th>
                          <th className="py-2 px-3">Checkout Date</th>
                          <th className="py-2 px-3">Batch Number</th>
                          <th className="py-2 px-3 text-right">Price (₹)</th>
                          <th className="py-2 px-3 text-center">Quantity</th>
                          <th className="py-2 px-3 text-right">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850/40 text-[11px] font-semibold">
                        {productSales.map((sl: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-850/10">
                            <td className="py-2 px-3 font-mono text-teal-400 font-bold">{sl.billNumber}</td>
                            <td className="py-2 px-3 text-slate-200">{sl.customerMobile}</td>
                            <td className="py-2 px-3 font-mono text-slate-550">{new Date(sl.createdAt).toLocaleString()}</td>
                            <td className="py-2 px-3 font-mono text-slate-350">{sl.batchNumber}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{sl.sellingPrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-mono text-slate-200">{sl.quantity} units</td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-100">₹{sl.totalAmount.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-850 flex justify-end">
              <Button onClick={() => setSelectedInventory(null)} variant="primary" className="px-5 cursor-pointer">
                Close details
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryTab;
