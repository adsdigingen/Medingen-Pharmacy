import React, { useState, useMemo } from 'react';
import { DataTable, Column } from '../common/DataTable';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiTruck, FiPhone, FiMail, FiMapPin, FiUser, FiCreditCard, FiFileText } from 'react-icons/fi';

interface SuppliersTabProps {
  suppliers: any[];
  fetchSuppliers: () => Promise<void>;
  API_BASE: string;
}

const emptyForm = {
  name: '',
  gstin: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
  creditDays: '',
  openingBalance: '',
  notes: '',
};

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  fetchSuppliers,
  API_BASE,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status !== false).length;
    const inactive = total - active;
    const withGstin = suppliers.filter(s => s.gstin).length;
    return { total, active, inactive, withGstin };
  }, [suppliers]);

  // Open add modal
  const openAddModal = () => {
    setForm(emptyForm);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  // Open edit modal
  const openEditModal = (supplier: any) => {
    setForm({
      name: supplier.name || '',
      gstin: supplier.gstin || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      city: supplier.city || '',
      state: supplier.state || '',
      pincode: supplier.pincode || '',
      creditDays: supplier.creditDays?.toString() || '',
      openingBalance: supplier.openingBalance?.toString() || '',
      notes: supplier.notes || '',
    });
    setSelectedSupplier(supplier);
    setIsEditing(true);
    setIsModalOpen(true);
  };

  // Save (create or update)
  const handleSave = async () => {
    if (!form.name.trim()) {
      alert('Supplier name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        gstin: form.gstin.trim() || undefined,
        contactPerson: form.contactPerson.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        pincode: form.pincode.trim() || undefined,
        creditDays: form.creditDays ? parseInt(form.creditDays, 10) : undefined,
        openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : undefined,
        notes: form.notes.trim() || undefined,
      };

      const url = isEditing
        ? `${API_BASE}/suppliers/${selectedSupplier.id}`
        : `${API_BASE}/suppliers`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to ${isEditing ? 'update' : 'create'} supplier`);
      }

      setIsModalOpen(false);
      setForm(emptyForm);
      setSelectedSupplier(null);
      await fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  // Toggle status
  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/suppliers/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) await fetchSuppliers();
    } catch (err) {
      console.error('Toggle failed', err);
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/suppliers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeleteConfirmId(null);
        if (selectedSupplier?.id === id) {
          setSelectedSupplier(null);
          setViewMode('list');
        }
        await fetchSuppliers();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Cannot delete supplier — may have linked products or orders.');
      }
    } catch (err) {
      alert('Delete failed');
    }
  };

  // View detail
  const openDetail = (supplier: any) => {
    setSelectedSupplier(supplier);
    setViewMode('detail');
  };

  // Table columns
  const columns: Column<any>[] = [
    {
      header: 'Supplier Name',
      accessor: (row) => (
        <div>
          <span className="font-bold text-gray-700 block">{row.name}</span>
          {row.contactPerson && <span className="text-[10px] text-gray-500">{row.contactPerson}</span>}
        </div>
      ),
      sortKey: 'name',
      exportValue: (row) => row.name,
    },
    {
      header: 'GSTIN',
      accessor: (row) => (
        <span className="text-gray-700 font-mono text-[11px]">{row.gstin || '—'}</span>
      ),
      exportValue: (row) => row.gstin || '',
    },
    {
      header: 'Phone',
      accessor: (row) => (
        <span className="text-gray-700">{row.phone || '—'}</span>
      ),
      exportValue: (row) => row.phone || '',
    },
    {
      header: 'City',
      accessor: (row) => (
        <span className="text-muted">{row.city || '—'}</span>
      ),
      exportValue: (row) => row.city || '',
    },
    {
      header: 'Credit Days',
      accessor: (row) => (
        <span className="text-gray-700">{row.creditDays ?? '—'}</span>
      ),
      exportValue: (row) => row.creditDays?.toString() || '',
    },
    {
      header: 'Balance',
      accessor: (row) => (
        <span className={`font-bold ${(row.outstandingBalance || 0) > 0 ? 'text-amber-400' : 'text-muted'}`}>
          ₹{(row.outstandingBalance || 0).toFixed(2)}
        </span>
      ),
      sortKey: 'outstandingBalance',
      exportValue: (row) => (row.outstandingBalance || 0).toFixed(2),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <Badge variant={row.status !== false ? 'success' : 'danger'}>
          {row.status !== false ? 'Active' : 'Inactive'}
        </Badge>
      ),
      exportValue: (row) => row.status !== false ? 'Active' : 'Inactive',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); openEditModal(row); }}
            className="p-1.5 rounded-lg hover:bg-primary/10 text-muted hover:text-primary transition-colors cursor-pointer"
            title="Edit"
          >
            <FiEdit size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggle(row.id); }}
            className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted hover:text-amber-400 transition-colors cursor-pointer"
            title={row.status !== false ? 'Deactivate' : 'Activate'}
          >
            {row.status !== false ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(row.id); }}
            className="p-1.5 rounded-lg hover:bg-rose-500/10 text-muted hover:text-rose-400 transition-colors cursor-pointer"
            title="Delete"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      ),
      exportValue: () => '',
    },
  ];

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail' && selectedSupplier) {
    const s = selectedSupplier;
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setViewMode('list'); setSelectedSupplier(null); }}
              className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-100 text-muted hover:text-gray-800 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-800">{s.name}</h2>
              <p className="text-xs text-gray-500">Supplier Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => openEditModal(s)}>
              <FiEdit className="mr-1.5" size={13} /> Edit
            </Button>
            <Button variant={s.status !== false ? 'outline' : 'primary'} size="sm" onClick={() => handleToggle(s.id)}>
              {s.status !== false ? 'Deactivate' : 'Activate'}
            </Button>
          </div>
        </div>

        {/* Detail Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Contact Information */}
          <div className="bg-white/60 border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <FiUser size={14} className="text-primary" /> Contact Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Contact Person</span>
                <span className="text-sm text-gray-700">{s.contactPerson || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Phone</span>
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  {s.phone ? <><FiPhone size={12} className="text-primary" />{s.phone}</> : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Email</span>
                <span className="text-sm text-gray-700 flex items-center gap-1.5">
                  {s.email ? <><FiMail size={12} className="text-primary" />{s.email}</> : '—'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Status</span>
                <Badge variant={s.status !== false ? 'success' : 'danger'}>
                  {s.status !== false ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="bg-white/60 border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <FiCreditCard size={14} className="text-primary" /> Business Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">GSTIN</span>
                <span className="text-sm text-gray-700 font-mono">{s.gstin || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Credit Days</span>
                <span className="text-sm text-gray-700">{s.creditDays ?? '—'} days</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Opening Balance</span>
                <span className="text-sm text-gray-700">₹{(s.openingBalance || 0).toFixed(2)}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Outstanding</span>
                <span className={`text-sm font-bold ${(s.outstandingBalance || 0) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  ₹{(s.outstandingBalance || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white/60 border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <FiMapPin size={14} className="text-primary" /> Address
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Street Address</span>
                <span className="text-sm text-gray-700">{s.address || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">City</span>
                <span className="text-sm text-gray-700">{s.city || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">State</span>
                <span className="text-sm text-gray-700">{s.state || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block mb-0.5">Pincode</span>
                <span className="text-sm text-gray-700">{s.pincode || '—'}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white/60 border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-2">
              <FiFileText size={14} className="text-primary" /> Notes
            </h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{s.notes || 'No notes added.'}</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST VIEW ───
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight flex items-center gap-2.5">
            <FiTruck className="text-primary" size={22} />
            Supplier Management
          </h1>
          <p className="text-[11px] text-gray-500 font-medium mt-1">
            Manage your pharmacy's medicine and equipment suppliers
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <FiPlus className="mr-1.5" size={14} /> Add Supplier
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Suppliers', value: stats.total, color: 'text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Inactive', value: stats.inactive, color: 'text-rose-400' },
          { label: 'With GSTIN', value: stats.withGstin, color: 'text-primary' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 border border-gray-200 rounded-xl p-4 text-center">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      {suppliers.length === 0 ? (
        <EmptyState
          title="No Suppliers Yet"
          description="Add your first supplier to start creating purchase orders and managing inventory."
          icon={<FiTruck size={32} />}
        />
      ) : (
        <DataTable
          data={suppliers}
          columns={columns}
          onRowClick={openDetail}
          tableName="suppliers"
          itemsPerPage={15}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setForm(emptyForm); }}
        title={isEditing ? 'Edit Supplier' : 'Add New Supplier'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : isEditing ? 'Update Supplier' : 'Create Supplier'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setIsModalOpen(false); setForm(emptyForm); }}>
              Cancel
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Basic Info */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Basic Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Supplier Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Sun Pharma Distributors"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GSTIN</label>
                <input
                  type="text"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  placeholder="e.g. 33AAAAA1111A1Z1"
                  maxLength={15}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  value={form.contactPerson}
                  onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                  placeholder="Contact name"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="supplier@example.com"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Address</h4>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Street Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Street address, area"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">State</label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    placeholder="State"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pincode</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    placeholder="6-digit"
                    maxLength={6}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Financial</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Credit Days</label>
                <input
                  type="number"
                  value={form.creditDays}
                  onChange={(e) => setForm({ ...form, creditDays: e.target.value })}
                  placeholder="e.g. 30"
                  min="0"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={form.openingBalance}
                  onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any additional notes about this supplier..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Supplier"
        footer={
          <>
            <Button variant="danger" size="sm" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Yes, Delete
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-700">
          Are you sure you want to delete this supplier? This action cannot be undone.
          Suppliers with linked products or purchase orders cannot be deleted.
        </p>
      </Modal>
    </div>
  );
};

export default SuppliersTab;
