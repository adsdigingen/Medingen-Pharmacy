import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DataTable, Column } from '../common/DataTable';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';
import { EmptyState } from '../common/EmptyState';
import { useToast } from '../common/ToastProvider';
import { 
  FiPlus, FiEdit, FiTrash2, FiToggleLeft, FiToggleRight, FiTruck, 
  FiPhone, FiMail, FiMapPin, FiUser, FiCreditCard, FiFileText, 
  FiSearch, FiAlertCircle 
} from 'react-icons/fi';

interface SuppliersTabProps {
  suppliers: any[];
  fetchSuppliers: () => Promise<void>;
  API_BASE: string;
  onSupplierSaved?: (savedSupplier: any, mode: 'create' | 'edit') => void;
  onSupplierDeleted?: (supplierId: string) => void;
}

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

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

// Title Case formatter: capitalized words, lowercases the rest.
// Handles letters after hyphen, spaces, parenthesis, and ampersand.
const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(?:^|\s|\-|\(|&)\S/g, (match) => match.toUpperCase());
};

export const SuppliersTab: React.FC<SuppliersTabProps> = ({
  suppliers,
  fetchSuppliers,
  API_BASE,
  onSupplierSaved,
  onSupplierDeleted,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedSupplier, setSelectedSupplier] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Validation States
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Searchable Dropdown States for State Field
  const [stateSearch, setStateSearch] = useState('');
  const [isStateDropdownOpen, setIsStateDropdownOpen] = useState(false);
  const [stateHighlightIndex, setStateHighlightIndex] = useState(0);

  const stateDropdownRef = useRef<HTMLDivElement>(null);

  const { showToast } = useToast();

  // Input Field References for Navigation and Auto-Scrolling
  const fieldRefs = {
    name: useRef<HTMLInputElement>(null),
    gstin: useRef<HTMLInputElement>(null),
    contactPerson: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    address: useRef<HTMLInputElement>(null),
    city: useRef<HTMLInputElement>(null),
    state: useRef<HTMLInputElement>(null),
    pincode: useRef<HTMLInputElement>(null),
    creditDays: useRef<HTMLInputElement>(null),
    openingBalance: useRef<HTMLInputElement>(null),
    notes: useRef<HTMLTextAreaElement>(null),
  };

  // Metrics Stats
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status !== false).length;
    const inactive = total - active;
    const withGstin = suppliers.filter(s => s.gstin).length;
    return { total, active, inactive, withGstin };
  }, [suppliers]);

  // Real-Time Validation Function
  const validateField = (fieldName: string, value: string, currentForm: typeof emptyForm) => {
    let error = '';
    const nameTrim = value.trim();

    switch (fieldName) {
      case 'name': {
        if (!nameTrim) {
          error = 'Supplier Name is required.';
        } else if (nameTrim.length < 3) {
          error = 'Supplier Name must contain at least 3 characters.';
        } else if (nameTrim.length > 100) {
          error = 'Supplier Name must be at most 100 characters.';
        } else if (!/^[a-zA-Z0-9\s&.\-()]+$/.test(nameTrim)) {
          error = 'Supplier Name contains invalid characters.';
        } else {
          const isDuplicate = suppliers.some(
            s => s.name.toLowerCase().trim() === nameTrim.toLowerCase() && s.id !== selectedSupplier?.id
          );
          if (isDuplicate) {
            error = 'Supplier Name already exists.';
          }
        }
        break;
      }
      case 'gstin': {
        const gstinTrim = value.trim().toUpperCase();
        if (gstinTrim) {
          if (gstinTrim.length !== 15) {
            error = 'Enter a valid GSTIN (must be exactly 15 characters).';
          } else if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{3}$/.test(gstinTrim)) {
            error = 'Enter a valid GSTIN.';
          } else {
            const isDuplicate = suppliers.some(
              s => s.gstin && s.gstin.toUpperCase() === gstinTrim && s.id !== selectedSupplier?.id
            );
            if (isDuplicate) {
              error = 'GSTIN already exists.';
            }
          }
        }
        break;
      }
      case 'contactPerson': {
        const cpTrim = value.trim();
        if (cpTrim) {
          if (cpTrim.length < 2) {
            error = 'Enter a valid contact person name.';
          } else if (cpTrim.length > 50) {
            error = 'Contact Person must be at most 50 characters.';
          } else if (!/^[a-zA-Z\s]+$/.test(cpTrim)) {
            error = 'Enter a valid contact person name.';
          }
        }
        break;
      }
      case 'phone': {
        const phoneTrim = value.trim().replace(/[^0-9]/g, '');
        if (!phoneTrim) {
          error = 'Phone number is required.';
        } else if (phoneTrim.length !== 10 || !/^[6-9][0-9]{9}$/.test(phoneTrim)) {
          error = 'Enter a valid 10-digit mobile number.';
        } else {
          const isDuplicate = suppliers.some(
            s => s.phone === phoneTrim && s.id !== selectedSupplier?.id
          );
          if (isDuplicate) {
            error = 'Phone number already exists.';
          }
        }
        break;
      }
      case 'email': {
        const emailTrim = value.trim();
        if (emailTrim) {
          if (emailTrim.length > 100) {
            error = 'Email must be at most 100 characters.';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
            error = 'Enter a valid email address.';
          }
        }
        break;
      }
      case 'address': {
        if (value && value.length > 255) {
          error = 'Street Address must be at most 255 characters.';
        }
        break;
      }
      case 'city': {
        const cityTrim = value.trim();
        if (!cityTrim) {
          error = 'City is required.';
        } else if (cityTrim.length < 2) {
          error = 'City must be at least 2 characters.';
        } else if (cityTrim.length > 50) {
          error = 'City must be at most 50 characters.';
        } else if (!/^[a-zA-Z\s]+$/.test(cityTrim)) {
          error = 'City must contain letters and spaces only.';
        }
        break;
      }
      case 'state': {
        if (!value.trim()) {
          error = 'Please select a state.';
        }
        break;
      }
      case 'pincode': {
        const pinTrim = value.trim().replace(/[^0-9]/g, '');
        if (!pinTrim) {
          error = 'Pincode is required.';
        } else if (pinTrim.length !== 6 || !/^[0-9]{6}$/.test(pinTrim)) {
          error = 'Enter a valid 6-digit pincode.';
        }
        break;
      }
      case 'creditDays': {
        if (value) {
          const days = parseInt(value, 10);
          if (isNaN(days) || !/^\d+$/.test(value) || days < 0 || days > 365) {
            error = 'Credit Days must be between 0 and 365.';
          }
        }
        break;
      }
      case 'openingBalance': {
        if (value) {
          const bal = parseFloat(value);
          if (isNaN(bal) || bal < 0) {
            error = 'Opening Balance cannot be negative.';
          } else if (bal > 999999999.99) {
            error = 'Opening Balance cannot exceed 99,99,99,999.99.';
          } else if (!/^\d+(\.\d{1,2})?$/.test(value)) {
            error = 'Opening Balance must have at most 2 decimal places.';
          }
        }
        break;
      }
      case 'notes': {
        if (value && value.length > 500) {
          error = 'Notes must be at most 500 characters.';
        }
        break;
      }
      default:
        break;
    }
    return error;
  };

  // Run full validation across all fields
  const validateAllFields = () => {
    const fieldsOrder: (keyof typeof emptyForm)[] = [
      'name', 'gstin', 'contactPerson', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'creditDays', 'openingBalance', 'notes'
    ];
    const newErrors: Record<string, string> = {};
    fieldsOrder.forEach(f => {
      const err = validateField(f, form[f], form);
      if (err) {
        newErrors[f] = err;
      }
    });
    return newErrors;
  };

  // Form Validity check (for Save button state)
  const isFormValid = useMemo(() => {
    // Required fields cannot be empty
    if (!form.name.trim() || !form.phone.trim() || !form.city.trim() || !form.state.trim() || !form.pincode.trim()) {
      return false;
    }

    // Checking if errors state has any active errors
    if (Object.values(errors).some(err => err !== '')) {
      return false;
    }

    // Checking critical validations to make sure they pass
    const nameErr = validateField('name', form.name, form);
    const phoneErr = validateField('phone', form.phone, form);
    const cityErr = validateField('city', form.city, form);
    const stateErr = validateField('state', form.state, form);
    const pincodeErr = validateField('pincode', form.pincode, form);
    
    if (nameErr || phoneErr || cityErr || stateErr || pincodeErr) {
      return false;
    }

    // Checking optional fields validity
    if (form.gstin && validateField('gstin', form.gstin, form)) return false;
    if (form.contactPerson && validateField('contactPerson', form.contactPerson, form)) return false;
    if (form.email && validateField('email', form.email, form)) return false;
    if (form.creditDays && validateField('creditDays', form.creditDays, form)) return false;
    if (form.openingBalance && validateField('openingBalance', form.openingBalance, form)) return false;

    return true;
  }, [form, errors, suppliers, selectedSupplier]);

  // Input Event Handler
  const handleInputChange = (field: keyof typeof emptyForm, value: string) => {
    let formattedValue = value;

    // Formatting rules dynamically as typing
    if (field === 'name') {
      formattedValue = value.replace(/\s{2,}/g, ' ');
    } else if (field === 'gstin') {
      formattedValue = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    } else if (field === 'contactPerson') {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ');
    } else if (field === 'phone') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    } else if (field === 'email') {
      formattedValue = value.replace(/\s/g, '');
    } else if (field === 'city') {
      formattedValue = value.replace(/[^a-zA-Z\s]/g, '').replace(/\s{2,}/g, ' ');
    } else if (field === 'pincode') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 6);
    } else if (field === 'creditDays') {
      formattedValue = value.replace(/[^0-9]/g, '').slice(0, 3);
    } else if (field === 'openingBalance') {
      formattedValue = value.replace(/[^0-9.]/g, '');
      const dotIndex = formattedValue.indexOf('.');
      if (dotIndex !== -1) {
        const beforeDot = formattedValue.slice(0, dotIndex);
        const afterDot = formattedValue.slice(dotIndex + 1).replace(/\./g, '').slice(0, 2);
        formattedValue = `${beforeDot}.${afterDot}`;
      }
    }

    const newForm = { ...form, [field]: formattedValue };
    setForm(newForm);

    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formattedValue, newForm);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // Blur Handler
  const handleBlur = (field: keyof typeof emptyForm) => {
    let formattedValue = form[field];

    if (field === 'name' || field === 'contactPerson' || field === 'city') {
      formattedValue = toTitleCase(form[field].trim());
    } else {
      formattedValue = form[field].trim();
    }

    const updatedForm = { ...form, [field]: formattedValue };
    setForm(updatedForm);

    setTouched(prev => ({ ...prev, [field]: true }));
    const error = validateField(field, formattedValue, updatedForm);
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  // CSS Border Highlighting helper
  const getFieldClass = (field: keyof typeof emptyForm) => {
    const isReq = ['name', 'phone', 'city', 'state', 'pincode'].includes(field);
    const val = form[field];
    const hasError = errors[field];
    const isTouched = touched[field];

    if (isTouched) {
      if (hasError) {
        return 'border-rose-500 focus:border-rose-500 focus:ring-rose-500';
      }
      if (isReq || val !== '') {
        return 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500';
      }
    }
    return 'border-gray-200 focus:border-primary focus:ring-primary';
  };

  // Keyboard navigation: Enter moves focus to next field
  const handleKeyDownNext = (e: React.KeyboardEvent<HTMLElement>, currentField: keyof typeof fieldRefs) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const fieldsOrder: (keyof typeof fieldRefs)[] = [
        'name', 'gstin', 'contactPerson', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'creditDays', 'openingBalance', 'notes'
      ];
      const currentIndex = fieldsOrder.indexOf(currentField);
      if (currentIndex !== -1 && currentIndex < fieldsOrder.length - 1) {
        const nextField = fieldsOrder[currentIndex + 1];
        const nextRef = fieldRefs[nextField];
        if (nextRef && nextRef.current) {
          nextRef.current.focus();
        }
      }
    }
  };

  // Auto Scroll & Focus to first error
  const scrollToFirstError = (newErrors: Record<string, string>) => {
    const fieldsOrder: (keyof typeof fieldRefs)[] = [
      'name', 'gstin', 'contactPerson', 'phone', 'email', 'address', 'city', 'state', 'pincode', 'creditDays', 'openingBalance', 'notes'
    ];
    for (const f of fieldsOrder) {
      if (newErrors[f]) {
        const ref = fieldRefs[f];
        if (ref && ref.current) {
          ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
          ref.current.focus();
          break;
        }
      }
    }
  };

  // Modal State Effect
  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        fieldRefs.name.current?.focus();
      }, 150);
      setErrors({});
      setTouched({});
      setStateSearch(form.state || '');
    }
  }, [isModalOpen]);

  // Dropdown States selection & formatting
  const filteredStates = useMemo(() => {
    return INDIAN_STATES.filter(s =>
      s.toLowerCase().includes(stateSearch.toLowerCase())
    );
  }, [stateSearch]);

  const selectState = (stateName: string) => {
    const updatedForm = { ...form, state: stateName };
    setForm(updatedForm);
    setStateSearch(stateName);
    setIsStateDropdownOpen(false);
    setTouched(prev => ({ ...prev, state: true }));
    const error = validateField('state', stateName, updatedForm);
    setErrors(prev => ({ ...prev, state: error }));
    setTimeout(() => {
      fieldRefs.pincode.current?.focus();
    }, 50);
  };

  const handleStateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setStateSearch(value);
    setIsStateDropdownOpen(true);
    setStateHighlightIndex(0);
    
    const exactMatch = INDIAN_STATES.find(s => s.toLowerCase() === value.toLowerCase().trim());
    if (exactMatch) {
      setForm(prev => ({ ...prev, state: exactMatch }));
      setErrors(prev => ({ ...prev, state: '' }));
    } else {
      setForm(prev => ({ ...prev, state: '' }));
      setErrors(prev => ({ ...prev, state: 'Please select a state.' }));
    }
  };

  const handleStateInputFocus = () => {
    setIsStateDropdownOpen(true);
    setStateSearch(form.state);
  };

  const handleStateInputBlur = () => {
    setTimeout(() => {
      setIsStateDropdownOpen(false);
      const match = INDIAN_STATES.find(s => s.toLowerCase() === form.state.toLowerCase());
      if (!match) {
        const updatedForm = { ...form, state: '' };
        setForm(updatedForm);
        setStateSearch('');
        setErrors(prev => ({ ...prev, state: 'Please select a state.' }));
      } else {
        setStateSearch(match);
      }
      setTouched(prev => ({ ...prev, state: true }));
    }, 200);
  };

  const handleStateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isStateDropdownOpen) {
      if (e.key === 'ArrowDown') {
        setIsStateDropdownOpen(true);
        e.preventDefault();
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStateHighlightIndex(prev => (prev + 1) % Math.max(1, filteredStates.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStateHighlightIndex(prev => (prev - 1 + filteredStates.length) % Math.max(1, filteredStates.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStates.length > 0) {
        selectState(filteredStates[stateHighlightIndex]);
      } else {
        fieldRefs.pincode.current?.focus();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsStateDropdownOpen(false);
      setStateSearch(form.state);
    }
  };

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
    const newErrors = validateAllFields();

    // Check duplicates before submitting
    const nameTrim = form.name.trim().toLowerCase();
    const phoneTrim = form.phone.trim().replace(/[^0-9]/g, '');
    const gstinTrim = form.gstin.trim().toUpperCase();

    let duplicateField = '';
    const isDuplicate = suppliers.some(s => {
      if (s.id === selectedSupplier?.id) return false;
      if (s.name.toLowerCase().trim() === nameTrim) {
        duplicateField = 'name';
        return true;
      }
      if (phoneTrim && s.phone === phoneTrim) {
        duplicateField = 'phone';
        return true;
      }
      if (gstinTrim && s.gstin && s.gstin.toUpperCase() === gstinTrim) {
        duplicateField = 'gstin';
        return true;
      }
      return false;
    });

    if (isDuplicate) {
      showToast('This supplier already exists.', 'error');
      if (duplicateField === 'name') {
        newErrors.name = 'Supplier Name already exists.';
      } else if (duplicateField === 'phone') {
        newErrors.phone = 'Phone number already exists.';
      } else if (duplicateField === 'gstin') {
        newErrors.gstin = 'GSTIN already exists.';
      }
    }

    if (Object.keys(newErrors).length > 0 || isDuplicate) {
      const allTouched: Record<string, boolean> = {};
      Object.keys(form).forEach(k => {
        allTouched[k] = true;
      });
      setTouched(allTouched);
      setErrors(newErrors);
      scrollToFirstError(newErrors);
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
        openingBalance: form.openingBalance ? parseFloat(form.openingBalance) : 0.0,
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

      const envelope = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(envelope.message || `Failed to ${isEditing ? 'update' : 'create'} supplier`);
      }
      const saved = envelope.data || envelope;

      showToast(
        isEditing ? 'Supplier updated successfully.' : 'Supplier added successfully.',
        'success'
      );

      setIsModalOpen(false);
      setForm(emptyForm);
      setSelectedSupplier(null);
      if (onSupplierSaved) {
        onSupplierSaved(saved, isEditing ? 'edit' : 'create');
      } else {
        await fetchSuppliers();
      }
    } catch (err: any) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Toggle status
  const handleToggle = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/suppliers/${id}/toggle`, { method: 'PATCH' });
      if (res.ok) {
        const envelope = await res.json().catch(() => ({}));
        const updated = envelope.data || envelope;
        showToast('Supplier status updated.', 'success');
        if (onSupplierSaved) {
          onSupplierSaved(updated, 'edit');
        } else {
          await fetchSuppliers();
        }
      }
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
        showToast('Supplier deleted successfully.', 'success');
        if (onSupplierDeleted) {
          onSupplierDeleted(id);
        } else {
          await fetchSuppliers();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        showToast(errData.message || 'Cannot delete supplier — linked records exist.', 'error');
      }
    } catch (err) {
      showToast('Delete failed', 'error');
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
          { label: 'Total Suppliers', value: stats.total, color: 'text-gray-800' },
          { label: 'Active', value: stats.active, color: 'text-emerald-450' },
          { label: 'Inactive', value: stats.inactive, color: 'text-rose-455' },
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
            <Button 
              variant="primary" 
              size="sm" 
              onClick={handleSave} 
              disabled={saving || !isFormValid}
              className="cursor-pointer font-bold"
            >
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
                  ref={fieldRefs.name}
                  value={form.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  onBlur={() => handleBlur('name')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'name')}
                  placeholder="e.g. Sun Pharma Distributors"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('name')}`}
                />
                {touched.name && errors.name && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">GSTIN</label>
                <input
                  type="text"
                  ref={fieldRefs.gstin}
                  value={form.gstin}
                  onChange={(e) => handleInputChange('gstin', e.target.value)}
                  onBlur={() => handleBlur('gstin')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'gstin')}
                  placeholder="e.g. 33AAAAA1111A1Z1"
                  maxLength={15}
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs font-mono focus:ring-1 outline-none font-semibold ${getFieldClass('gstin')}`}
                />
                {touched.gstin && errors.gstin && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.gstin}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contact Person</label>
                <input
                  type="text"
                  ref={fieldRefs.contactPerson}
                  value={form.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  onBlur={() => handleBlur('contactPerson')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'contactPerson')}
                  placeholder="Contact name"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('contactPerson')}`}
                />
                {touched.contactPerson && errors.contactPerson && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.contactPerson}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Contact Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Phone *</label>
                <input
                  type="text"
                  ref={fieldRefs.phone}
                  value={form.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  onBlur={() => handleBlur('phone')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'phone')}
                  placeholder="10-digit mobile"
                  maxLength={10}
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('phone')}`}
                />
                {touched.phone && errors.phone && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.phone}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  ref={fieldRefs.email}
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'email')}
                  placeholder="supplier@example.com"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('email')}`}
                />
                {touched.email && errors.email && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.email}
                  </p>
                )}
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
                  ref={fieldRefs.address}
                  value={form.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  onBlur={() => handleBlur('address')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'address')}
                  placeholder="Street address, area"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('address')}`}
                />
                {touched.address && errors.address && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.address}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">City *</label>
                  <input
                    type="text"
                    ref={fieldRefs.city}
                    value={form.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    onBlur={() => handleBlur('city')}
                    onKeyDown={(e) => handleKeyDownNext(e, 'city')}
                    placeholder="City"
                    disabled={saving}
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('city')}`}
                  />
                  {touched.city && errors.city && (
                    <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                      <FiAlertCircle size={10} /> {errors.city}
                    </p>
                  )}
                </div>

                {/* Searchable State Dropdown */}
                <div className="relative" ref={stateDropdownRef}>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">State *</label>
                  <div className="relative">
                    <input
                      type="text"
                      ref={fieldRefs.state}
                      value={isStateDropdownOpen ? stateSearch : form.state}
                      onChange={handleStateInputChange}
                      onFocus={handleStateInputFocus}
                      onBlur={handleStateInputBlur}
                      onKeyDown={handleStateKeyDown}
                      placeholder="Search state..."
                      disabled={saving}
                      className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('state')}`}
                    />
                    <span className="absolute right-2.5 top-3 text-[9px] text-gray-400 pointer-events-none">▼</span>
                  </div>
                  {isStateDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-xl z-50 text-xs">
                      {filteredStates.length === 0 ? (
                        <div className="p-2 text-gray-450 text-center font-bold">No states match</div>
                      ) : (
                        filteredStates.map((st, idx) => (
                          <div
                            key={st}
                            onMouseDown={() => selectState(st)}
                            className={`p-2 cursor-pointer transition-colors font-semibold ${
                              idx === stateHighlightIndex 
                                ? 'bg-primary-light text-primary font-bold' 
                                : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {st}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  {touched.state && errors.state && (
                    <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                      <FiAlertCircle size={10} /> {errors.state}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Pincode *</label>
                  <input
                    type="text"
                    ref={fieldRefs.pincode}
                    value={form.pincode}
                    onChange={(e) => handleInputChange('pincode', e.target.value)}
                    onBlur={() => handleBlur('pincode')}
                    onKeyDown={(e) => handleKeyDownNext(e, 'pincode')}
                    placeholder="6-digit"
                    maxLength={6}
                    disabled={saving}
                    className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('pincode')}`}
                  />
                  {touched.pincode && errors.pincode && (
                    <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                      <FiAlertCircle size={10} /> {errors.pincode}
                    </p>
                  )}
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
                  type="text"
                  ref={fieldRefs.creditDays}
                  value={form.creditDays}
                  onChange={(e) => handleInputChange('creditDays', e.target.value)}
                  onBlur={() => handleBlur('creditDays')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'creditDays')}
                  placeholder="e.g. 30"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('creditDays')}`}
                />
                {touched.creditDays && errors.creditDays && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.creditDays}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Opening Balance (₹)</label>
                <input
                  type="text"
                  ref={fieldRefs.openingBalance}
                  value={form.openingBalance}
                  onChange={(e) => handleInputChange('openingBalance', e.target.value)}
                  onBlur={() => handleBlur('openingBalance')}
                  onKeyDown={(e) => handleKeyDownNext(e, 'openingBalance')}
                  placeholder="0.00"
                  disabled={saving}
                  className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none font-semibold ${getFieldClass('openingBalance')}`}
                />
                {touched.openingBalance && errors.openingBalance && (
                  <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                    <FiAlertCircle size={10} /> {errors.openingBalance}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-[10px] font-bold text-gray-500 uppercase">Notes</label>
              <span className="text-[10px] text-gray-400 font-mono">
                {form.notes.length} / 500
              </span>
            </div>
            <textarea
              rows={2}
              ref={fieldRefs.notes}
              value={form.notes}
              onChange={(e) => handleInputChange('notes', e.target.value.slice(0, 500))}
              onBlur={() => handleBlur('notes')}
              placeholder="Any additional notes about this supplier..."
              disabled={saving}
              className={`w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-700 text-xs focus:ring-1 outline-none resize-none font-semibold ${getFieldClass('notes')}`}
            />
            {touched.notes && errors.notes && (
              <p className="mt-1 text-[10px] text-rose-500 font-bold flex items-center gap-1">
                <FiAlertCircle size={10} /> {errors.notes}
              </p>
            )}
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
