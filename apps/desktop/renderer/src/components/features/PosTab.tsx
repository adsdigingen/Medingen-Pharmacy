import React, { useEffect, useState } from 'react';
import { Button } from '../common/Button';

interface PosTabProps {
  cart: any[];
  setCart: React.Dispatch<React.SetStateAction<any[]>>;
  posSearch: string;
  setPosSearch: (val: string) => void;
  posSearchResults: any[];
  selectedProduct: any;
  setSelectedProduct: (val: any) => void;
  productBatches: any[];
  selectedBatchId: string;
  setSelectedBatchId: (val: string) => void;
  posQty: number;
  setPosQty: (val: number) => void;
  posDiscount: number;
  setPosDiscount: (val: number) => void;
  customerSearch: string;
  setCustomerSearch: (val: string) => void;
  customerResults: any[];
  setCustomerResults: (val: any[]) => void;
  selectedCustomer: any;
  setSelectedCustomer: (val: any) => void;
  paymentMethod: string;
  setPaymentMethod: (val: string) => void;
  amountPaid: number;
  setAmountPaid: (val: number) => void;
  mixedPayments: any[];
  setMixedPayments: (val: any[]) => void;
  invoiceType: string;
  setInvoiceType: (val: string) => void;
  cartSummary: any;
  modeOfSell: 'OFFLINE' | 'ONLINE';
  setModeOfSell: (val: 'OFFLINE' | 'ONLINE') => void;
  
  // Refs
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  customerInputRef: React.RefObject<HTMLInputElement | null>;
  qtyInputRef: React.RefObject<HTMLInputElement | null>;
  cashPaidInputRef: React.RefObject<HTMLInputElement | null>;

  // Handlers
  handleSelectProduct: (product: any) => Promise<void>;
  handleAddToCart: () => void;
  handleUpdateCartQty: (index: number, qty: number) => void;
  handleRemoveCartItem: (index: number) => void;
  handleCheckoutSubmit: () => Promise<void>;
  setIsHoldModalOpen: (val: boolean) => void;
  setIsCustomerModalOpen: (val: boolean) => void;
  setNewCustomerForm: React.Dispatch<React.SetStateAction<{ name: string; mobile: string }>>;
}

export const PosTab: React.FC<PosTabProps> = ({
  cart,
  setCart,
  posSearch,
  setPosSearch,
  posSearchResults,
  selectedProduct,
  setSelectedProduct,
  productBatches,
  selectedBatchId,
  setSelectedBatchId,
  posQty,
  setPosQty,
  posDiscount,
  setPosDiscount,
  customerSearch,
  setCustomerSearch,
  customerResults,
  setCustomerResults,
  selectedCustomer,
  setSelectedCustomer,
  paymentMethod,
  setPaymentMethod,
  amountPaid,
  setAmountPaid,
  mixedPayments,
  setMixedPayments,
  invoiceType,
  setInvoiceType,
  cartSummary,
  modeOfSell,
  setModeOfSell,
  
  searchInputRef,
  customerInputRef,
  qtyInputRef,
  cashPaidInputRef,

  handleSelectProduct,
  handleAddToCart,
  handleUpdateCartQty,
  handleRemoveCartItem,
  handleCheckoutSubmit,
  setIsHoldModalOpen,
  setIsCustomerModalOpen,
  setNewCustomerForm,
}) => {
  // Focus Search Bar on mount
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchInputRef]);

  // Keep barcode focus locked (if clicked elsewhere, we can refocus, but standard focus on mount is primary)
  const handleRefocusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn font-sans text-xs text-slate-400 h-[calc(100vh-120px)] overflow-hidden">
      
      {/* LEFT COLUMN: Item Selection & Shopping Cart (8/12 cols) */}
      <div className="lg:col-span-8 flex flex-col justify-between h-full overflow-hidden gap-4">
        
        {/* Item Entry Section */}
        <div className="bg-slate-900/35 border border-slate-900 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Item Registration</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase">Barcode Reader Ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Medicine Search input */}
            <div className="md:col-span-6 space-y-1.5 relative">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex justify-between">
                <span>Medicine Search</span>
                <span className="text-[9px] text-slate-600 font-normal">F3 to find</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  ref={searchInputRef}
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  placeholder="Scan barcode or type medicine name..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {posSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-56 overflow-y-auto">
                  <div className="p-2 bg-slate-950 text-[10px] font-bold text-slate-550 border-b border-slate-850 uppercase tracking-wider">Search Results</div>
                  {posSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleSelectProduct(p)}
                      className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-850/40 flex justify-between items-center"
                    >
                      <div>
                        <span className="font-bold text-slate-200 block">{p.name}</span>
                        <span className="text-[10px] text-slate-500">Generic: {p.genericName || 'N/A'}</span>
                      </div>
                      <span className="text-[10px] text-teal-400 font-bold">Select</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Batch, Qty & Discounts Allocation */}
            <div className="md:col-span-6 flex flex-wrap md:flex-nowrap gap-3 items-end">
              {selectedProduct ? (
                <div className="w-full bg-slate-950/40 border border-slate-850/80 p-3.5 rounded-xl space-y-3.5 animate-fadeIn">
                  
                  {/* Selected Info */}
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider">Item Selected</span>
                    <span className="font-bold text-slate-100 text-xs">{selectedProduct.name}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">FEFO Batches</label>
                    {productBatches.length === 0 ? (
                      <div className="text-[10px] text-rose-455 font-bold py-1">OUT OF STOCK</div>
                    ) : (
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
                      >
                        {productBatches.map(b => (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} (Exp: {new Date(b.expiryDate).toLocaleDateString()}) - ₹{b.sellingPrice} [Stock: {b.availableQty}]
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Quantity & Discount Inputs */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        ref={qtyInputRef}
                        value={posQty}
                        onChange={(e) => setPosQty(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-center font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        value={posDiscount}
                        onChange={(e) => setPosDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-center font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={() => { setSelectedProduct(null); handleRefocusSearch(); }} 
                      variant="outline" 
                      className="flex-1 py-1.5 text-[10px]"
                    >
                      Reset
                    </Button>
                    <Button 
                      onClick={handleAddToCart} 
                      className="flex-1 py-1.5 text-[10px]"
                    >
                      Add Line
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="w-full h-[154px] flex items-center justify-center border border-dashed border-slate-800 rounded-xl text-slate-600 bg-slate-950/10">
                  Select a medicine to configure batches
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Shopping Cart Items Table */}
        <div className="bg-slate-900/35 border border-slate-900 p-5 rounded-2xl flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center border-b border-slate-850/60 pb-3">
            <h3 className="font-bold text-white text-sm uppercase tracking-wider">Cart Invoice Details</h3>
            <div className="flex gap-4 text-[10px]">
              <span className="text-slate-500">Lines: <span className="font-bold text-slate-300">{cart.length}</span></span>
              <button onClick={() => { setCart([]); handleRefocusSearch(); }} className="text-rose-455 hover:underline font-bold">Clear all items</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-3.5 space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-slate-850 rounded-xl p-8 text-slate-550">
                <svg className="h-10 w-10 text-slate-600 mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="font-bold">Active Cart is Empty</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Barcode scanning or name search automatically adds lines</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-slate-950/40 border border-slate-850 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-slate-800 transition-colors animate-fadeIn">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-200 truncate">{item.name}</div>
                    <div className="text-[9px] text-slate-550 font-mono mt-0.5 uppercase tracking-wide">
                      Batch: {item.batchNumber} | Expiry: {new Date(item.expiryDate).toLocaleDateString()} | Price: ₹{item.sellingPrice}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Qty edit buttons */}
                    <div className="flex items-center border border-slate-800 rounded bg-slate-950 overflow-hidden font-bold">
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity - 1)} className="px-2 py-0.5 hover:bg-slate-900 text-slate-400">-</button>
                      <span className="px-2.5 font-mono text-slate-200 text-[10px] font-extrabold">{item.quantity}</span>
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 1)} className="px-2 py-0.5 hover:bg-slate-900 text-slate-400">+</button>
                    </div>

                    {/* Quick quantity modifiers */}
                    <div className="hidden sm:flex gap-1">
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 5)} className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 rounded text-[9px] font-bold text-slate-400">+5</button>
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 10)} className="px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 rounded text-[9px] font-bold text-slate-400">+10</button>
                    </div>

                    <div className="w-20 text-right font-bold font-mono text-slate-200">
                      ₹{item.totalAmount.toFixed(2)}
                    </div>

                    <button onClick={() => handleRemoveCartItem(idx)} className="text-slate-500 hover:text-rose-455 transition-colors p-0.5 cursor-pointer">
                      <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* RIGHT COLUMN: Customers, Calculations & Checkout (4/12 cols) */}
      <div className="lg:col-span-4 bg-slate-900/35 border border-slate-900 p-5 rounded-2xl flex flex-col justify-between h-full overflow-y-auto">
        
        <div className="space-y-5">
          
          {/* Customer Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Registry (F4)</label>
              <button 
                onClick={() => { setNewCustomerForm({ name: '', mobile: '' }); setIsCustomerModalOpen(true); }}
                className="text-[9px] text-teal-400 hover:text-teal-300 hover:underline font-bold"
              >
                + New Profile
              </button>
            </div>
            
            {selectedCustomer ? (
              <div className="bg-slate-955 border border-teal-500/20 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                <div>
                  <div className="font-bold text-slate-200">{selectedCustomer.name}</div>
                  <div className="text-[9px] text-slate-555 font-mono mt-0.5">Mobile: {selectedCustomer.mobile}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-[10px] text-rose-455 hover:underline font-semibold cursor-pointer">Remove</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    ref={customerInputRef}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Type name or mobile to search..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                  />

                  {/* Autocomplete query search results */}
                  {customerSearch.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-56 overflow-y-auto">
                      <div className="p-2 bg-slate-955 text-[10px] font-bold text-slate-500 border-b border-slate-855 uppercase tracking-wider">Matching Customers</div>
                      {customerResults.length > 0 ? (
                        customerResults.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerSearch('');
                              setCustomerResults([]);
                            }}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-850/40 flex justify-between items-center"
                          >
                            <div>
                              <span className="font-bold text-slate-200 block">{c.name}</span>
                              <span className="text-[10px] text-slate-550">Mobile: {c.mobile}</span>
                            </div>
                            <span className="text-[10px] text-teal-400 font-bold">Select</span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-slate-550 space-y-2">
                          <p className="font-bold text-rose-455">No registered customer matched</p>
                          <p className="text-[10px] leading-normal text-slate-600">Mobile number not registered. Click "+ New Profile" above to register first.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mode of Sell and Checkout configuration */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mode of Sell</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModeOfSell('OFFLINE')}
                className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  modeOfSell === 'OFFLINE'
                    ? 'bg-teal-500 text-slate-955 border-teal-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                Offline Mode
              </button>
              <button
                type="button"
                onClick={() => setModeOfSell('ONLINE')}
                className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  modeOfSell === 'ONLINE'
                    ? 'bg-teal-500 text-slate-955 border-teal-500'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-900'
                }`}
              >
                Online Mode
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice Type</label>
            <select
              value={invoiceType}
              onChange={(e) => setInvoiceType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
            >
              <option value="TAX">GST Tax Invoice (CGST + SGST split)</option>
              <option value="ESTIMATE">Estimate Bill (Non-GST)</option>
            </select>
          </div>

          {/* Dynamic calculations list */}
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Gross Subtotal:</span>
              <span className="font-mono text-slate-200">₹{cartSummary.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>GST Value:</span>
              <span className="font-mono text-slate-200">₹{cartSummary.gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Discounts:</span>
              <span className="font-mono text-rose-455">-₹{cartSummary.discount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-500 border-b border-slate-900 pb-2">
              <span>Round off:</span>
              <span className="font-mono text-slate-350">₹{cartSummary.roundOff.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-white pt-1">
              <span>Invoice Net Total:</span>
              <span className="text-xl font-extrabold text-teal-400 font-mono tracking-tight">₹{cartSummary.total.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Method of Payment</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200"
              >
                <option value="CASH">Cash Drawer</option>
                <option value="UPI">UPI Dynamic QR Code</option>
                <option value="CARD">Credit/Debit Card Terminal</option>
                <option value="MIXED">Mixed / Split Payment</option>
                <option value="CREDIT">Customer Account Ledger (Credit)</option>
              </select>
            </div>

            {/* Cash Drawer Calculator */}
            {paymentMethod === 'CASH' && (
              <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 border border-slate-850 rounded-xl animate-fadeIn text-xs">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Cash Paid (F8)</label>
                  <input
                    type="number"
                    ref={cashPaidInputRef}
                    value={amountPaid || ''}
                    onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                    placeholder="Enter cash paid"
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 font-mono text-center text-white text-xs font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-slate-500 uppercase">Return Change</label>
                  <div className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-800 text-center font-bold text-emerald-400 font-mono text-xs flex items-center justify-center">
                    ₹{amountPaid - cartSummary.total > 0 ? (amountPaid - cartSummary.total).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>
            )}

            {/* Split payments settings */}
            {paymentMethod === 'MIXED' && (
              <div className="bg-slate-950 p-3 border border-slate-850 rounded-xl space-y-2 text-xs animate-fadeIn">
                <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-wider mb-1">Define payment split values</span>
                {mixedPayments.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 font-semibold">{p.method}:</span>
                    <input
                      type="number"
                      value={p.amount || ''}
                      onChange={(e) => {
                        const updated = [...mixedPayments];
                        updated[idx].amount = parseFloat(e.target.value) || 0;
                        setMixedPayments(updated);
                      }}
                      placeholder="0.00"
                      className="w-24 px-2 py-1 rounded bg-slate-900 border border-slate-800 text-right font-mono text-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Submit & Quick actions toolbar */}
        <div className="space-y-3 pt-5 border-t border-slate-900 mt-4">
          <div className="grid grid-cols-2 gap-2.5 font-semibold">
            <button 
              onClick={() => setIsHoldModalOpen(true)}
              className="py-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 hover:text-white transition-all text-[11px] cursor-pointer"
            >
              Hold Bill (F6)
            </button>
            <button 
              onClick={handleCheckoutSubmit}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-955 transition-all shadow-lg text-[11px] font-extrabold disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
            >
              Save & Print (F5)
            </button>
          </div>
          
          {/* Shortcuts cheatsheet bar */}
          <div className="text-[9px] text-slate-550 font-mono text-center flex justify-center gap-3">
            <span>F2: New Bill</span>
            <span>F4: Customer</span>
            <span>F5: Save</span>
            <span>F6: Hold</span>
            <span>Esc: Close</span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default PosTab;
