import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FiSearch, FiFilter, FiCheckCircle, FiEdit3, FiPrinter, 
  FiAlertTriangle, FiPlus, FiX, FiCheck, FiUser, FiFileText, FiShield
} from 'react-icons/fi';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface DrugRegisterTabProps {
  currentUser: any;
  allUsers: any[];
}

export default function DrugRegisterTab({ currentUser, allUsers }: DrugRegisterTabProps) {
  // Lists and Pagination State
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);

  // Filters State
  const [search, setSearch] = useState<string>('');
  const [scheduleType, setScheduleType] = useState<string>('All');
  const [status, setStatus] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [pharmacist, setPharmacist] = useState<string>('');

  // Selection state for printing
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Count metrics State
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    printed: 0,
    totalCount: 0
  });

  // Modal Dialogs States
  const [verifyingItem, setVerifyingItem] = useState<any | null>(null);
  const [signingItem, setSigningItem] = useState<any | null>(null);

  // Verification Checklist State
  const [verificationForm, setVerificationForm] = useState({
    patientName: '',
    doctorName: '',
    prescriptionNumber: '',
    checkPrescription: false,
    checkMedicine: false,
    checkQuantity: false,
    checkBatch: false
  });

  // Signature Draw Pad State
  const [sigType, setSigType] = useState<'DRAWN' | 'UPLOADED' | 'STORED'>('DRAWN');
  const [uploadedSigBase64, setUploadedSigBase64] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);

  // Fetch register list and counts
  const groupedItems = useMemo(() => {
    const groups: Record<string, any> = {};
    items.forEach((item) => {
      const billNo = item.bill.billNumber;
      if (!groups[billNo]) {
        groups[billNo] = {
          ...item,
          medicines: [item],
        };
      } else {
        groups[billNo].medicines.push(item);
      }
    });
    return Object.values(groups);
  }, [items]);

  const fetchRegisterData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        search,
        scheduleType,
        status,
        startDate,
        endDate,
        pharmacist,
        page: page.toString(),
        limit: limit.toString()
      });

      const res = await fetch(`${API_BASE}/drug-schedule-register?${queryParams}`);
      if (res.ok) {
        const envelope = await res.json();
        // ResponseTransformInterceptor wraps paginated responses as { data: items[], meta: { total } }
        setItems(envelope.data || []);
        setTotal(envelope.meta?.total || 0);
      }
    } catch (e) {
      console.error("Failed to load drug registers", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Run quick parallel counts using the listing API
      const [pendingRes, verifiedRes, printedRes, totalRes] = await Promise.all([
        fetch(`${API_BASE}/drug-schedule-register?status=PENDING&limit=1`),
        fetch(`${API_BASE}/drug-schedule-register?status=VERIFIED&limit=1`),
        fetch(`${API_BASE}/drug-schedule-register?status=PRINTED&limit=1`),
        fetch(`${API_BASE}/drug-schedule-register?limit=1`)
      ]);

      const pending = pendingRes.ok ? (await pendingRes.json()).meta?.total ?? 0 : 0;
      const verified = verifiedRes.ok ? (await verifiedRes.json()).meta?.total ?? 0 : 0;
      const printed = printedRes.ok ? (await printedRes.json()).meta?.total ?? 0 : 0;
      const totalCount = totalRes.ok ? (await totalRes.json()).meta?.total ?? 0 : 0;

      setStats({ pending, verified, printed, totalCount });
    } catch (e) {
      console.error("Failed to load stats metrics", e);
    }
  };

  // Re-fetch trigger when filters or page changes
  useEffect(() => {
    fetchRegisterData();
    fetchStats();
  }, [search, scheduleType, status, startDate, endDate, pharmacist, page]);

  // Handle Verification Submit
  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingItem) return;

    try {
      const res = await fetch(`${API_BASE}/drug-schedule-register/${verifyingItem.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: verificationForm.patientName,
          doctorName: verificationForm.doctorName,
          prescriptionNumber: verificationForm.prescriptionNumber
        })
      });

      if (res.ok) {
        setVerifyingItem(null);
        fetchRegisterData();
        fetchStats();
      } else {
        alert("Failed to save verification.");
      }
    } catch (err) {
      alert("Error occurred during verification submission: " + err);
    }
  };

  // Setup Verification Checklist
  const openVerificationModal = (item: any) => {
    setVerifyingItem(item);
    setVerificationForm({
      patientName: item.patientName || '',
      doctorName: item.doctorName || '',
      prescriptionNumber: item.prescriptionNumber || '',
      checkPrescription: false,
      checkMedicine: false,
      checkQuantity: false,
      checkBatch: false
    });
  };

  const isAllChecked = verificationForm.checkPrescription &&
                       verificationForm.checkMedicine &&
                       verificationForm.checkQuantity &&
                       verificationForm.checkBatch;

  const handleToggleAll = (checked: boolean) => {
    setVerificationForm({
      ...verificationForm,
      checkPrescription: checked,
      checkMedicine: checked,
      checkQuantity: checked,
      checkBatch: checked
    });
  };

  // Signature pad drawing functions
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#2dd4bf'; // teal-400 accent color
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Handle digital signing submit
  const handleSignatureSubmit = async () => {
    if (!signingItem) return;

    let signatureImage = '';
    if (sigType === 'DRAWN') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      signatureImage = canvas.toDataURL('image/png');
    } else if (sigType === 'UPLOADED') {
      if (!uploadedSigBase64) {
        alert("Please upload a signature image first.");
        return;
      }
      signatureImage = uploadedSigBase64;
    } else if (sigType === 'STORED') {
      // Mock Stored Signature (styled canvas generation)
      const mockCanvas = document.createElement('canvas');
      mockCanvas.width = 300;
      mockCanvas.height = 100;
      const ctx = mockCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 300, 100);
        ctx.font = 'italic bold 20px Georgia';
        ctx.fillStyle = '#2dd4bf';
        ctx.textAlign = 'center';
        ctx.fillText(`Pharm. ${currentUser.username}`, 150, 50);
        ctx.font = '9px monospace';
        ctx.fillStyle = '#64748b';
        ctx.fillText(`Medingen Verified: ID-${currentUser.id.substring(0,6)}`, 150, 75);
      }
      signatureImage = mockCanvas.toDataURL('image/png');
    } else if (sigType === ('EMPTY' as any)) {
      signatureImage = '';
    }

    try {
      const res = await fetch(`${API_BASE}/drug-schedule-register/${signingItem.id}/signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signatureImage,
          signatureType: sigType
        })
      });

      if (res.ok) {
        setSigningItem(null);
        setUploadedSigBase64('');
        fetchRegisterData();
        fetchStats();
      } else {
        alert("Failed to save digital signature.");
      }
    } catch (err) {
      alert("Error occurred during signing: " + err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSigBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Official Statutory Register printing
  const handlePrintAction = async () => {
    const idsToPrint = selectedIds.length > 0 ? selectedIds : items.map(it => it.id);
    if (idsToPrint.length === 0) {
      alert("No register records found to print.");
      return;
    }

    try {
      // Mark as printed on server
      await fetch(`${API_BASE}/drug-schedule-register/print`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToPrint })
      });

      // Construct print URL containing the same filters (non-paginated export HTML)
      let token = currentUser?.token;
      if (!token) {
        try {
          const cached = localStorage.getItem('medingen_session');
          if (cached) {
            token = JSON.parse(cached).token;
          }
        } catch (_) {}
      }

      const queryParams = new URLSearchParams({
        search,
        scheduleType,
        status,
        startDate,
        endDate,
        pharmacist
      });
      if (token) {
        queryParams.append('token', token);
      }

      const printWindow = window.open(`${API_BASE}/drug-schedule-register/export-pdf?${queryParams}`, '_blank', 'width=1000,height=700');
      if (printWindow) {
        printWindow.focus();
      }
      
      setSelectedIds([]);
      fetchRegisterData();
      fetchStats();
    } catch (e) {
      alert("Failed to record register print logs: " + e);
    }
  };

  // Role permissions checks
  const canVerifyOrSign = currentUser?.role === 'ADMIN' || currentUser?.role === 'PHARMACIST';
  const canPrint = currentUser?.role === 'ADMIN' || currentUser?.role === 'STORE_MANAGER' || currentUser?.role === 'PHARMACIST';

  return (
    <div className="space-y-6 font-sans text-xs text-slate-400">
      
      {/* Top Banner & Header */}
      <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <FiShield className="text-teal-400" size={24} />
            Drug Schedule Register
          </h2>
          <p className="text-slate-500 text-xs mt-1">Regulatory compliance ledger for Schedule G, H, H1, X, and NDPS controlled substances.</p>
        </div>
        
        {canPrint && (
          <button 
            onClick={handlePrintAction}
            className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-955 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 text-xs"
          >
            <FiPrinter size={16} />
            Print Statutory Register {selectedIds.length > 0 ? `(${selectedIds.length})` : '(All)'}
          </button>
        )}
      </div>

      {/* Metrics Dashboard Widgets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Total Logs</span>
            <div className="text-2xl font-black text-white mt-1">{stats.totalCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 text-teal-400">
            <FiFileText size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Pending Sign-off</span>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.pending}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 text-amber-400">
            <FiAlertTriangle size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider">Verified Logs</span>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.verified}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 text-emerald-400">
            <FiCheckCircle size={20} />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Archived / Printed</span>
            <div className="text-2xl font-black text-blue-400 mt-1">{stats.printed}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 text-blue-400">
            <FiPrinter size={20} />
          </div>
        </div>

      </div>

      {/* Filter and Query Console */}
      <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-850 pb-3">
          <div className="flex items-center gap-2 font-bold text-white text-xs">
            <FiFilter size={16} className="text-teal-400" />
            Query Console
          </div>
          <button 
            onClick={() => {
              setSearch('');
              setScheduleType('All');
              setStatus('All');
              setStartDate('');
              setEndDate('');
              setPharmacist('');
              setPage(1);
            }}
            className="text-[10px] text-teal-400 hover:underline"
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          
          <div className="space-y-1.5 col-span-1 sm:col-span-2">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Medicine / Invoice Search</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Product, Bill, Presc, Patient..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-none focus:border-teal-500 text-xs"
              />
              <FiSearch className="absolute left-2.5 top-3 text-slate-600" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Drug Schedule Type</label>
            <select
              value={scheduleType}
              onChange={(e) => { setScheduleType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500 text-xs font-semibold"
            >
              <option value="All">All Schedules</option>
              <option value="Schedule G">G</option>
              <option value="Schedule H">H</option>
              <option value="Schedule H1">H1</option>
              <option value="Schedule X">X</option>
              <option value="NDPS">NDPS</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Verification Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-955 border border-slate-800 text-white focus:outline-none focus:border-teal-500 text-xs font-semibold"
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending Check</option>
              <option value="VERIFIED">Verified & Signed</option>
              <option value="PRINTED">Printed statutory</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-teal-500 text-xs font-mono"
            />
          </div>

        </div>
      </div>

      {/* statutory list data grid table */}
      <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-slate-400">
            <thead className="bg-slate-950 border-b border-slate-850 text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(items.map(it => it.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-slate-800 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Invoice / Date</th>
                <th className="py-3 px-4">Medicine details</th>
                <th className="py-3 px-4 text-center">Schedule</th>
                <th className="py-3 px-4">Batch / Qty</th>
                <th className="py-3 px-4">Patient details</th>
                <th className="py-3 px-4">Doctor & Prescription</th>
                <th className="py-3 px-4">Pharmacist</th>
                <th className="py-3 px-4 text-center">Signature</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500 font-bold">
                    <FiShield className="animate-spin text-teal-400 mx-auto mb-2" size={24} />
                    Awaiting Regulatory Registers...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-650 font-semibold">
                    No matching statutory medicine records.
                  </td>
                </tr>
              ) : (
                groupedItems.map((item) => {
                  const groupIds = item.medicines.map((m: any) => m.id);
                  const isSelected = groupIds.every((id: string) => selectedIds.includes(id));
                  const isPending = item.status === 'PENDING';
                  const isVerified = item.status === 'VERIFIED';
                  const isPrinted = item.status === 'PRINTED';
                  const dateStr = new Date(item.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

                  return (
                    <tr key={item.id} className={`hover:bg-slate-850/10 transition-colors border-b border-slate-850/50 ${isSelected ? 'bg-teal-500/5' : ''}`}>
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, ...groupIds]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => !groupIds.includes(id)));
                            }
                          }}
                          className="rounded border-slate-800 bg-slate-900 text-teal-500 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white block">{item.bill.billNumber}</span>
                        <span className="text-[10px] text-slate-500 font-mono mt-0.5">{dateStr}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.medicines.map((m: any, idx: number) => (
                          <div key={m.id} className={idx > 0 ? "mt-2 pt-2 border-t border-slate-800/40" : ""}>
                            <span className="font-bold text-slate-100 block">{m.product.name}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5">{m.product.genericName || 'No Generic Name'}</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col gap-1 items-center justify-center">
                          {Array.from(new Set(item.medicines.map((m: any) => m.scheduleType))).map((sch: any) => {
                            let scheduleColor = 'bg-slate-950 border-slate-800 text-slate-400';
                            if (sch === 'Schedule H') scheduleColor = 'bg-amber-500/10 border border-amber-500/20 text-amber-400';
                            else if (sch === 'Schedule H1') scheduleColor = 'bg-rose-500/10 border border-rose-500/20 text-rose-455';
                            else if (sch === 'Schedule X') scheduleColor = 'bg-purple-500/10 border border-purple-500/20 text-purple-400';
                            else if (sch === 'NDPS') scheduleColor = 'bg-red-500/10 border border-red-500/20 text-red-500 font-extrabold';
                            
                            return (
                              <span key={sch} className={`px-2 py-0.5 rounded-full text-[9px] font-bold block ${scheduleColor}`}>
                                {sch ? sch.replace('Schedule ', '') : ''}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono">
                        {item.medicines.map((m: any, idx: number) => (
                          <div key={m.id} className={idx > 0 ? "mt-2 pt-2 border-t border-slate-800/40" : ""}>
                            <span className="text-slate-300 block">{m.batchNumber}</span>
                            <span className="text-[10px] font-bold text-teal-400 mt-0.5">Qty: {m.quantity}</span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 text-slate-200 font-semibold">
                        {item.patientName || 'Walk-In Patient'}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.doctorName ? (
                          <>
                            <span className="text-slate-300 block">Dr. {item.doctorName}</span>
                            <span className="text-[10px] text-slate-500 font-mono mt-0.5">Rx: {item.prescriptionNumber || 'N/A'}</span>
                          </>
                        ) : (
                          <span className="text-slate-600 font-bold italic">Not Verified</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.verifiedBy ? (
                          <div>
                            <span className="text-slate-300 font-bold block uppercase">{item.verifiedBy}</span>
                            <span className="text-[9px] text-slate-550 mt-0.5">{new Date(item.verifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-bold italic">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center align-middle">
                        {item.signatureImage ? (
                          <img 
                            src={item.signatureImage} 
                            alt="Signature" 
                            className="h-6 max-w-20 object-contain bg-slate-955 border border-slate-800 rounded px-1.5 py-0.5 mx-auto" 
                          />
                        ) : (
                          <span className="text-[10px] text-slate-600 italic">No Sig</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPending && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
                            PENDING
                          </span>
                        )}
                        {isVerified && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                            VERIFIED
                          </span>
                        )}
                        {isPrinted && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/10 border border-blue-500/20 text-blue-400">
                            PRINTED
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {canVerifyOrSign && isPending && (
                          <button
                            onClick={() => openVerificationModal(item)}
                            className="px-2 py-1 rounded bg-teal-500/10 hover:bg-teal-500 text-teal-400 hover:text-slate-955 border border-teal-500/20 hover:border-teal-500 text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Verify & Sign
                          </button>
                        )}
                        {canVerifyOrSign && isVerified && !item.signatureImage && (
                          <button
                            onClick={() => setSigningItem(item)}
                            className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-955 border border-amber-500/20 hover:border-amber-500 text-[10px] font-bold cursor-pointer transition-all"
                          >
                            Sign Log
                          </button>
                        )}
                        <span className="text-slate-700">|</span>
                        <button
                          onClick={async () => {
                            let token = currentUser?.token;
                            if (!token) {
                              try {
                                const cached = localStorage.getItem('medingen_session');
                                if (cached) {
                                  token = JSON.parse(cached).token;
                                }
                              } catch (_) {}
                            }
                            const queryParams = new URLSearchParams({
                              search: item.bill.billNumber,
                              scheduleType: 'All',
                              status: 'All'
                            });
                            if (token) {
                              queryParams.append('token', token);
                            }
                            window.open(`${API_BASE}/drug-schedule-register/export-pdf?${queryParams}`, '_blank', 'width=1000,height=700');
                          }}
                          className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white text-[10px] font-semibold cursor-pointer"
                        >
                          Print Row
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {total > limit && (
          <div className="px-5 py-4 border-t border-slate-850 bg-slate-950/40 flex justify-between items-center text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-400">{(page-1)*limit + 1}</span> to <span className="font-bold text-slate-400">{Math.min(page*limit, total)}</span> of <span className="font-bold text-slate-400">{total}</span> logs
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent font-bold cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= total}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-850 text-slate-300 disabled:opacity-30 disabled:hover:bg-transparent font-bold cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ==================== VERIFICATION checklist modal dialog ==================== */}
      {verifyingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-xs text-slate-400">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <FiCheckCircle className="text-teal-400" />
                Prescription & Dispatch Verification
              </h3>
              <button 
                onClick={() => setVerifyingItem(null)} 
                className="text-slate-500 hover:text-white transition-all cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleVerifySubmit} className="p-6 space-y-5">
              
               {/* Product and invoice details */}
              <div className="bg-slate-955 border border-slate-850 rounded-xl p-4 space-y-2 grid grid-cols-2 gap-x-4 text-[10px]">
                <div className="col-span-2 border-b border-slate-850 pb-2 mb-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Medicine details</span>
                  <span className="text-xs font-black text-white">
                    {verifyingItem.medicines ? verifyingItem.medicines.map((m: any) => m.product.name).join(', ') : verifyingItem.product.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Schedule Type</span>
                  <span className="font-bold text-amber-400">
                    {verifyingItem.medicines ? Array.from(new Set(verifyingItem.medicines.map((m: any) => m.scheduleType.replace('Schedule ', '')))).join(', ') : verifyingItem.scheduleType.replace('Schedule ', '')}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sold Quantity</span>
                  <span className="font-bold text-teal-400 text-[9px] block max-h-20 overflow-y-auto leading-normal">
                    {verifyingItem.medicines ? verifyingItem.medicines.map((m: any) => `${m.product.name} (Qty ${m.quantity}, Batch ${m.batchNumber})`).join(' | ') : `Qty: ${verifyingItem.quantity} (Batch: ${verifyingItem.batchNumber})`}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block">Invoice Reference</span>
                  <span className="font-bold text-slate-300">{verifyingItem.bill.billNumber}</span>
                </div>
                <div className="mt-2">
                  <span className="text-slate-500 block">Date of Sale</span>
                  <span className="font-mono text-slate-300">{new Date(verifyingItem.createdAt).toLocaleString()}</span>
                </div>
              </div>

              {/* Regulatory Form fields */}
              <div className="space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Statutory Details Check</h4>
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Patient Full Name *</label>
                  <input
                    type="text"
                    required
                    value={verificationForm.patientName}
                    onChange={(e) => setVerificationForm({ ...verificationForm, patientName: e.target.value })}
                    placeholder="Enter patient full name"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>

                 <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Prescribing Doctor *</label>
                  <input
                    type="text"
                    required
                    value={verificationForm.doctorName}
                    onChange={(e) => setVerificationForm({ ...verificationForm, doctorName: e.target.value })}
                    placeholder="Dr. Name & Reg. No"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                  />
                </div>
              </div>

              {/* Checklist checklist */}
              <div className="space-y-3 border-t border-slate-850 pt-4">
                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Pharmacist compliance verification checklist</h4>
                
                <div className="space-y-2.5">
                  <label className="flex items-start gap-2.5 pb-2 mb-2 border-b border-slate-850/60 cursor-pointer font-bold text-teal-400">
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      onChange={(e) => handleToggleAll(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <span>Check All Compliance Items</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verificationForm.checkPrescription}
                      onChange={(e) => setVerificationForm({ ...verificationForm, checkPrescription: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <span>Original copy of doctor's prescription verified & found valid.</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verificationForm.checkMedicine}
                      onChange={(e) => setVerificationForm({ ...verificationForm, checkMedicine: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <span>Dispensed medicine name/generic match prescription exactly.</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verificationForm.checkQuantity}
                      onChange={(e) => setVerificationForm({ ...verificationForm, checkQuantity: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <span>Dispensed dosage strength and quantity match prescribed dosage limit.</span>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={verificationForm.checkBatch}
                      onChange={(e) => setVerificationForm({ ...verificationForm, checkBatch: e.target.checked })}
                      className="rounded border-slate-800 bg-slate-950 text-teal-500 focus:ring-0 cursor-pointer mt-0.5"
                    />
                    <span>Batch code, expiry Date, and inventory registers are aligned.</span>
                  </label>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850 font-semibold">
                <button
                  type="button"
                  onClick={() => setVerifyingItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    !verificationForm.patientName.trim() ||
                    !verificationForm.doctorName.trim() ||
                    !verificationForm.checkPrescription ||
                    !verificationForm.checkMedicine ||
                    !verificationForm.checkQuantity ||
                    !verificationForm.checkBatch
                  }
                  className="px-4 py-2 bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-500 hover:bg-teal-400 text-slate-955 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  Confirm Verification
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ==================== DIGITAL SIGNATURE DRAW DIALOG MODAL ==================== */}
      {signingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden font-sans text-xs text-slate-400">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-955/40">
              <h3 className="font-black text-white text-sm flex items-center gap-2">
                <FiEdit3 className="text-teal-400" />
                Digitally Sign Statutory Log
              </h3>
              <button 
                onClick={() => { setSigningItem(null); setUploadedSigBase64(''); }} 
                className="text-slate-500 hover:text-white transition-all cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              {/* Type selections */}
              <div className="flex gap-2 p-1 bg-slate-955 border border-slate-850 rounded-lg">
                <button
                  type="button"
                  onClick={() => setSigType('DRAWN')}
                  className={`flex-1 py-1.5 rounded text-center font-bold ${sigType === 'DRAWN' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-900 text-slate-500'}`}
                >
                  Draw Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('UPLOADED')}
                  className={`flex-1 py-1.5 rounded text-center font-bold ${sigType === 'UPLOADED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-900 text-slate-500'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('STORED')}
                  className={`flex-1 py-1.5 rounded text-center font-bold ${sigType === 'STORED' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-900 text-slate-500'}`}
                >
                  Use Profile Saved
                </button>
                <button
                  type="button"
                  onClick={() => setSigType('EMPTY' as any)}
                  className={`flex-1 py-1.5 rounded text-center font-bold ${sigType === ('EMPTY' as any) ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' : 'hover:bg-slate-900 text-slate-500'}`}
                >
                  Leave Empty
                </button>
              </div>

              {/* View options panels */}
              {sigType === 'DRAWN' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Draw within the pad bounds</span>
                    <button onClick={clearCanvas} className="text-[10px] text-teal-400 hover:underline">Clear Canvas</button>
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={350}
                    height={150}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full bg-slate-950 border border-slate-850 rounded-xl cursor-crosshair h-[150px]"
                  />
                </div>
              )}

              {sigType === 'UPLOADED' && (
                <div className="space-y-4 text-center">
                  <div className="border-2 border-dashed border-slate-800 hover:border-slate-700 bg-slate-950 p-6 rounded-xl transition-all cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    {uploadedSigBase64 ? (
                      <img 
                        src={uploadedSigBase64} 
                        alt="Uploaded Signature" 
                        className="h-16 object-contain mx-auto" 
                      />
                    ) : (
                      <div className="space-y-2">
                        <FiPlus size={24} className="text-slate-600 mx-auto" />
                        <p className="font-bold text-slate-500">Drag & Drop or Click to Upload Image</p>
                        <p className="text-[10px] text-slate-600">Supports PNG, JPG, JPEG (transparency preferred)</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {sigType === 'STORED' && (
                <div className="bg-slate-955 border border-slate-850 p-6 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mx-auto">
                    <FiUser size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 uppercase text-xs">Operator Stored Digital Signature</h5>
                    <p className="text-slate-500 text-[10px] mt-1 leading-normal">
                      Will automatically apply a cryptographic sign-off mark labeled:<br/>
                      <strong className="text-teal-400">Pharm. {currentUser.username}</strong>
                    </p>
                  </div>
                </div>
              )}

              {sigType === ('EMPTY' as any) && (
                <div className="bg-slate-955 border border-slate-855 p-6 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-455 border border-rose-500/20 flex items-center justify-center mx-auto animate-pulse">
                    <FiX size={24} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-200 uppercase text-xs">Leave Signature Blank</h5>
                    <p className="text-slate-500 text-[10px] mt-1 leading-normal">
                      The statutory log will be verified and marked as signed, but the signature field will remain completely empty on the printed register.
                    </p>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-850 font-semibold">
                <button
                  onClick={() => { setSigningItem(null); setUploadedSigBase64(''); }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSignatureSubmit}
                  className="px-4 py-2 bg-teal-500 hover:bg-teal-400 text-slate-955 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition-all"
                >
                  Save Signature
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
