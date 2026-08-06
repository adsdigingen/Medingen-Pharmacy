import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { FiSearch, FiShoppingCart, FiTrash2, FiPrinter, FiUser } from 'react-icons/fi';
import { useToast } from '../common/ToastProvider';

interface CounterSalesTabProps {
  API_BASE: string;
  currentUser: any;
}

export const CounterSalesTab: React.FC<CounterSalesTabProps> = ({ API_BASE, currentUser }) => {
  const { showToast } = useToast();

  // Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [posQty, setPosQty] = useState<number>(1);
  const [posDiscount, setPosDiscount] = useState<number>(0);

  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [cashierId] = useState(currentUser?.id || 'default-cashier');

  // Print Modal
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptText, setReceiptText] = useState('');
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm' | '150x95mm'>('80mm');
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);

  // Input Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const cashPaidInputRef = useRef<HTMLInputElement>(null);

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Keyboard Navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleCheckout();
      } else if (e.key === 'F8') {
        e.preventDefault();
        cashPaidInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        setSearchResults([]);
        setSelectedItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, paymentMethod, amountPaid, selectedItem]);

  // Autocomplete Counter Products Search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_BASE}/counter/products?search=${searchTerm}&limit=8`);
        if (res.ok) {
          const envelope = await res.json();
          setSearchResults(envelope.data || []);
        }
      } catch (e) {
        console.warn('Failed to search counter products', e);
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm, API_BASE]);

  // Cart Summary calculations
  const cartSummary = React.useMemo(() => {
    let subtotalInclusive = 0;
    let discountInclusive = 0;
    let gstTotal = 0;
    
    cart.forEach((it) => {
      const lineSubInclusive = it.quantity * it.sellingPrice;
      const lineDiscInclusive = lineSubInclusive * (it.discountPercentage / 100);
      const lineTaxableInclusive = lineSubInclusive - lineDiscInclusive;
      
      const gstPercent = it.gstPercentage || 12;
      const lineGst = lineTaxableInclusive * (gstPercent / (100 + gstPercent));

      subtotalInclusive += lineSubInclusive;
      discountInclusive += lineDiscInclusive;
      gstTotal += lineGst;
    });

    const grossTotal = subtotalInclusive - discountInclusive;
    const roundedTotal = Math.round(grossTotal);
    const roundOff = parseFloat((roundedTotal - grossTotal).toFixed(2));

    return {
      subtotal: subtotalInclusive,
      discount: discountInclusive,
      gst: gstTotal,
      roundOff,
      total: roundedTotal,
    };
  }, [cart]);

  // Set default amount paid when total changes
  useEffect(() => {
    setAmountPaid(cartSummary.total);
  }, [cartSummary.total]);

  const handleSelectItem = (item: any) => {
    setSelectedItem(item);
    setSearchTerm('');
    setSearchResults([]);
    setPosQty(1);
    setPosDiscount(0);
    setTimeout(() => qtyInputRef.current?.focus(), 50);
  };

  const handleAddToCart = () => {
    if (!selectedItem) return;

    if (selectedItem.availableUnits < posQty) {
      alert(`Insufficient counter stock. Available: ${selectedItem.availableUnits} units.`);
      return;
    }

    const existingIndex = cart.findIndex((it) => it.batchId === selectedItem.batchId);

    if (existingIndex > -1) {
      const updated = [...cart];
      const newQty = updated[existingIndex].quantity + posQty;
      if (selectedItem.availableUnits < newQty) {
        alert(`Cumulative quantity (${newQty}) exceeds available counter stock (${selectedItem.availableUnits}).`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          productId: selectedItem.productId,
          name: selectedItem.product.name,
          batchId: selectedItem.batchId,
          batchNumber: selectedItem.batch.batchNumber,
          expiryDate: selectedItem.batch.expiryDate,
          quantity: posQty,
          sellingPrice: selectedItem.sellingPrice !== null && selectedItem.sellingPrice !== undefined && selectedItem.sellingPrice > 0 
            ? selectedItem.sellingPrice 
            : (selectedItem.product.sellingPrice / selectedItem.unitsPerStrip),
          discountPercentage: posDiscount,
          gstPercentage: selectedItem.product.gstPercentage || 12,
        },
      ]);
    }

    setSelectedItem(null);
    setPosQty(1);
    setPosDiscount(0);
    searchInputRef.current?.focus();
    showToast('Product added to counter cart', 'success');
  };

  const handleUpdateQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      const updated = [...cart];
      updated.splice(index, 1);
      setCart(updated);
      return;
    }
    const updated = [...cart];
    updated[index].quantity = newQty;
    setCart(updated);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const payload = {
        paymentMethod,
        grandTotal: cartSummary.total,
        cashierId,
        items: cart.map((it) => {
          const lineSub = it.quantity * it.sellingPrice;
          const lineDisc = lineSub * (it.discountPercentage / 100);
          const lineTotal = lineSub - lineDisc;

          return {
            productId: it.productId,
            batchId: it.batchId,
            quantity: it.quantity,
            sellingPrice: it.sellingPrice,
            discount: lineDisc,
            gst: it.gstPercentage,
            total: lineTotal,
          };
        }),
      };

      const res = await fetch(`${API_BASE}/counter/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Counter Checkout transaction failed');

      const envelope = await res.json();
      const completedSale = envelope.data;

      showToast('Counter checkout completed successfully', 'success');
      setCart([]);
      
      // Fetch receipt print
      handleFetchReceipt(completedSale.id);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleFetchReceipt = async (saleId: string, widthOverride?: '58mm' | '80mm' | '150x95mm') => {
    const width = widthOverride || receiptWidth;
    try {
      const res = await fetch(`${API_BASE}/counter/print/${saleId}?width=${width}`);
      if (res.ok) {
        const envelope = await res.json();
        setReceiptText(envelope.data.text);
        setActiveReceiptId(saleId);
        setIsReceiptModalOpen(true);
      }
    } catch (e) {
      showToast('Failed to generate printed receipt', 'error');
    }
  };

  useEffect(() => {
    if (activeReceiptId && isReceiptModalOpen) {
      handleFetchReceipt(activeReceiptId);
    }
  }, [receiptWidth]);

  const changeDue = amountPaid - cartSummary.total;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn font-sans text-xs text-muted">
      
      {/* Search and Cart Column */}
      <div className="lg:col-span-2 space-y-4">
        
        {/* Medicine Search Bar */}
        <div className="relative">
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl shadow-sm p-1">
            <FiSearch className="text-gray-400 mx-3" size={18} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search Counter Inventory by Name or Barcode (F3)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-2.5 outline-none text-xs font-semibold text-gray-800"
            />
            {searching && (
              <svg className="animate-spin h-5 w-5 text-primary mr-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
          </div>

          {/* Autocomplete Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 divide-y divide-gray-100 overflow-hidden">
              {searchResults.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className="p-3 hover:bg-teal-50/40 cursor-pointer flex justify-between items-center transition-all duration-150"
                >
                  <div>
                    <span className="font-bold text-gray-800 block text-xs">{item.product.name}</span>
                    <span className="text-[10px] text-gray-500 font-mono">Batch: {item.batch.batchNumber} | Exp: {new Date(item.batch.expiryDate).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-primary block">{item.availableUnits} units</span>
                    <span className="text-[10px] text-gray-400">
                      ₹{(item.sellingPrice !== null && item.sellingPrice !== undefined && item.sellingPrice > 0 
                        ? item.sellingPrice 
                        : (item.product.sellingPrice / item.unitsPerStrip)).toFixed(2)}/unit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Item Detail / Add to Cart Drawer */}
        {selectedItem && (
          <div className="bg-gradient-to-r from-teal-500/10 to-transparent border border-teal-500/20 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
            <div>
              <span className="font-bold text-gray-800 text-sm block">{selectedItem.product.name}</span>
              <span className="text-[11px] text-gray-500 font-mono block">Batch: {selectedItem.batch.batchNumber} | Stock: {selectedItem.availableUnits} units</span>
              <span className="text-[11px] text-primary font-bold block mt-0.5">
                Rate: ₹{(selectedItem.sellingPrice !== null && selectedItem.sellingPrice !== undefined && selectedItem.sellingPrice > 0 
                  ? selectedItem.sellingPrice 
                  : (selectedItem.product.sellingPrice / selectedItem.unitsPerStrip)).toFixed(2)} / unit
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Qty</label>
                <input
                  ref={qtyInputRef}
                  type="number"
                  min="1"
                  max={selectedItem.availableUnits}
                  value={posQty}
                  onChange={(e) => setPosQty(Math.max(1, parseInt(e.target.value, 10)))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
                  className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-gray-800 outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-0.5">Disc %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={posDiscount}
                  onChange={(e) => setPosDiscount(Math.min(100, Math.max(0, parseInt(e.target.value, 10) || 0)))}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddToCart()}
                  className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center font-mono font-bold text-gray-800 outline-none focus:border-primary"
                />
              </div>

              <div className="pt-3.5">
                <Button onClick={handleAddToCart} variant="primary" className="font-bold py-1.5 px-4 shadow-lg">
                  Add Item
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Cart Item Table */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[300px]">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center select-none">
            <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <FiShoppingCart className="text-primary" size={14} /> Active Billing Cart
            </span>
            <Button onClick={() => setCart([])} variant="outline" size="sm" className="text-rose-500 border-rose-500/20 hover:bg-rose-50 px-2 py-1 text-[10px]">
              Clear Cart
            </Button>
          </div>

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-gray-450 gap-2">
              <FiShoppingCart size={40} className="text-gray-300 animate-bounce" />
              <span className="font-bold text-gray-400">Cart is Empty</span>
              <span className="text-[10px] text-gray-400">Search counter items above or scan barcode to add.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[10px] text-gray-500 uppercase font-bold">
                    <th className="px-4 py-2.5">Medicine</th>
                    <th className="px-4 py-2.5">Batch</th>
                    <th className="px-4 py-2.5 text-center">Qty (Units)</th>
                    <th className="px-4 py-2.5 text-right">Price/Unit</th>
                    <th className="px-4 py-2.5 text-center">Disc %</th>
                    <th className="px-4 py-2.5 text-right">Total</th>
                    <th className="px-4 py-2.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {cart.map((item, idx) => {
                    const totalLine = (item.quantity * item.sellingPrice) * (1 - item.discountPercentage / 100);
                    return (
                      <tr key={idx} className="hover:bg-gray-50/30">
                        <td className="px-4 py-3 font-bold text-gray-800">{item.name}</td>
                        <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{item.batchNumber}</td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateQty(idx, parseInt(e.target.value, 10) || 1)}
                            className="w-16 px-1.5 py-0.5 border border-gray-200 rounded text-center font-mono font-semibold"
                          />
                        </td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">₹{item.sellingPrice.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-mono text-gray-500">{item.discountPercentage}%</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">₹{totalLine.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => handleUpdateQty(idx, 0)} className="text-rose-500 hover:text-rose-700 transition-colors">
                            <FiTrash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Checkout Sidebar Column */}
      <div className="space-y-4">
        
        {/* Cart Summary Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px] block border-b border-gray-100 pb-2">Sales Summary</span>
          
          <div className="space-y-2 text-xs font-semibold text-gray-500">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono text-gray-700">₹{cartSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-rose-500">
              <span>Discount:</span>
              <span className="font-mono">- ₹{cartSummary.discount.toFixed(2)}</span>
            </div>
            {cartSummary.roundOff !== 0 && (
              <div className="flex justify-between">
                <span>Round Off:</span>
                <span className="font-mono text-gray-700">₹{cartSummary.roundOff.toFixed(2)}</span>
              </div>
            )}
            
            <div className="border-t border-gray-100 my-2 pt-3 flex justify-between items-center">
              <span className="font-bold text-gray-800 text-sm">Invoice Total:</span>
              <span className="text-xl font-extrabold text-primary font-mono">₹{cartSummary.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Payment and Settlement Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 space-y-4">
          <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px] block border-b border-gray-100 pb-2">Settlement Details</span>

          <div className="space-y-3">
            <div>
              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 font-semibold focus:outline-none focus:border-primary"
              >
                <option value="CASH">Cash Payment</option>
                <option value="UPI">UPI / QR Scan</option>
                <option value="CARD">Card Swipe</option>
              </select>
            </div>

            {paymentMethod === 'CASH' && (
              <>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Cash Paid (F8)</label>
                  <input
                    ref={cashPaidInputRef}
                    type="number"
                    min="0"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-750 font-bold font-mono text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="p-3.5 bg-gray-50 rounded-xl flex justify-between items-center select-none font-semibold text-gray-650">
                  <span className="text-xs">Change Due:</span>
                  <span className={`font-mono text-base font-extrabold ${changeDue < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    ₹{Math.max(0, changeDue).toFixed(2)}
                  </span>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            variant="primary"
            className="w-full font-bold py-2.5 rounded-xl shadow-lg shadow-teal-500/10 active:scale-95 flex items-center justify-center gap-1.5"
          >
            Complete Checkout (F5)
          </Button>
        </div>
      </div>

      {/* Printed Receipt Modal */}
      <Modal isOpen={isReceiptModalOpen} onClose={() => setIsReceiptModalOpen(false)} title="Thermal Receipt Preview">
        <div className="space-y-4">
          <div className="flex gap-2 justify-end select-none">
            <span className="text-[10px] font-bold text-gray-500 self-center">Receipt Width:</span>
            {(['58mm', '80mm', '150x95mm'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setReceiptWidth(w)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                  receiptWidth === w ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {w}
              </button>
            ))}
          </div>

          <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] overflow-auto leading-relaxed border border-slate-950 shadow-inner select-all whitespace-pre">
            {receiptText}
          </pre>

          <div className="flex justify-between pt-2">
            <Button onClick={() => window.print()} variant="outline" className="flex items-center gap-1">
              <FiPrinter /> Print Receipt
            </Button>
            <Button onClick={() => setIsReceiptModalOpen(false)} variant="primary">
              Done
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
};
export default CounterSalesTab;
