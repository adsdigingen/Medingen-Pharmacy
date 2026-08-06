import React, { useState, useEffect } from 'react';
import { DataTable, Column } from '../common/DataTable';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { FiTrendingUp, FiTrendingDown, FiAlertTriangle, FiClock, FiPlus } from 'react-icons/fi';
import { useToast } from '../common/ToastProvider';

interface CounterProductsTabProps {
  API_BASE: string;
  currentUser: any;
}

export const CounterProductsTab: React.FC<CounterProductsTabProps> = ({ API_BASE, currentUser }) => {
  const { showToast } = useToast();
  
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Modals state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    type: 'INCREASE' as 'INCREASE' | 'DECREASE',
    quantity: 1,
    reason: 'PHYSICAL_COUNT',
    remarks: '',
  });

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    transferStrips: 1,
    unitsPerStrip: 10,
    sellingPrice: '' as string | number,
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const q = `page=${page}&limit=10&search=${search}&lowStock=${lowStockFilter}`;
      const res = await fetch(`${API_BASE}/counter/products?${q}`);
      if (res.ok) {
        const envelope = await res.json();
        setItems(envelope.data || []);
        setTotal(envelope.meta?.total || 0);
      }
    } catch (e) {
      showToast('Failed to load counter stock', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [page, search, lowStockFilter]);

  const handleOpenAdjust = (item: any) => {
    setSelectedItem(item);
    setAdjustForm({
      type: 'INCREASE',
      quantity: 1,
      reason: 'PHYSICAL_COUNT',
      remarks: '',
    });
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adjustForm.quantity <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/counter/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          batchId: selectedItem.batchId,
          type: adjustForm.type,
          quantity: adjustForm.quantity,
          reason: adjustForm.reason,
          remarks: adjustForm.remarks,
        }),
      });

      if (res.ok) {
        showToast('Counter stock adjusted successfully', 'success');
        setIsAdjustModalOpen(false);
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.message || 'Adjustment failed');
      }
    } catch (e) {
      alert('Error saving adjustment');
    }
  };

  const handleOpenHistory = async (item: any) => {
    setSelectedItem(item);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/counter/history/${item.productId}/${item.batchId}`);
      if (res.ok) {
        const envelope = await res.json();
        setHistoryItems(envelope.data || []);
      }
    } catch (e) {
      showToast('Failed to load ledger history', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOpenTransferMore = (item: any) => {
    setSelectedItem(item);
    setTransferForm({
      transferStrips: 1,
      unitsPerStrip: item.unitsPerStrip || 10,
      sellingPrice: item.sellingPrice || '',
    });
    setIsTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.transferStrips <= 0) {
      alert('Strips quantity must be greater than zero.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/counter/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId,
          batchId: selectedItem.batchId,
          transferStrips: transferForm.transferStrips,
          unitsPerStrip: transferForm.unitsPerStrip,
          sellingPrice: parseFloat(transferForm.sellingPrice as string) || undefined,
        }),
      });

      if (res.ok) {
        showToast('Stock transferred to counter successfully', 'success');
        setIsTransferModalOpen(false);
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.message || 'Transfer failed');
      }
    } catch (e) {
      alert('Error transferring stock');
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'Medicine Name',
      accessor: (row) => (
        <div>
          <span className="font-bold text-gray-800 block">{row.product?.name}</span>
          {row.product?.genericName && <span className="text-[10px] text-gray-500 block">{row.product.genericName}</span>}
        </div>
      ),
      sortKey: 'product.name',
    },
    {
      header: 'Batch',
      accessor: (row) => (
        <div>
          <span className="font-mono font-bold text-gray-700 block">{row.batch?.batchNumber}</span>
          <span className="text-[10px] text-gray-400 block">Exp: {new Date(row.batch?.expiryDate).toLocaleDateString()}</span>
        </div>
      ),
      sortKey: 'batch.batchNumber',
    },
    {
      header: 'Counter Units Available',
      accessor: (row) => (
        <span className={`font-mono font-bold ${row.availableUnits <= row.minimumUnits ? 'text-rose-500' : 'text-gray-700'}`}>
          {row.availableUnits} units
        </span>
      ),
      sortKey: 'availableUnits',
    },
    {
      header: 'Units Per Strip',
      accessor: (row) => <span className="font-mono">{row.unitsPerStrip} tabs/caps</span>,
    },
    {
      header: 'Transferred Date',
      accessor: (row) => <span className="text-gray-500">{new Date(row.createdAt).toLocaleDateString()}</span>,
    },
    {
      header: 'Status',
      accessor: (row) => {
        const isLow = row.availableUnits <= row.minimumUnits;
        return (
          <Badge variant={isLow ? 'danger' : 'success'}>
            {isLow ? 'LOW STOCK' : 'ACTIVE'}
          </Badge>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-1.5">
          <Button onClick={() => handleOpenTransferMore(row)} variant="outline" size="sm" className="py-1 px-2 text-[10px]" title="Transfer More strips">
            <FiPlus className="inline mr-1" /> Transfer More
          </Button>
          <Button onClick={() => handleOpenAdjust(row)} variant="outline" size="sm" className="py-1 px-2 text-[10px]" title="Adjust Counter Units">
            Adjust Stock
          </Button>
          <Button onClick={() => handleOpenHistory(row)} variant="outline" size="sm" className="py-1 px-2 text-[10px]" title="View History Log">
            <FiClock />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-xs text-muted font-sans relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            Counter Products Directory
            <Badge variant="info" className="font-mono text-[10px] font-bold px-2 py-0.5 select-none">
              {total} Batches
            </Badge>
          </h2>
          <p className="text-[11px] text-gray-500 font-medium">Manage loose units, adjust stock levels, and audit counter inventory ledgers</p>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => { setLowStockFilter(e.target.checked); setPage(1); }}
              className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
            />
            Show Low Stock Alerts
          </label>
        </div>
      </div>

      <DataTable
        data={items}
        columns={columns}
        loading={loading}
        serverSide
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        onSearchChange={(t) => { setSearch(t); setPage(1); }}
        searchTerm={search}
        emptyMessage="No counter products found."
      />

      {/* Adjust Stock Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Adjust Counter Stock">
        {selectedItem && (
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-800 block text-sm">{selectedItem.product?.name}</span>
              <span className="text-[11px] text-gray-500 font-mono block">Batch: {selectedItem.batch?.batchNumber}</span>
              <span className="text-[11px] text-gray-500 font-semibold block">Current Counter Units Available: <span className="font-mono text-primary font-bold">{selectedItem.availableUnits} units</span></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Adjustment Type</label>
                <select
                  value={adjustForm.type}
                  onChange={(e) => setAdjustForm({ ...adjustForm, type: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                >
                  <option value="INCREASE">Increase Stock (+)</option>
                  <option value="DECREASE">Decrease Stock (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Quantity (Units)</label>
                <input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: Math.max(1, parseInt(e.target.value, 10)) })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Reason</label>
              <select
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
              >
                <option value="PHYSICAL_COUNT">Physical Count Correction</option>
                <option value="DAMAGED">Damaged / Spilled</option>
                <option value="LOST">Lost / Misplaced</option>
                <option value="EXPIRED">Expired</option>
                <option value="CORRECTION">General Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Remarks</label>
              <textarea
                value={adjustForm.remarks}
                onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                placeholder="Enter audit remarks..."
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary h-16 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setIsAdjustModalOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Save Adjustment
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Transfer More Modal */}
      <Modal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} title="Transfer More to Counter">
        {selectedItem && (
          <form onSubmit={handleSaveTransfer} className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
              <span className="font-bold text-gray-800 block text-sm">{selectedItem.product?.name}</span>
              <span className="text-[11px] text-gray-500 font-mono block">Batch: {selectedItem.batch?.batchNumber}</span>
              <span className="text-[11px] text-amber-600 font-bold block">Strips available in Warehouse: <span className="font-mono font-extrabold">{selectedItem.batch?.availableQty} strips</span></span>
              <span className="text-[11px] text-gray-500 font-semibold block">Counter stock currently: <span className="font-mono text-primary font-bold">{selectedItem.availableUnits} units</span></span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Units Per Strip</label>
                <input
                  type="number"
                  min="1"
                  value={transferForm.unitsPerStrip}
                  onChange={(e) => setTransferForm({ ...transferForm, unitsPerStrip: Math.max(1, parseInt(e.target.value, 10)) })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Strips to Transfer</label>
                <input
                  type="number"
                  min="1"
                  max={selectedItem.batch?.availableQty}
                  value={transferForm.transferStrips}
                  onChange={(e) => setTransferForm({ ...transferForm, transferStrips: Math.max(1, parseInt(e.target.value, 10)) })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Custom Selling Price (per Unit) (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={transferForm.sellingPrice}
                onChange={(e) => setTransferForm({ ...transferForm, sellingPrice: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:border-primary font-bold"
                placeholder="e.g. 5.00"
              />
            </div>

            <div className="p-3 bg-teal-50/50 rounded-xl border border-primary/20 text-center select-none animate-fadeIn">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">Calculated Counter Stock Increase</span>
              <span className="text-sm text-primary font-extrabold block mt-1">
                {transferForm.transferStrips} Strips &rarr; {transferForm.transferStrips * transferForm.unitsPerStrip} Counter Units
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setIsTransferModalOpen(false)} variant="outline">
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Confirm Transfer
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* History Ledger Modal */}
      <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title="Batch Counter Ledger History" maxWidth="max-w-2xl">
        {selectedItem && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <span className="font-bold text-gray-800 block text-sm">{selectedItem.product?.name}</span>
              <span className="text-[11px] text-gray-550 font-mono block">Batch: {selectedItem.batch?.batchNumber}</span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-xl max-h-96">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase font-bold border-b border-gray-200">
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Type</th>
                    <th className="px-4 py-2.5">Qty Change</th>
                    <th className="px-4 py-2.5">Balance</th>
                    <th className="px-4 py-2.5">Reference</th>
                    <th className="px-4 py-2.5">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-400">Loading ledger logs...</td>
                    </tr>
                  ) : historyItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-gray-400">No transaction logs recorded.</td>
                    </tr>
                  ) : (
                    historyItems.map((log) => {
                      const isPositive = log.quantity > 0;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`font-semibold text-[10px] py-0.5 px-2 rounded-full ${
                              log.transactionType === 'COUNTER_TRANSFER' ? 'bg-blue-50 text-blue-600' :
                              log.transactionType === 'COUNTER_SALE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                            }`}>
                              {log.transactionType.replace('COUNTER_', '')}
                            </span>
                          </td>
                          <td className={`px-4 py-2 font-mono font-bold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {isPositive ? '+' : ''}{log.quantity}
                          </td>
                          <td className="px-4 py-2 font-mono font-semibold text-gray-700">{log.balanceQty}</td>
                          <td className="px-4 py-2 font-mono text-[10px] text-gray-500">{log.referenceNumber}</td>
                          <td className="px-4 py-2 text-gray-500 max-w-xs truncate" title={log.remarks}>{log.remarks}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="flex justify-end pt-2">
              <Button onClick={() => setIsHistoryModalOpen(false)} variant="outline">
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default CounterProductsTab;
