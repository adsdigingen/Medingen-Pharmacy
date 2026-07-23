import React, { useEffect, useState, useRef } from 'react';
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
  handleCheckoutSubmit: (shouldPrint: boolean) => Promise<void>;
  setIsHoldModalOpen: (val: boolean) => void;
  setIsCustomerModalOpen: (val: boolean) => void;
  setNewCustomerForm: React.Dispatch<React.SetStateAction<{ name: string; mobile: string }>>;
  doctorName?: string;
  setDoctorName: (val: string) => void;
  handleSearchDoctors: (query: string) => Promise<any[]>;
  handleRegisterDoctor: (name: string) => Promise<any>;
  handleRegisterCustomerInline: (name: string, mobile: string) => Promise<any>;
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
  doctorName,
  setDoctorName,
  handleSearchDoctors,
  handleRegisterDoctor,
  handleRegisterCustomerInline,
}) => {
  const [productSelectedIndex, setProductSelectedIndex] = useState(0);
  const [customerSelectedIndex, setCustomerSelectedIndex] = useState(0);
  const [doctorResults, setDoctorResults] = useState<any[]>([]);
  const [showDoctorDropdown, setShowDoctorDropdown] = useState(false);
  const [doctorSelectedIndex, setDoctorSelectedIndex] = useState(0);
  const [inlineCustomerName, setInlineCustomerName] = useState('');
  const [inlineCustomerMobile, setInlineCustomerMobile] = useState('');

  const productItemRefs = useRef<HTMLButtonElement[]>([]);
  const customerItemRefs = useRef<HTMLButtonElement[]>([]);
  const doctorItemRefs = useRef<HTMLButtonElement[]>([]);

  // Update inline registration fields when search query changes
  useEffect(() => {
    const query = customerSearch.trim();
    if (/^\d+$/.test(query)) {
      setInlineCustomerMobile(query);
      setInlineCustomerName('');
    } else {
      setInlineCustomerName(query);
      setInlineCustomerMobile('');
    }
  }, [customerSearch]);

  // Query doctors when input changes
  useEffect(() => {
    const docNameStr = doctorName || '';
    if (docNameStr.trim().length >= 2) {
      const delayDebounceFn = setTimeout(async () => {
        const results = await handleSearchDoctors(docNameStr);
        setDoctorResults(results || []);
        setShowDoctorDropdown(true);
        setDoctorSelectedIndex(0);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setDoctorResults([]);
      setShowDoctorDropdown(false);
    }
  }, [doctorName]);

  useEffect(() => {
    setProductSelectedIndex(0);
    productItemRefs.current = [];
  }, [posSearchResults]);

  useEffect(() => {
    setCustomerSelectedIndex(0);
    customerItemRefs.current = [];
  }, [customerResults]);

  useEffect(() => {
    if (productItemRefs.current[productSelectedIndex]) {
      productItemRefs.current[productSelectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [productSelectedIndex]);

  useEffect(() => {
    if (customerItemRefs.current[customerSelectedIndex]) {
      customerItemRefs.current[customerSelectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [customerSelectedIndex]);

  const handleProductSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (posSearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setProductSelectedIndex(prev => (prev + 1) % posSearchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setProductSelectedIndex(prev => (prev - 1 + posSearchResults.length) % posSearchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = posSearchResults[productSelectedIndex];
      if (selected) {
        handleSelectProduct(selected);
        setProductSelectedIndex(0);
      }
    }
  };

  const handleCustomerSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (customerResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCustomerSelectedIndex(prev => (prev + 1) % customerResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCustomerSelectedIndex(prev => (prev - 1 + customerResults.length) % customerResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = customerResults[customerSelectedIndex];
      if (selected) {
        setSelectedCustomer(selected);
        setCustomerSearch('');
        setCustomerResults([]);
        setCustomerSelectedIndex(0);
      }
    }
  };

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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn font-sans text-xs text-muted h-[calc(100vh-120px)] overflow-hidden">
      
      {/* LEFT COLUMN: Item Selection & Shopping Cart (8/12 cols) */}
      <div className="lg:col-span-8 flex flex-col justify-between h-full overflow-hidden gap-4">
        
        {/* Item Entry Section */}
        <div className="bg-white/35 border border-gray-200 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Item Registration</h3>
            <span className="text-[10px] text-gray-500 font-bold uppercase">Barcode Reader Ready</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            
            {/* Medicine Search input */}
            <div className="md:col-span-6 space-y-1.5 relative">
              <label htmlFor="medicine-search" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                <span>Medicine Search</span>
                <span className="text-[9px] text-slate-600 font-normal">F3 to find</span>
              </label>
              <div className="relative">
                <input
                  id="medicine-search"
                  type="text"
                  ref={searchInputRef}
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  onKeyDown={handleProductSearchKeyDown}
                  placeholder="Scan barcode or type medicine name..."
                  className="w-full pl-9 pr-4 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs focus:outline-none focus:border-primary transition-colors"
                />
                <svg className="absolute left-3 top-3 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              {posSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-56 overflow-y-auto">
                  <div className="p-2 bg-white text-[10px] font-bold text-gray-400 border-b border-gray-200 uppercase tracking-wider">Search Results</div>
                  {posSearchResults.map((p, idx) => {
                    const isSelected = idx === productSelectedIndex;
                    return (
                      <button
                        ref={el => { productItemRefs.current[idx] = el!; }}
                        key={p.id}
                        type="button"
                        onClick={() => handleSelectProduct(p)}
                        className={`w-full text-left px-3.5 py-2.5 transition-colors border-b border-gray-200/40 flex justify-between items-center cursor-pointer ${
                          isSelected ? 'bg-primary-light text-primary font-bold' : 'hover:bg-gray-100'
                        }`}
                      >
                        <div>
                          <span className={`block font-bold ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{p.name}</span>
                          <span className="text-[10px] text-gray-550 font-medium">Generic: {p.genericName || 'N/A'}</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400">
                          {isSelected ? '⏎ Select' : 'Click'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Batch, Qty & Discounts Allocation */}
            <div className="md:col-span-6 flex flex-wrap md:flex-nowrap gap-3 items-end">
              {selectedProduct ? (
                <div className="w-full bg-white/40 border border-gray-200/80 p-3.5 rounded-xl space-y-3.5 animate-fadeIn">
                  
                  {/* Selected Info */}
                  <div>
                    <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider">Item Selected</span>
                    <span className="font-bold text-gray-800 text-xs">{selectedProduct.name}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">FEFO Batches</label>
                    {productBatches.length === 0 ? (
                      <div className="text-[10px] text-rose-600 font-bold py-1">OUT OF STOCK</div>
                    ) : (
                      <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700"
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
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        ref={qtyInputRef}
                        value={posQty}
                        onChange={(e) => setPosQty(parseInt(e.target.value, 10) || 1)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 text-center font-mono font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        value={posDiscount}
                        onChange={(e) => setPosDiscount(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800 text-center font-mono"
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
                <div className="w-full h-[154px] flex items-center justify-center border border-dashed border-gray-200 rounded-xl text-slate-600 bg-white/10">
                  Select a medicine to configure batches
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Shopping Cart Items Table */}
        <div className="bg-white/35 border border-gray-200 p-5 rounded-2xl flex-1 flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center border-b border-gray-200/60 pb-3">
            <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Cart Invoice Details</h3>
            <div className="flex gap-4 text-[10px]">
              <span className="text-gray-500">Lines: <span className="font-bold text-gray-700">{cart.length}</span></span>
              <button onClick={() => { setCart([]); handleRefocusSearch(); }} className="text-rose-600 hover:underline font-bold">Clear all items</button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto mt-3.5 space-y-2.5 pr-1">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center border border-dashed border-gray-200 rounded-xl p-8 text-gray-400">
                <svg className="h-10 w-10 text-slate-600 mb-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="font-bold">Active Cart is Empty</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Barcode scanning or name search automatically adds lines</p>
              </div>
            ) : (
              cart.map((item, idx) => (
                <div key={idx} className="bg-white/40 border border-gray-200 p-3 rounded-xl flex items-center justify-between gap-3 hover:border-gray-200 transition-colors animate-fadeIn">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-700 truncate">{item.name}</div>
                    <div className="text-[9px] text-gray-400 font-mono mt-0.5 uppercase tracking-wide">
                      Batch: {item.batchNumber} | Expiry: {new Date(item.expiryDate).toLocaleDateString()} | Price: ₹{item.sellingPrice}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    {/* Qty edit buttons */}
                    <div className="flex items-center border border-gray-200 rounded bg-white overflow-hidden font-bold">
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity - 1)} className="px-2 py-0.5 hover:bg-white text-muted">-</button>
                      <span className="px-2.5 font-mono text-gray-700 text-[10px] font-extrabold">{item.quantity}</span>
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 1)} className="px-2 py-0.5 hover:bg-white text-muted">+</button>
                    </div>

                    {/* Quick quantity modifiers */}
                    <div className="hidden sm:flex gap-1">
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 5)} className="px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded text-[9px] font-bold text-muted">+5</button>
                      <button onClick={() => handleUpdateCartQty(idx, item.quantity + 10)} className="px-1.5 py-0.5 bg-white hover:bg-gray-100 rounded text-[9px] font-bold text-muted">+10</button>
                    </div>

                    <div className="w-20 text-right font-bold font-mono text-gray-700">
                      ₹{item.totalAmount.toFixed(2)}
                    </div>

                    <button onClick={() => handleRemoveCartItem(idx)} className="text-gray-500 hover:text-rose-600 transition-colors p-0.5 cursor-pointer">
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
      <div className="lg:col-span-4 bg-white/35 border border-gray-200 p-4 rounded-2xl flex flex-col justify-between h-full overflow-hidden">
        
        <div className="space-y-3.5 overflow-y-auto pr-1 flex-1">
          
          {/* Customer Panel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="customer-search" className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Customer Registry (F4)</label>
              <button 
                onClick={() => { setNewCustomerForm({ name: '', mobile: '' }); setIsCustomerModalOpen(true); }}
                className="text-[9px] text-primary hover:text-teal-300 hover:underline font-bold"
              >
                + New Profile
              </button>
            </div>
            
            {selectedCustomer ? (
              <div className="bg-gray-50 border border-primary/20 p-3 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                <div>
                  <div className="font-bold text-gray-700">{selectedCustomer.name}</div>
                  <div className="text-[9px] text-gray-500 font-mono mt-0.5">Mobile: {selectedCustomer.mobile}</div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer">Remove</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input
                    id="customer-search"
                    type="text"
                    ref={customerInputRef}
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    onKeyDown={handleCustomerSearchKeyDown}
                    placeholder="Type name or mobile to search..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs focus:outline-none focus:border-primary transition-colors"
                  />

                  {/* Autocomplete query search results */}
                  {customerSearch.trim() && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-56 overflow-y-auto">
                      <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-500 border-b border-border uppercase tracking-wider">Matching Customers</div>
                      {customerResults.length > 0 ? (
                        customerResults.map((c, idx) => {
                          const isSelected = idx === customerSelectedIndex;
                          return (
                            <button
                              ref={el => { customerItemRefs.current[idx] = el!; }}
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedCustomer(c);
                                setCustomerSearch('');
                                setCustomerResults([]);
                              }}
                              className={`w-full text-left px-3.5 py-2.5 transition-colors border-b border-gray-200/40 flex justify-between items-center cursor-pointer ${
                                isSelected ? 'bg-primary-light text-primary font-bold' : 'hover:bg-gray-100'
                              }`}
                            >
                              <div>
                                <span className={`font-bold block ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{c.name}</span>
                                <span className="text-[10px] text-gray-400">Mobile: {c.mobile}</span>
                              </div>
                              <span className="text-[10px] font-bold text-gray-400">
                                {isSelected ? '⏎ Select' : 'Select'}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="p-4 bg-gray-50 border-t border-gray-150/40 text-left space-y-2.5">
                          <p className="font-bold text-rose-600 text-center uppercase tracking-wide text-[10px]">No Registered Customer Matched</p>
                          <div className="space-y-2">
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Mobile Number *</label>
                              <input
                                type="text"
                                placeholder="Enter 10-digit mobile"
                                value={inlineCustomerMobile}
                                onChange={(e) => setInlineCustomerMobile(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-gray-200 rounded bg-white text-gray-705 font-mono focus:outline-none focus:border-primary text-xs"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Customer Name *</label>
                              <input
                                type="text"
                                placeholder="Enter customer name"
                                value={inlineCustomerName}
                                onChange={(e) => setInlineCustomerName(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-gray-200 rounded bg-white text-gray-705 focus:outline-none focus:border-primary text-xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={async () => {
                                if (!inlineCustomerName.trim() || !inlineCustomerMobile.trim()) {
                                  alert("Both Customer Name and Mobile Number are required to register!");
                                  return;
                                }
                                const saved = await handleRegisterCustomerInline(inlineCustomerName, inlineCustomerMobile);
                                if (saved) {
                                  setInlineCustomerName('');
                                  setInlineCustomerMobile('');
                                }
                              }}
                              className="w-full py-1.5 bg-primary text-slate-955 rounded font-bold hover:bg-primary/95 transition-all shadow cursor-pointer text-xs"
                            >
                              + Register & Select
                            </button>
                          </div>
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
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Mode of Sell</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModeOfSell('OFFLINE')}
                className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  modeOfSell === 'OFFLINE'
                    ? 'bg-primary text-slate-955 border-teal-500'
                    : 'bg-white text-muted border-gray-200 hover:bg-white'
                }`}
              >
                Offline Mode
              </button>
              <button
                type="button"
                onClick={() => setModeOfSell('ONLINE')}
                className={`py-1.5 px-2.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                  modeOfSell === 'ONLINE'
                    ? 'bg-primary text-slate-955 border-teal-500'
                    : 'bg-white text-muted border-gray-200 hover:bg-white'
                }`}
              >
                Online Mode
              </button>
            </div>
          </div>

          {/* Doctor Name configuration */}
          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Doctor Name</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={doctorName || ''}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g. Dr. John Doe / Self"
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-xs focus:outline-none focus:border-primary transition-colors font-medium"
              />
              {(doctorName || '').trim() && !doctorResults.some(d => d && d.name && d.name.toLowerCase() === (doctorName || '').toLowerCase().trim()) && (
                <button
                  type="button"
                  onClick={async () => {
                    const saved = await handleRegisterDoctor(doctorName || '');
                    if (saved) {
                      setDoctorName(saved.name);
                      setDoctorResults([]);
                      setShowDoctorDropdown(false);
                    }
                  }}
                  className="px-2.5 py-1.5 bg-primary text-slate-955 rounded-lg text-[10px] font-bold hover:bg-primary/90 transition-colors shadow cursor-pointer whitespace-nowrap"
                  title="Save Doctor to Registry"
                >
                  + Save
                </button>
              )}
            </div>

            {/* Doctor Autocomplete Query dropdown */}
            {showDoctorDropdown && (doctorResults.length > 0 || ((doctorName || '').trim().length >= 2)) && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs max-h-48 overflow-y-auto">
                <div className="p-2 bg-gray-50 text-[10px] font-bold text-gray-500 border-b border-border uppercase tracking-wider font-semibold">
                  Matching Doctors
                </div>
                {doctorResults.length > 0 ? (
                  doctorResults.map((doc, idx) => {
                    const isSelected = idx === doctorSelectedIndex;
                    return (
                      <button
                        ref={el => { doctorItemRefs.current[idx] = el!; }}
                        key={doc.id}
                        type="button"
                        onClick={() => {
                          setDoctorName(doc.name);
                          setDoctorResults([]);
                          setShowDoctorDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 transition-colors border-b border-gray-200/40 flex justify-between items-center cursor-pointer ${
                          isSelected ? 'bg-primary-light text-primary font-bold' : 'hover:bg-gray-100'
                        }`}
                      >
                        <span>{doc.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold">Select</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="p-3 text-center">
                    <p className="text-gray-400 mb-2 font-medium">No registered doctor matched.</p>
                    <button
                      type="button"
                      onClick={async () => {
                        const saved = await handleRegisterDoctor(doctorName || '');
                        if (saved) {
                          setDoctorName(saved.name);
                          setDoctorResults([]);
                          setShowDoctorDropdown(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-primary text-slate-955 rounded-lg text-[10px] font-bold hover:bg-primary/95 transition-all shadow cursor-pointer"
                    >
                      + Save & Select "{doctorName || ''}"
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Invoice Type & Payment Method Side-by-Side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invoice Type</label>
              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[11px]"
              >
                <option value="TAX">Tax Invoice</option>
                <option value="ESTIMATE">Estimate Bill</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 text-[11px]"
              >
                <option value="CASH">Cash Drawer</option>
                <option value="UPI">UPI Dynamic QR</option>
                <option value="CARD">Card Terminal</option>
                <option value="MIXED">Mixed / Split</option>
                <option value="CREDIT">Ledger (Credit)</option>
              </select>
            </div>
          </div>

          {/* Cash Drawer Calculator / Split Settings */}
          {paymentMethod === 'CASH' && (
            <div className="grid grid-cols-2 gap-3 bg-white p-3 border border-gray-200 rounded-xl animate-fadeIn text-xs">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Cash Paid (F8)</label>
                <input
                  type="number"
                  ref={cashPaidInputRef}
                  value={amountPaid || ''}
                  onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                  placeholder="Enter cash paid"
                  className="w-full px-2 py-1.5 rounded bg-white border border-gray-200 font-mono text-center text-gray-800 text-xs font-bold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-gray-500 uppercase">Return Change</label>
                <div className="w-full px-2 py-1.5 rounded bg-white border border-gray-200 text-center font-bold text-emerald-400 font-mono text-xs flex items-center justify-center">
                  ₹{amountPaid - cartSummary.total > 0 ? (amountPaid - cartSummary.total).toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'MIXED' && (
            <div className="bg-white p-3 border border-gray-200 rounded-xl space-y-2 text-xs animate-fadeIn">
              <span className="text-[9px] font-bold text-gray-500 uppercase block tracking-wider mb-1">Define payment split values</span>
              {mixedPayments.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 font-semibold">{p.method}:</span>
                  <input
                    type="number"
                    value={p.amount || ''}
                    onChange={(e) => {
                      const updated = [...mixedPayments];
                      updated[idx].amount = parseFloat(e.target.value) || 0;
                      setMixedPayments(updated);
                    }}
                    placeholder="0.00"
                    className="w-24 px-2 py-1 rounded bg-white border border-gray-200 text-right font-mono text-gray-800"
                  />
                </div>
              ))}
            </div>
          )}

        </div>

        {/* STICKY BOTTOM CHECKOUT CARD */}
        <div className="pt-3.5 border-t border-gray-200 bg-white/10 mt-3 space-y-3 shrink-0">
          
          {/* Dynamic calculations list (2x2 grid format for space saving) */}
          <div className="bg-white border border-gray-200 p-3.5 rounded-xl space-y-2.5 text-xs shadow-sm">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-gray-500 border-b border-gray-150 pb-2">
              <div className="flex justify-between">
                <span>Gross:</span>
                <span className="font-mono text-gray-700 font-bold">₹{cartSummary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST:</span>
                <span className="font-mono text-gray-700 font-bold">₹{cartSummary.gst.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Disc:</span>
                <span className="font-mono text-rose-600 font-bold">-₹{cartSummary.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Round:</span>
                <span className="font-mono text-gray-600 font-bold">₹{cartSummary.roundOff.toFixed(2)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-center text-sm font-bold text-gray-800 pt-0.5">
              <span className="text-[9px] uppercase tracking-wider text-gray-400 font-extrabold">Net Payable:</span>
              <span className="text-2xl font-extrabold text-primary font-mono tracking-tight animate-pulse-subtle">
                ₹{cartSummary.total.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 font-semibold">
            <button 
              type="button"
              onClick={() => setIsHoldModalOpen(true)}
              className="py-2.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-gray-800 transition-all text-[10px] font-bold cursor-pointer text-center"
            >
              Hold (F6)
            </button>
            <button 
              type="button"
              onClick={() => handleCheckoutSubmit(false)}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-all shadow-sm text-[10px] font-extrabold disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-center"
            >
              Save
            </button>
            <button 
              type="button"
              onClick={() => handleCheckoutSubmit(true)}
              disabled={cart.length === 0}
              className="py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white transition-all shadow-lg text-[10px] font-extrabold disabled:opacity-40 disabled:pointer-events-none cursor-pointer text-center"
            >
              Save & Print (F5)
            </button>
          </div>
          
          {/* Shortcuts cheatsheet bar */}
          <div className="text-[9px] text-gray-400 font-mono text-center flex justify-center gap-3">
            <span>F2: New Bill</span>
            <span>F4: Customer</span>
            <span>F5: Print</span>
            <span>F6: Hold</span>
            <span>Esc: Close</span>
          </div>
        </div>

      </div>

    </div>
  );
};
export default PosTab;
