import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '../common/DataTable';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { FiPlus, FiTrash2, FiEye, FiCheckSquare, FiRotateCcw, FiFileText, FiSearch, FiEdit } from 'react-icons/fi';

interface PurchasesTabProps {
  purchaseOrders: any[];
  allSuppliers: any[];
  allProducts: any[];
  fetchPurchaseOrders: () => Promise<void>;
  API_BASE: string;
}

export const PurchasesTab: React.FC<PurchasesTabProps> = ({
  purchaseOrders,
  allSuppliers,
  allProducts,
  fetchPurchaseOrders,
  API_BASE,
}) => {
  const [subTab, setSubTab] = useState<'list' | 'create' | 'returns'>('list');

  // Creation State
  const [supplierId, setSupplierId] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('PENDING');
  const [paymentMethod, setPaymentMethod] = useState('CREDIT');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [poStatus, setPoStatus] = useState<'DRAFT' | 'FULLY_RECEIVED'>('DRAFT');
  
  // Selected items for creation
  const [items, setItems] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Edit / Add Configuration Modal States
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Modal / Detail States
  const [activePO, setActivePO] = useState<any | null>(null);
  const [receivePO, setReceivePO] = useState<any | null>(null);
  const [receiveForm, setReceiveForm] = useState({ invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10) });
  
  // Return States
  const [returnPOId, setReturnPOId] = useState('');
  const [returnItems, setReturnItems] = useState<any[]>([]);
  const [creditNoteNumber, setCreditNoteNumber] = useState('');
  const [returnRemarks, setReturnRemarks] = useState('');

  // Auto-complete filters (Search by name, generic name, barcode or SKU)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const query = productSearch.toLowerCase();
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(query) ||
      (p.genericName && p.genericName.toLowerCase().includes(query)) ||
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    ).slice(0, 10);
  }, [productSearch, allProducts]);

  const selectedSupplier = useMemo(() => {
    return allSuppliers.find(s => s.id === supplierId);
  }, [supplierId, allSuppliers]);

  // Totals calculations
  const poTotals = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;
    items.forEach(it => {
      const lineSub = it.quantity * it.purchasePrice;
      const lineDisc = lineSub * (it.discountPercentage / 100);
      const lineTaxable = lineSub - lineDisc;
      const lineTax = lineTaxable * (it.gstPercentage / 100);
      subtotal += lineSub;
      discountTotal += lineDisc;
      taxTotal += lineTax;
    });
    return {
      subtotal,
      discount: discountTotal,
      tax: taxTotal,
      grandTotal: Math.round(subtotal - discountTotal + taxTotal),
    };
  }, [items]);

  // Product Selection Handlers (Opens Add Modal)
  const handleAddItem = (product: any) => {
    const exists = items.some(it => it.productId === product.id);
    if (exists) {
      alert("Product is already added in the item grid. Click Edit next to the item to adjust its quantities.");
      return;
    }
    const defaultBatch = `B-${new Date().getFullYear()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2);
    const defaultExpiry = nextYear.toISOString().slice(0, 10);

    const purchasePrice = product.purchasePrice || 0;
    const gstPercentage = product.gstPercentage || 12;
    const offlineMargin = 50;
    const onlineMargin = 85;
    const tax = purchasePrice * (gstPercentage / 100);
    
    // Calculate selling price and MRP directly using default margins (overriding old catalog default to enforce 50%/85% margins)
    const sellingPrice = purchasePrice + tax + purchasePrice * (offlineMargin / 100);
    const mrp = purchasePrice + tax + purchasePrice * (onlineMargin / 100);

    const actualOfflineMargin = offlineMargin;
    const actualOnlineMargin = onlineMargin;

    setEditItem({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      batchNumber: defaultBatch,
      expiryDate: defaultExpiry,
      purchasePrice,
      sellingPrice: parseFloat(sellingPrice.toFixed(2)),
      mrp: parseFloat(mrp.toFixed(2)),
      gstPercentage,
      discountPercentage: 0,
      quantity: 1,
      freeQuantity: 0,
      totalAmount: purchasePrice || 0,
      offlineMargin: actualOfflineMargin,
      onlineMargin: actualOnlineMargin,
      drugSchedule: product.drugSchedule || 'OTC',
    });
    setEditIndex(null);
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleOpenEditModal = (idx: number) => {
    const item = items[idx];
    const purchasePrice = parseFloat(item.purchasePrice) || 0;
    const gstPercentage = parseFloat(item.gstPercentage) || 0;
    const tax = purchasePrice * (gstPercentage / 100);
    
    const offlineMargin = item.offlineMargin !== undefined 
      ? item.offlineMargin 
      : parseFloat((((parseFloat(item.sellingPrice) - purchasePrice - tax) / (purchasePrice || 1)) * 100).toFixed(2));
    const onlineMargin = item.onlineMargin !== undefined 
      ? item.onlineMargin 
      : parseFloat((((parseFloat(item.mrp) - purchasePrice - tax) / (purchasePrice || 1)) * 100).toFixed(2));

    setEditItem({ 
      ...item,
      offlineMargin,
      onlineMargin,
      drugSchedule: item.drugSchedule || 'OTC'
    });
    setEditIndex(idx);
  };

  const handleSaveModalItem = () => {
    if (!editItem.batchNumber.trim()) {
      alert("Batch Number is required.");
      return;
    }
    if (!editItem.expiryDate) {
      alert("Expiry Date is required.");
      return;
    }
    if (parseFloat(editItem.sellingPrice) > parseFloat(editItem.mrp)) {
      alert("Selling Price cannot exceed MRP.");
      return;
    }

    // Calculate line total amount
    const qty = parseFloat(editItem.quantity) || 0;
    const price = parseFloat(editItem.purchasePrice) || 0;
    const discPercent = parseFloat(editItem.discountPercentage) || 0;
    const gstPercent = parseFloat(editItem.gstPercentage) || 0;

    const lineSub = qty * price;
    const lineDisc = lineSub * (discPercent / 100);
    const taxable = lineSub - lineDisc;
    const tax = taxable * (gstPercent / 105); // Let's use clean matching formula
    const taxValue = taxable * (gstPercent / 100);
    const totalAmount = parseFloat((taxable + taxValue).toFixed(2));

    const finalItem = {
      ...editItem,
      totalAmount
    };

    if (editIndex === null) {
      setItems([...items, finalItem]);
    } else {
      const updated = [...items];
      updated[editIndex] = finalItem;
      setItems(updated);
    }
    setEditItem(null);
    setEditIndex(null);
  };

  const handleUpdateItem = (index: number, key: string, value: any) => {
    const updated = [...items];
    const item = { ...updated[index] };
    item[key] = value;

    // Recalculate selling price and mrp from margins if purchasePrice or gstPercentage changes
    if (key === 'purchasePrice' || key === 'gstPercentage') {
      const price = parseFloat(item.purchasePrice) || 0;
      const gst = parseFloat(item.gstPercentage) || 0;
      const offMargin = item.offlineMargin !== undefined ? parseFloat(item.offlineMargin) : 50;
      const onMargin = item.onlineMargin !== undefined ? parseFloat(item.onlineMargin) : 85;
      const tax = price * (gst / 100);
      const offVal = price * (offMargin / 100);
      const onVal = price * (onMargin / 100);
      
      item.sellingPrice = parseFloat((price + tax + offVal).toFixed(2));
      item.mrp = parseFloat((price + tax + onVal).toFixed(2));
    }

    // Back-calculate offlineMargin if sellingPrice is updated directly
    if (key === 'sellingPrice') {
      const sell = parseFloat(item.sellingPrice) || 0;
      const price = parseFloat(item.purchasePrice) || 0;
      const gst = parseFloat(item.gstPercentage) || 0;
      const tax = price * (gst / 100);
      item.offlineMargin = price > 0 ? parseFloat((((sell - price - tax) / price) * 100).toFixed(2)) : 0;
    }

    // Back-calculate onlineMargin if mrp is updated directly
    if (key === 'mrp') {
      const m = parseFloat(item.mrp) || 0;
      const price = parseFloat(item.purchasePrice) || 0;
      const gst = parseFloat(item.gstPercentage) || 0;
      const tax = price * (gst / 100);
      item.onlineMargin = price > 0 ? parseFloat((((m - price - tax) / price) * 100).toFixed(2)) : 0;
    }

    // Recalculate line total amount
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.purchasePrice) || 0;
    const discPercent = parseFloat(item.discountPercentage) || 0;
    const gstPercent = parseFloat(item.gstPercentage) || 0;

    const lineSub = qty * price;
    const lineDisc = lineSub * (discPercent / 100);
    const taxable = lineSub - lineDisc;
    const tax = taxable * (gstPercent / 100);
    item.totalAmount = parseFloat((taxable + tax).toFixed(2));

    updated[index] = item;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert("Please select a Supplier");
      return;
    }
    if (items.length === 0) {
      alert("Please add at least one medicine item to ordering grid.");
      return;
    }

    if (poStatus === 'FULLY_RECEIVED' && !supplierInvoiceNumber.trim()) {
      alert("Please specify Supplier Invoice Number to receive stock immediately.");
      return;
    }
    if (poStatus === 'FULLY_RECEIVED' && !invoiceDate) {
      alert("Please specify Invoice Date to receive stock immediately.");
      return;
    }

    // Validate prices and dates
    for (const it of items) {
      if (!it.batchNumber.trim()) {
        alert(`Please specify Batch Number for item: ${it.name}`);
        return;
      }
      if (!it.expiryDate) {
        alert(`Please specify Expiry Date for item: ${it.name}`);
        return;
      }
      if (parseFloat(it.sellingPrice) > parseFloat(it.mrp)) {
        alert(`Selling Price cannot exceed MRP for: ${it.name}`);
        return;
      }
    }

    try {
      const payload = {
        supplierId,
        purchaseDate,
        supplierInvoiceNumber: supplierInvoiceNumber.trim() || undefined,
        invoiceDate: invoiceDate || undefined,
        paymentStatus,
        paymentMethod,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes.trim() || undefined,
        status: poStatus,
        items: items.map(it => ({
          productId: it.productId,
          batchNumber: it.batchNumber.trim().toUpperCase(),
          manufacturingDate: it.manufacturingDate || undefined,
          expiryDate: it.expiryDate,
          purchasePrice: parseFloat(it.purchasePrice) || 0,
          sellingPrice: parseFloat(it.sellingPrice) || 0,
          mrp: parseFloat(it.mrp) || 0,
          gstPercentage: parseFloat(it.gstPercentage) || 0,
          discountPercentage: parseFloat(it.discountPercentage) || 0,
          quantity: parseInt(it.quantity, 10) || 0,
          freeQuantity: parseInt(it.freeQuantity, 10) || 0,
          totalAmount: it.totalAmount,
          drugSchedule: it.drugSchedule || 'OTC',
        }))
      };

      const res = await fetch(`${API_BASE}/purchase-orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Purchase Order creation failed");
      
      alert(`Purchase Order logged successfully as ${poStatus}!`);
      // Reset Form
      setSupplierId('');
      setItems([]);
      setSupplierInvoiceNumber('');
      setInvoiceDate('');
      setNotes('');
      setSubTab('list');
      fetchPurchaseOrders();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleApproveReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivePO) return;
    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${receivePO.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'FULLY_RECEIVED',
          supplierInvoiceNumber: receiveForm.invoiceNumber.trim() || undefined,
          invoiceDate: receiveForm.invoiceDate || undefined,
        })
      });

      if (!res.ok) throw new Error("Approval failed");
      alert("PO Approved & Stocks fully received in inventory batches!");
      setReceivePO(null);
      fetchPurchaseOrders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeletePO = async (id: string) => {
    if (!confirm("Are you sure you want to delete this DRAFT Purchase Order?")) return;
    try {
      const res = await fetch(`${API_BASE}/purchase-orders/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Purchase Order removed.");
        fetchPurchaseOrders();
      } else {
        throw new Error("Unable to delete PO");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Return Processing
  const handleSelectReturnPO = async (poId: string) => {
    setReturnPOId(poId);
    if (!poId) {
      setReturnItems([]);
      return;
    }
    const order = purchaseOrders.find(p => p.id === poId);
    if (order && order.items) {
      setReturnItems(order.items.map((it: any) => ({
        productId: it.productId,
        productName: it.product?.name || 'Unknown Item',
        batchId: it.batchId,
        batchNumber: it.batchNumber,
        receivedQty: it.quantity + it.freeQuantity,
        quantity: 0,
        reason: 'DAMAGED'
      })));
    }
  };

  const handleReturnItemQty = (index: number, val: number) => {
    const updated = [...returnItems];
    const item = { ...updated[index] };
    item.quantity = Math.min(item.receivedQty, Math.max(0, val));
    updated[index] = item;
    setReturnItems(updated);
  };

  const handleSaveReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const active = returnItems.filter(it => it.quantity > 0);
    if (active.length === 0) {
      alert("Please input return quantity for at least one batch.");
      return;
    }
    const po = purchaseOrders.find(p => p.id === returnPOId);
    if (!po) return;

    try {
      const payload = {
        purchaseOrderId: returnPOId,
        supplierId: po.supplierId,
        creditNoteNumber: creditNoteNumber.trim() || undefined,
        returnDate: new Date().toISOString().slice(0, 10),
        remarks: returnRemarks.trim() || undefined,
        items: active.map(it => ({
          productId: it.productId,
          batchId: it.batchId,
          quantity: it.quantity,
          reason: it.reason
        }))
      };

      const res = await fetch(`${API_BASE}/purchase-orders/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Purchase Return transaction failed.");
      alert("Supplier return processed successfully. Stocks reduced.");
      setReturnPOId('');
      setReturnItems([]);
      setCreditNoteNumber('');
      setReturnRemarks('');
      setSubTab('list');
      fetchPurchaseOrders();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const columns: Column<any>[] = [
    {
      header: 'PO Number',
      accessor: (row) => <span className="font-mono font-bold text-primary">{row.poNumber}</span>,
      sortKey: 'poNumber',
      exportValue: (row) => row.poNumber
    },
    {
      header: 'Supplier Name',
      accessor: (row) => <span className="font-bold text-gray-700">{row.supplier?.name || 'Unknown Supplier'}</span>,
      sortKey: 'supplier.name',
      exportValue: (row) => row.supplier?.name || ''
    },
    {
      header: 'Invoice No / Date',
      accessor: (row) => (
        <div>
          <span className="text-gray-700 font-semibold block">{row.supplierInvoiceNumber || 'No Invoice'}</span>
          {row.invoiceDate && <span className="text-[10px] text-gray-500 block">{new Date(row.invoiceDate).toLocaleDateString()}</span>}
        </div>
      ),
      exportValue: (row) => row.supplierInvoiceNumber || ''
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status === 'FULLY_RECEIVED' ? 'success' : row.status === 'ORDERED' ? 'info' : 'warning'}>
          {row.status === 'FULLY_RECEIVED' ? 'RECEIVED' : row.status}
        </Badge>
      ),
      sortKey: 'status',
      exportValue: (row) => row.status
    },
    {
      header: 'Grand Total',
      accessor: (row) => {
        const net = row.items?.reduce((sum: number, it: any) => sum + it.totalAmount, 0) || 0;
        return <span className="font-bold font-mono text-gray-800">₹{net.toFixed(2)}</span>;
      },
      exportValue: (row) => row.items?.reduce((sum: number, it: any) => sum + it.totalAmount, 0) || 0
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-2">
          <Button onClick={() => setActivePO(row)} variant="outline" size="sm" className="p-1.5" title="View details">
            <FiEye className="w-3.5 h-3.5" />
          </Button>
          {(row.status === 'DRAFT' || row.status === 'ORDERED') && (
            <Button onClick={() => { setReceivePO(row); setReceiveForm({ invoiceNumber: '', invoiceDate: new Date().toISOString().slice(0, 10) }); }} variant="primary" size="sm" className="p-1.5" title="Mark as Received">
              <FiCheckSquare className="w-3.5 h-3.5 text-slate-950" />
            </Button>
          )}
          {row.status === 'DRAFT' && (
            <Button onClick={() => handleDeletePO(row.id)} variant="danger" size="sm" className="p-1.5" title="Delete PO">
              <FiTrash2 className="w-3.5 h-3.5 text-slate-955" />
            </Button>
          )}
        </div>
      ),
      exportValue: () => ''
    }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-xs text-muted font-sans relative">
      
      {/* Tab bar header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider">Purchase Orders Registry</h2>
          <p className="text-[11px] text-gray-500 font-medium">Verify pending stock shipments, supplier credits, and PO logs</p>
        </div>
        
        <div className="flex gap-1.5 bg-white/40 p-1.5 border border-gray-200 rounded-xl font-bold">
          <button type="button" onClick={() => setSubTab('list')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${subTab === 'list' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'}`}>Registry Log</button>
          <button type="button" onClick={() => setSubTab('create')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${subTab === 'create' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'} flex items-center gap-1`}><FiPlus /> New Order</button>
          <button type="button" onClick={() => setSubTab('returns')} className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${subTab === 'returns' ? 'bg-primary text-slate-955' : 'text-muted hover:text-gray-700'} flex items-center gap-1`}><FiRotateCcw /> Log Return</button>
        </div>
      </div>

      {/* REGISTRY LOG LIST */}
      {subTab === 'list' && (
        <DataTable
          data={purchaseOrders}
          columns={columns}
          emptyMessage="No purchase orders logged in system database."
          tableName="purchase_orders"
        />
      )}

      {/* NEW ORDER CREATOR FORM */}
      {subTab === 'create' && (
        <form onSubmit={handleSavePurchaseOrder} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Supplier Selector */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Supplier *</label>
              <select 
                value={supplierId} 
                onChange={(e) => setSupplierId(e.target.value)} 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold"
                required
              >
                <option value="">-- Choose Supplier --</option>
                {allSuppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.gstin ? `(${s.gstin})` : ''}</option>
                ))}
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">PO Order Date</label>
              <input 
                type="date" 
                value={purchaseDate} 
                onChange={(e) => setPurchaseDate(e.target.value)} 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-mono"
              />
            </div>

            {/* Delivery Date */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Expected Delivery Date</label>
              <input 
                type="date" 
                value={expectedDeliveryDate} 
                onChange={(e) => setExpectedDeliveryDate(e.target.value)} 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-mono"
              />
            </div>
            
            {/* Invoice fields (for instant fully received POs) */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                Supplier Invoice Number {poStatus === 'FULLY_RECEIVED' ? '*' : ''}
              </label>
              <input 
                type="text" 
                value={supplierInvoiceNumber} 
                onChange={(e) => setSupplierInvoiceNumber(e.target.value)} 
                placeholder="e.g. GST-1002"
                required={poStatus === 'FULLY_RECEIVED'}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                Invoice Date {poStatus === 'FULLY_RECEIVED' ? '*' : ''}
              </label>
              <input 
                type="date" 
                value={invoiceDate} 
                onChange={(e) => setInvoiceDate(e.target.value)} 
                required={poStatus === 'FULLY_RECEIVED'}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 font-mono"
              />
            </div>

            {/* Payment Term */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Payment Method</label>
              <select 
                value={paymentMethod} 
                onChange={(e) => { setPaymentMethod(e.target.value); setPaymentStatus(e.target.value === 'CREDIT' ? 'PENDING' : 'PAID'); }} 
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700"
              >
                <option value="CREDIT">Supplier Credit Account</option>
                <option value="CASH">Cash Desk Drawer</option>
                <option value="UPI">UPI Digital Payment</option>
                <option value="CARD">Bank POS Card</option>
              </select>
            </div>
          </div>

          {/* Supplier details card */}
          {selectedSupplier && (
            <div className="p-3 bg-gray-50/60 rounded-xl border border-gray-200 flex justify-between text-[11px] leading-relaxed">
              <div>
                <div className="font-bold text-gray-700">{selectedSupplier.name}</div>
                <div className="text-gray-500">Contact: {selectedSupplier.contactPerson || '-'} | Phone: {selectedSupplier.phone || '-'}</div>
              </div>
              <div className="text-right">
                <div className="text-gray-400 font-bold">Outstanding Balance</div>
                <div className="text-rose-400 font-bold font-mono">₹{selectedSupplier.outstandingBalance?.toFixed(2)}</div>
              </div>
            </div>
          )}

          {/* Dynamic Product Adding Grid */}
          <div className="space-y-3 relative">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
              <span className="text-[11px] font-bold text-primary uppercase tracking-wider">Purchase Items Grid</span>
              
              {/* Product search bar */}
              <div className="relative w-80">
                <span className="absolute left-2.5 top-2.5 text-gray-500">
                  <FiSearch className="w-3.5 h-3.5" />
                </span>
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                  onFocus={() => setShowProductDropdown(true)}
                  placeholder="Search product by name, generic, barcode, SKU..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-[11px] focus:outline-none focus:border-primary/50"
                />
                {showProductDropdown && filteredProducts.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProductDropdown(false)} />
                    <div className="absolute right-0 top-full mt-1.5 w-full bg-white border border-gray-200 rounded-lg shadow-2xl z-20 max-h-52 overflow-y-auto divide-y divide-slate-900">
                      {filteredProducts.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => handleAddItem(p)} 
                          className="p-2.5 hover:bg-white cursor-pointer flex justify-between items-center text-left"
                        >
                          <div>
                            <span className="font-bold text-gray-800 block">{p.name}</span>
                            <span className="text-[10px] text-gray-500 block font-semibold">{p.genericName || '-'}</span>
                            <span className="text-[9px] text-gray-500 font-mono">SKU: {p.sku || '-'} | Bar: {p.barcode || '-'}</span>
                          </div>
                          <span className="text-[10px] text-primary font-mono font-bold self-center">₹{p.purchasePrice}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Grid list */}
            {items.length === 0 ? (
              <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                No items added. Use the search bar on the right to add products to this purchase order.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-600 select-none">
                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Medicine</th>
                      <th className="py-2 px-3 w-24 font-semibold">Batch No *</th>
                      <th className="py-2 px-3 w-24 font-semibold">Expiry Date *</th>
                      <th className="py-2 px-3 w-20 font-semibold">Cost (₹)</th>
                      <th className="py-2 px-3 w-20 font-semibold">Offline Sell (₹)</th>
                      <th className="py-2 px-3 w-20 font-semibold">Online Sell (₹)</th>
                      <th className="py-2 px-3 w-16 font-semibold">GST (%)</th>
                      <th className="py-2 px-3 w-16 font-semibold">Qty</th>
                      <th className="py-2 px-3 w-16 font-semibold">Free</th>
                      <th className="py-2 px-3 w-16 font-semibold">Disc (%)</th>
                      <th className="py-2 px-3 w-24 text-right font-semibold">Total (₹)</th>
                      <th className="py-2 px-3 w-10 text-center font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {items.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-1 px-3">
                          <span className="font-bold text-gray-700 block">{it.name}</span>
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="text" 
                            value={it.batchNumber} 
                            onChange={(e) => handleUpdateItem(idx, 'batchNumber', e.target.value)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="date" 
                            value={it.expiryDate} 
                            onChange={(e) => handleUpdateItem(idx, 'expiryDate', e.target.value)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={it.purchasePrice} 
                            onChange={(e) => handleUpdateItem(idx, 'purchasePrice', parseFloat(e.target.value) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={it.sellingPrice} 
                            onChange={(e) => handleUpdateItem(idx, 'sellingPrice', parseFloat(e.target.value) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            step="0.01"
                            value={it.mrp} 
                            onChange={(e) => handleUpdateItem(idx, 'mrp', parseFloat(e.target.value) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            value={it.gstPercentage} 
                            onChange={(e) => handleUpdateItem(idx, 'gstPercentage', parseInt(e.target.value, 10) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            value={it.quantity} 
                            onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value, 10) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono font-bold"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            value={it.freeQuantity} 
                            onChange={(e) => handleUpdateItem(idx, 'freeQuantity', parseInt(e.target.value, 10) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3">
                          <input 
                            type="number" 
                            value={it.discountPercentage} 
                            onChange={(e) => handleUpdateItem(idx, 'discountPercentage', parseFloat(e.target.value) || 0)} 
                            className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-mono"
                          />
                        </td>
                        <td className="py-1 px-3 text-right font-mono font-bold text-gray-800">
                          ₹{it.totalAmount.toFixed(2)}
                        </td>
                        <td className="py-1 px-3 text-center flex items-center justify-center gap-2">
                          <button type="button" onClick={() => handleOpenEditModal(idx)} className="text-primary hover:text-teal-300 cursor-pointer" title="Configure details">
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:text-rose-600 cursor-pointer" title="Remove line">
                            <FiTrash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PO Summary / Submit buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-gray-200 pt-4 text-[11px]">
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm font-semibold">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Purchase Notes & Memo</label>
              <textarea 
                rows={3} 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                placeholder="Log payment split details, supplier terms or rack allocation..."
                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-slate-250 font-medium"
              />
            </div>
            
            <div className="w-full max-w-xs space-y-3">
              <div className="space-y-1.5 font-semibold text-muted">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono text-gray-700">₹{poTotals.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Line Discounts:</span>
                  <span className="font-mono text-rose-450">-₹{poTotals.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Taxes value:</span>
                  <span className="font-mono text-gray-700">₹{poTotals.tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-xs">
                  <span className="text-white">Net Grand Total:</span>
                  <span className="font-mono text-primary text-sm">₹{poTotals.grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <select 
                  value={poStatus} 
                  onChange={(e) => setPoStatus(e.target.value as any)} 
                  className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 text-[11px] font-bold cursor-pointer"
                >
                  <option value="DRAFT">Draft PO</option>
                  <option value="FULLY_RECEIVED">Receive Stock Immediately</option>
                </select>
                
                <Button type="submit" variant="primary" className="flex-1 py-2 font-bold cursor-pointer">
                  Save Purchase
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* LOG SUPPLIER RETURNS SUB-TAB */}
      {subTab === 'returns' && (
        <form onSubmit={handleSaveReturnSubmit} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Select fully received PO */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Select Received Invoice *</label>
              <select 
                value={returnPOId} 
                onChange={(e) => handleSelectReturnPO(e.target.value)} 
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-bold"
                required
              >
                <option value="">-- Choose Received PO Invoice --</option>
                {purchaseOrders.filter(po => po.status === 'FULLY_RECEIVED').map(po => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} {po.supplierInvoiceNumber ? `(Inv: ${po.supplierInvoiceNumber})` : ''} - {po.supplier?.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Credit note info */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Credit Note Reference Number</label>
              <input 
                type="text" 
                value={creditNoteNumber} 
                onChange={(e) => setCreditNoteNumber(e.target.value)} 
                placeholder="e.g. CR-NOTE-201"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-bold"
              />
            </div>
          </div>

          {/* Selected Return PO Items Grid */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block border-b border-gray-200 pb-2">Select batches to return</span>
            
            {returnItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                Please select a received PO invoice from the dropdown above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-gray-600 select-none">
                  <thead className="bg-gray-50 text-[10px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                    <tr>
                      <th className="py-2 px-3 font-semibold">Medicine</th>
                      <th className="py-2 px-3 w-32 font-semibold">Batch No</th>
                      <th className="py-2 px-3 w-32 text-center font-semibold">Received Qty</th>
                      <th className="py-2 px-3 w-32 font-semibold">Return Qty *</th>
                      <th className="py-2 px-3 font-semibold">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {returnItems.map((it, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 font-bold text-slate-250">{it.productName}</td>
                        <td className="py-2 px-3 font-mono font-bold text-primary">{it.batchNumber}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.receivedQty} units</td>
                        <td className="py-2 px-3">
                          <input 
                            type="number" 
                            value={it.quantity} 
                            onChange={(e) => handleReturnItemQty(idx, parseInt(e.target.value, 10) || 0)} 
                            className="w-24 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-700 font-bold font-mono"
                          />
                        </td>
                        <td className="py-2 px-3">
                          <select 
                            value={it.reason} 
                            onChange={(e) => {
                              const updated = [...returnItems];
                              updated[idx].reason = e.target.value;
                              setReturnItems(updated);
                            }}
                            className="px-2 py-1 bg-gray-50 border border-gray-200 rounded text-gray-600 cursor-pointer"
                          >
                            <option value="DAMAGED">Damaged / Spoiled Items</option>
                            <option value="EXPIRED">Expired stock return</option>
                            <option value="EXCESS_STOCK">Excessive stock correction</option>
                            <option value="INCORRECT_ORDER">Incorrect catalog items shipped</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Submit Return */}
          {returnItems.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-t border-gray-200 pt-4">
              <div className="w-full max-w-md">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Return Remarks / Notes</label>
                <input 
                  type="text" 
                  value={returnRemarks} 
                  onChange={(e) => setReturnRemarks(e.target.value)} 
                  placeholder="Specify return credits, courier reference or supplier notes..."
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700"
                />
              </div>
              
              <Button type="submit" variant="danger" className="w-full sm:w-52 py-2.5 font-bold mt-4 cursor-pointer text-slate-950">
                Log Return Shipment
              </Button>
            </div>
          )}
        </form>
      )}

      {/* ==================== DIALOGS & OVERLAYS ==================== */}

      {/* 1. VIEW PO MODAL / DETAIL DRAWER */}
      {activePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-3xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden font-sans text-xs text-gray-600">
            
            {/* Header info */}
            <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-widest block">Purchase Order Invoice</span>
                <span className="text-sm font-bold text-gray-800 font-mono leading-none">{activePO.poNumber}</span>
              </div>
              <Badge variant={activePO.status === 'FULLY_RECEIVED' ? 'success' : activePO.status === 'ORDERED' ? 'info' : 'warning'}>
                {activePO.status === 'FULLY_RECEIVED' ? 'RECEIVED' : activePO.status}
              </Badge>
            </div>

            <div className="p-6 space-y-6 max-h-[450px] overflow-y-auto">
              
              {/* Grid block for info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 leading-relaxed border-b border-border pb-4">
                <div>
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Supplier</span>
                  <span className="font-bold text-gray-800 block">{activePO.supplier?.name}</span>
                  {activePO.supplier?.gstin && <span className="text-gray-500 block font-mono text-[10px]">GSTIN: {activePO.supplier?.gstin}</span>}
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Purchase Date</span>
                  <span className="font-bold text-gray-700 block font-mono">{new Date(activePO.purchaseDate).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Invoice Number</span>
                  <span className="font-bold text-gray-700 block font-mono">{activePO.supplierInvoiceNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] font-bold uppercase">Payment Terms</span>
                  <span className="font-bold text-gray-700 block">{activePO.paymentMethod} ({activePO.paymentStatus})</span>
                </div>
              </div>

              {/* Items Grid */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block pl-1">PO Medicine Items</span>
                <table className="w-full text-left text-gray-600">
                  <thead className="bg-white text-[9px] text-gray-500 uppercase border-b border-gray-200 font-mono font-bold">
                    <tr>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-3 w-28">Batch No</th>
                      <th className="py-2 px-3 w-24">Expiry Date</th>
                      <th className="py-2 px-3 w-16 text-right">Cost (₹)</th>
                      <th className="py-2 px-3 w-16 text-right">MRP (₹)</th>
                      <th className="py-2 px-3 w-12 text-center">GST</th>
                      <th className="py-2 px-3 w-12 text-center">Qty</th>
                      <th className="py-2 px-3 w-20 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/40">
                    {activePO.items?.map((it: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50/10">
                        <td className="py-2 px-3 font-bold text-gray-700">{it.product?.name || 'Unknown Item'}</td>
                        <td className="py-2 px-3 font-mono text-primary font-bold">{it.batchNumber}</td>
                        <td className="py-2 px-3 font-mono">{new Date(it.expiryDate).toLocaleDateString()}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{it.purchasePrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-mono">₹{it.mrp.toFixed(2)}</td>
                        <td className="py-2 px-3 text-center font-mono">{it.gstPercentage}%</td>
                        <td className="py-2 px-3 text-center font-mono">{it.quantity} {it.freeQuantity > 0 ? `(+${it.freeQuantity}F)` : ''}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-gray-700">₹{it.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              {activePO.notes && (
                <div className="p-3 bg-white rounded-xl text-[11px] leading-normal">
                  <span className="font-bold text-gray-400 uppercase text-[9px] block mb-1">Notes / Instructions</span>
                  <p className="text-muted font-medium">{activePO.notes}</p>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-white border-t border-gray-200 flex justify-between">
              <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
                <FiFileText /> Print Invoice
              </Button>
              <Button onClick={() => setActivePO(null)} variant="primary" className="px-5 cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. RECEIVE INVOICE DIALOG */}
      {receivePO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <form onSubmit={handleApproveReceiveSubmit} className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-slate-355">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <FiCheckSquare className="text-primary" /> Confirm Stock Shipment Receipt
            </h3>
            <p className="text-muted leading-relaxed text-[11px] font-medium">
              Confirming receipt of **{receivePO.poNumber}** from **{receivePO.supplier?.name}** will immediately instantiate new batch numbers and load stocks to the live aggregate database.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Invoice Number / Bill ID *</label>
                <input 
                  type="text"
                  required
                  value={receiveForm.invoiceNumber}
                  onChange={(e) => setReceiveForm({ ...receiveForm, invoiceNumber: e.target.value })}
                  placeholder="e.g. INV-1002"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Invoice Receipt Date</label>
                <input 
                  type="date"
                  value={receiveForm.invoiceDate}
                  onChange={(e) => setReceiveForm({ ...receiveForm, invoiceDate: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setReceivePO(null)} variant="outline" className="px-4 text-gray-600 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" variant="primary" className="px-5 font-bold cursor-pointer text-slate-950">
                Confirm & Receive Stock
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. CONFIGURE ITEM DETAILS POPUP MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-gray-600 text-left">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
              <FiEdit className="text-primary" /> Configure {editItem.name}
            </h3>
            
            <div className="grid grid-cols-2 gap-3.5 text-muted">
              <div className="col-span-2 bg-white/40 p-2.5 rounded-xl border border-gray-200">
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-0.5">Medicine Catalog Item</label>
                <div className="font-bold text-gray-800 text-xs">{editItem.name}</div>
                {(editItem.sku || editItem.barcode) && (
                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">
                    {editItem.sku ? `SKU: ${editItem.sku}` : ''} {editItem.barcode ? `| Barcode: ${editItem.barcode}` : ''}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Batch Number *</label>
                <input 
                  type="text"
                  value={editItem.batchNumber}
                  onChange={(e) => setEditItem({ ...editItem, batchNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Expiry Date *</label>
                <input 
                  type="date"
                  value={editItem.expiryDate}
                  onChange={(e) => setEditItem({ ...editItem, expiryDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>


              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Quantity *</label>
                <input 
                  type="number"
                  value={editItem.quantity}
                  onChange={(e) => setEditItem({ ...editItem, quantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Free Quantity</label>
                <input 
                  type="number"
                  value={editItem.freeQuantity}
                  onChange={(e) => setEditItem({ ...editItem, freeQuantity: parseInt(e.target.value, 10) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Cost Price (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editItem.purchasePrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    const gst = parseFloat(editItem.gstPercentage) || 0;
                    const offMargin = editItem.offlineMargin !== undefined ? parseFloat(editItem.offlineMargin) : 50;
                    const onMargin = editItem.onlineMargin !== undefined ? parseFloat(editItem.onlineMargin) : 85;
                    const tax = val * (gst / 100);
                    const offVal = val * (offMargin / 100);
                    const onVal = val * (onMargin / 100);
                    setEditItem({
                      ...editItem,
                      purchasePrice: val,
                      sellingPrice: parseFloat((val + tax + offVal).toFixed(2)),
                      mrp: parseFloat((val + tax + onVal).toFixed(2))
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">GST Tax (%)</label>
                <input 
                  type="number"
                  value={editItem.gstPercentage}
                  onChange={(e) => {
                    const gst = parseFloat(e.target.value) || 0;
                    const val = parseFloat(editItem.purchasePrice) || 0;
                    const offMargin = editItem.offlineMargin !== undefined ? parseFloat(editItem.offlineMargin) : 50;
                    const onMargin = editItem.onlineMargin !== undefined ? parseFloat(editItem.onlineMargin) : 85;
                    const tax = val * (gst / 100);
                    const offVal = val * (offMargin / 100);
                    const onVal = val * (onMargin / 100);
                    setEditItem({
                      ...editItem,
                      gstPercentage: gst,
                      sellingPrice: parseFloat((val + tax + offVal).toFixed(2)),
                      mrp: parseFloat((val + tax + onVal).toFixed(2))
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Offline Margin (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={editItem.offlineMargin !== undefined ? editItem.offlineMargin : 50}
                  onChange={(e) => {
                    const offMargin = parseFloat(e.target.value) || 0;
                    const val = parseFloat(editItem.purchasePrice) || 0;
                    const gst = parseFloat(editItem.gstPercentage) || 0;
                    const tax = val * (gst / 100);
                    const offVal = val * (offMargin / 100);
                    setEditItem({
                      ...editItem,
                      offlineMargin: offMargin,
                      sellingPrice: parseFloat((val + tax + offVal).toFixed(2))
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Online Margin (%)</label>
                <input 
                  type="number"
                  step="0.1"
                  value={editItem.onlineMargin !== undefined ? editItem.onlineMargin : 85}
                  onChange={(e) => {
                    const onMargin = parseFloat(e.target.value) || 0;
                    const val = parseFloat(editItem.purchasePrice) || 0;
                    const gst = parseFloat(editItem.gstPercentage) || 0;
                    const tax = val * (gst / 100);
                    const onVal = val * (onMargin / 100);
                    setEditItem({
                      ...editItem,
                      onlineMargin: onMargin,
                      mrp: parseFloat((val + tax + onVal).toFixed(2))
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Selling Price (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editItem.sellingPrice}
                  onChange={(e) => {
                    const sell = parseFloat(e.target.value) || 0;
                    const val = parseFloat(editItem.purchasePrice) || 0;
                    const gst = parseFloat(editItem.gstPercentage) || 0;
                    const tax = val * (gst / 100);
                    const computedOffMargin = val > 0 ? parseFloat((((sell - val - tax) / val) * 100).toFixed(2)) : 0;
                    setEditItem({
                      ...editItem,
                      sellingPrice: sell,
                      offlineMargin: computedOffMargin
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">MRP (₹) *</label>
                <input 
                  type="number"
                  step="0.01"
                  value={editItem.mrp}
                  onChange={(e) => {
                    const m = parseFloat(e.target.value) || 0;
                    const val = parseFloat(editItem.purchasePrice) || 0;
                    const gst = parseFloat(editItem.gstPercentage) || 0;
                    const tax = val * (gst / 100);
                    const computedOnMargin = val > 0 ? parseFloat((((m - val - tax) / val) * 100).toFixed(2)) : 0;
                    setEditItem({
                      ...editItem,
                      mrp: m,
                      onlineMargin: computedOnMargin
                    });
                  }}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Discount (%)</label>
                <input 
                  type="number"
                  value={editItem.discountPercentage}
                  onChange={(e) => setEditItem({ ...editItem, discountPercentage: parseFloat(e.target.value) || 0 })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-mono"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Drug Schedule *</label>
                <select 
                  value={editItem.drugSchedule || 'OTC'}
                  onChange={(e) => setEditItem({ ...editItem, drugSchedule: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-slate-205 font-bold cursor-pointer text-xs focus:border-primary focus:outline-none"
                >
                  <option value="OTC">OTC (Over The Counter)</option>
                  <option value="Schedule G">Schedule G</option>
                  <option value="Schedule H">Schedule H</option>
                  <option value="Schedule H1">Schedule H1</option>
                  <option value="Schedule X">Schedule X</option>
                  <option value="NDPS">NDPS / Narcotic</option>
                  <option value="Medical Device">Medical Device</option>
                  <option value="Surgical Item">Surgical Item</option>
                  <option value="Vaccine">Vaccine</option>
                  <option value="Ayurvedic">Ayurvedic</option>
                  <option value="Homeopathy">Homeopathy</option>
                </select>
              </div>

              <div className="col-span-2 bg-white/40 p-2.5 rounded-xl border border-gray-200 flex justify-between items-center font-bold text-xs">
                <span>Calculated Line Net:</span>
                <span className="font-mono text-primary">
                  ₹{((editItem.quantity * editItem.purchasePrice) * (1 - (editItem.discountPercentage || 0) / 100) * (1 + (editItem.gstPercentage || 0) / 100)).toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => { setEditItem(null); setEditIndex(null); }} variant="outline" className="px-4 text-gray-600 cursor-pointer">
                Cancel
              </Button>
              <Button type="button" onClick={handleSaveModalItem} variant="primary" className="px-5 font-bold cursor-pointer">
                Confirm Details
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchasesTab;
