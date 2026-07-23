import React, { useState, useMemo, useEffect } from 'react';
import * as xlsx from 'xlsx';
import { ProductImportWizard } from './ProductImportWizard';
import { DataTable, Column } from '../common/DataTable';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { 
  FiPlus, FiTrash2, FiEye, FiDatabase, FiShoppingCart, FiEdit, 
  FiCheckCircle, FiFileText, FiRefreshCw, FiCopy, FiDownload, FiUpload 
} from 'react-icons/fi';

interface ProductsTabProps {
  products: any[];
  productPage: number;
  setProductPage: (page: number) => void;
  productLimit: number;
  setProductLimit: (limit: number) => void;
  productTotal: number;
  productSearch: string;
  setProductSearch: (search: string) => void;

  inventories: any[];
  batches: any[];
  purchaseOrders: any[];
  invoices: any[];
  allCategories: any[];
  allManufacturers: any[];
  allSuppliers: any[];
  fetchProducts: () => Promise<void>;
  API_BASE: string;
  setActiveTab: (tab: any) => void;
  setInventorySubTab: (tab: 'stock' | 'batches' | 'ledger' | 'adjustments') => void;
  setLedgerProductFilter: (productId: string) => void;
  currentUser: any;
  productDrugScheduleFilter: string;
  setProductDrugScheduleFilter: (val: string) => void;
  productMedicineClassificationFilter: string;
  setProductMedicineClassificationFilter: (val: string) => void;
  productPrescriptionRequiredFilter: string;
  setProductPrescriptionRequiredFilter: (val: string) => void;
  productControlledDrugFilter: string;
  setProductControlledDrugFilter: (val: string) => void;
  onProductSaved?: (savedProduct: any, mode: 'create' | 'edit') => void;
  onProductDeleted?: (productId: string) => void;
}

export const ProductsTab: React.FC<ProductsTabProps> = ({
  products,
  productPage,
  setProductPage,
  productLimit,
  setProductLimit,
  productTotal,
  productSearch,
  setProductSearch,
  inventories,
  batches,
  purchaseOrders,
  invoices,
  allCategories,
  allManufacturers,
  allSuppliers,
  fetchProducts,
  API_BASE,
  setActiveTab,
  setInventorySubTab,
  setLedgerProductFilter,
  currentUser,
  productDrugScheduleFilter,
  setProductDrugScheduleFilter,
  productMedicineClassificationFilter,
  setProductMedicineClassificationFilter,
  productPrescriptionRequiredFilter,
  setProductPrescriptionRequiredFilter,
  productControlledDrugFilter,
  setProductControlledDrugFilter,
  onProductSaved,
  onProductDeleted,
}) => {
  // Modes: 'list' | 'create' | 'edit' | 'detail'
  const [viewMode, setViewMode] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // System settings default state
  const [pricingDefaults, setPricingDefaults] = useState({
    defaultOfflineMarkup: 50,
    defaultOnlineMarkup: 85,
    defaultGst: 12,
    defaultRetailDiscount: 0,
  });

  useEffect(() => {
    fetch(`${API_BASE}/system-settings`)
      .then(res => res.ok ? res.json() : null)
      .then(settings => {
        if (settings) {
          setPricingDefaults({
            defaultOfflineMarkup: settings.defaultOfflineMarkup ?? 50,
            defaultOnlineMarkup: settings.defaultOnlineMarkup ?? 85,
            defaultGst: settings.defaultGst ?? 12,
            defaultRetailDiscount: settings.defaultRetailDiscount ?? 0,
          });
        }
      })
      .catch(() => {});
  }, [API_BASE]);

  // Form State
  const [formProduct, setFormProduct] = useState({
    name: '',
    genericName: '',
    brandName: '',
    medicineType: 'Tablet',
    categoryId: '',
    manufacturerId: '',
    supplierId: '',
    description: '',
    sku: '',
    barcode: '',
    hsnCode: '',
    gstPercentage: 12,
    rackLocation: '',
    purchasePrice: 0,
    sellingPrice: 0,
    mrp: 0,
    discountPercentage: 0,
    minStockLevel: 10,
    maximumStock: 1000,
    reorderLevel: 20,
    defaultUnit: 'Strip',
    packSize: '10s',
    status: true,
    drugSchedule: 'OTC',
    medicineClassification: 'Other',
    prescriptionRequired: false,
    coldChainRequired: false,
    controlledDrug: false,
    highValueMedicine: false,
    storageCondition: 'Room Temperature',
    // New Pricing Fields
    offlineMarkup: 50,
    offlineSellingPrice: 0,
    offlineAutoCalculate: true,
    onlineMarkup: 85,
    onlineSellingPrice: 0,
    onlineAutoCalculate: true,
    wholesalePrice: 0,
    hospitalPrice: 0,
    memberPrice: 0,
    specialOfferPrice: 0,
    retailDiscount: 0,
    roundOff: true,
  });

  const isPharmacist = currentUser?.role === 'PHARMACIST';
  const isStoreManager = currentUser?.role === 'STORE_MANAGER';
  const isAdmin = currentUser?.role === 'ADMIN';

  const renderScheduleBadge = (schedule: string) => {
    if (!schedule) return null;
    let label = schedule;
    let dot = '⚪';
    let badgeClass = 'bg-slate-500/10 text-muted border border-slate-500/20';
    
    switch(schedule) {
      case 'OTC':
        dot = '🟢';
        badgeClass = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        break;
      case 'Schedule G':
        dot = '🔵';
        badgeClass = 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
        break;
      case 'Schedule H':
        dot = '🟠';
        label = 'H';
        badgeClass = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
        break;
      case 'Schedule H1':
        dot = '🔴';
        label = 'H1';
        badgeClass = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
        break;
      case 'Schedule X':
        dot = '🟣';
        label = 'X';
        badgeClass = 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
        break;
      case 'NDPS':
      case 'NDPS / Narcotic':
        dot = '🔴';
        label = 'NDPS';
        badgeClass = 'bg-red-950/40 text-red-500 border border-red-500/30';
        break;
      case 'Medical Device':
        dot = '⚪';
        label = 'Medical Device';
        badgeClass = 'bg-slate-500/10 text-muted border border-slate-500/20';
        break;
      default:
        dot = '⚪';
        badgeClass = 'bg-slate-500/10 text-muted border border-slate-500/20';
    }
    
    return (
      <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ml-2 select-none uppercase tracking-wide leading-none ${badgeClass}`}>
        <span className="text-[7px] leading-none">{dot}</span>
        {label}
      </span>
    );
  };

  const getScheduleRegulatoryNotice = (schedule: string) => {
    switch(schedule) {
      case 'Schedule H':
        return {
          text: '⚠️ Prescription Required',
          color: 'text-amber-400 font-bold',
        };
      case 'Schedule H1':
        return {
          text: '🔴 Register maintenance required | Prescription mandatory',
          color: 'text-rose-400 font-bold',
        };
      case 'Schedule X':
        return {
          text: '🔴 Controlled Medicine | Strict dispensing regulations apply',
          color: 'text-purple-400 font-bold',
        };
      case 'NDPS':
      case 'NDPS / Narcotic':
        return {
          text: '🚨 Narcotic Drug | Authorized pharmacist only',
          color: 'text-red-500 font-extrabold',
        };
      case 'OTC':
        return {
          text: '🟢 Can be sold without prescription',
          color: 'text-emerald-400 font-bold',
        };
      default:
        return null;
    }
  };

  const handleDrugScheduleChange = (schedule: string) => {
    let prescriptionRequired = formProduct.prescriptionRequired;
    let controlledDrug = formProduct.controlledDrug;
    
    if (['Schedule H', 'Schedule H1', 'Schedule X', 'NDPS', 'NDPS / Narcotic'].includes(schedule)) {
      prescriptionRequired = true;
    } else if (['OTC', 'Medical Device', 'Surgical Item'].includes(schedule)) {
      prescriptionRequired = false;
    }
    
    if (['Schedule H1', 'Schedule X', 'NDPS', 'NDPS / Narcotic'].includes(schedule)) {
      controlledDrug = true;
    }
    
    setFormProduct(prev => ({
      ...prev,
      drugSchedule: schedule,
      prescriptionRequired,
      controlledDrug,
    }));
  };

  // Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Dynamic ledger for details view
  const [detailTab, setDetailTab] = useState<'info' | 'batches' | 'ledger' | 'purchases' | 'sales' | 'audit'>('info');
  const [productLedger, setProductLedger] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Sub-modal for individual Batch activities
  const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
  const [batchLedger, setBatchLedger] = useState<any[]>([]);

  // Fetch product ledger when details drawer tab shifts
  useEffect(() => {
    if (!selectedProduct) return;
    if (detailTab === 'ledger') {
      setLedgerLoading(true);
      fetch(`${API_BASE}/inventory/ledger?limit=100&productId=${selectedProduct.id}`)
        .then(res => res.ok ? res.json() : { data: [] })
        .then(envelope => setProductLedger(envelope.data || []))
        .catch(() => {})
        .finally(() => setLedgerLoading(false));
    }
  }, [selectedProduct, detailTab, API_BASE]);

  // Serializer/Parser helpers for Description JSON metadata injection
  const serializeDescription = (text: string, meta: { maxStock: number; reorderLevel: number; defaultUnit: string; packSize: string }) => {
    return JSON.stringify({
      text,
      maxStock: meta.maxStock,
      reorderLevel: meta.reorderLevel,
      defaultUnit: meta.defaultUnit,
      packSize: meta.packSize,
    });
  };

  const parseDescriptionField = (descStr: string) => {
    try {
      const parsed = JSON.parse(descStr);
      if (parsed && typeof parsed === 'object' && 'text' in parsed) {
        return {
          description: parsed.text || '',
          maximumStock: parsed.maxStock || 1000,
          reorderLevel: parsed.reorderLevel || 20,
          defaultUnit: parsed.defaultUnit || 'Strip',
          packSize: parsed.packSize || '10s',
        };
      }
    } catch (e) {}
    return {
      description: descStr || '',
      maximumStock: 1000,
      reorderLevel: 20,
      defaultUnit: 'Strip',
      packSize: '10s',
    };
  };

  // Helper selectors
  const getProductInventory = (productId: string) => {
    return inventories.find(inv => inv.productId === productId) || {
      availableQty: 0,
      reservedQty: 0,
      damagedQty: 0,
      expiredQty: 0,
    };
  };

  const getProductBatchInfo = (productId: string) => {
    const prodBatches = batches.filter(b => b.productId === productId);
    const now = new Date();
    const ninetyDays = new Date();
    ninetyDays.setDate(now.getDate() + 90);

    let hasExpired = false;
    let hasNearExpiry = false;

    prodBatches.forEach(b => {
      const exp = new Date(b.expiryDate);
      if (exp < now) hasExpired = true;
      else if (exp <= ninetyDays) hasNearExpiry = true;
    });

    return {
      count: prodBatches.length,
      hasExpired,
      hasNearExpiry,
      batchesList: prodBatches,
    };
  };

  // Dynamically calculate profit margin percent for offline, online, and advanced tiers
  const marginSummary = useMemo(() => {
    const cost = parseFloat(formProduct.purchasePrice as any) || 0;

    const offlineSell = parseFloat(formProduct.offlineSellingPrice as any) || 0;
    const offlineDiff = offlineSell - cost;
    const offlineMargin = offlineSell > 0 ? parseFloat(((offlineDiff / offlineSell) * 100).toFixed(2)) : 0;

    const onlineSell = parseFloat(formProduct.onlineSellingPrice as any) || 0;
    const onlineDiff = onlineSell - cost;
    const onlineMargin = onlineSell > 0 ? parseFloat(((onlineDiff / onlineSell) * 100).toFixed(2)) : 0;

    const wholesaleSell = parseFloat(formProduct.wholesalePrice as any) || 0;
    const wholesaleDiff = wholesaleSell - cost;
    const wholesaleMargin = wholesaleSell > 0 ? parseFloat(((wholesaleDiff / wholesaleSell) * 100).toFixed(2)) : 0;

    const hospitalSell = parseFloat(formProduct.hospitalPrice as any) || 0;
    const hospitalDiff = hospitalSell - cost;
    const hospitalMargin = hospitalSell > 0 ? parseFloat(((hospitalDiff / hospitalSell) * 100).toFixed(2)) : 0;

    const memberSell = parseFloat(formProduct.memberPrice as any) || 0;
    const memberDiff = memberSell - cost;
    const memberMargin = memberSell > 0 ? parseFloat(((memberDiff / memberSell) * 100).toFixed(2)) : 0;

    const specialSell = parseFloat(formProduct.specialOfferPrice as any) || 0;
    const specialDiff = specialSell - cost;
    const specialMargin = specialSell > 0 ? parseFloat(((specialDiff / specialSell) * 100).toFixed(2)) : 0;

    return {
      offline: { absolute: offlineDiff, percentage: offlineMargin },
      online: { absolute: onlineDiff, percentage: onlineMargin },
      wholesale: { absolute: wholesaleDiff, percentage: wholesaleMargin },
      hospital: { absolute: hospitalDiff, percentage: hospitalMargin },
      member: { absolute: memberDiff, percentage: memberMargin },
      special: { absolute: specialDiff, percentage: specialMargin },
    };
  }, [
    formProduct.purchasePrice,
    formProduct.offlineSellingPrice,
    formProduct.onlineSellingPrice,
    formProduct.wholesalePrice,
    formProduct.hospitalPrice,
    formProduct.memberPrice,
    formProduct.specialOfferPrice
  ]);

  // Real-time auto-calculation of channel selling prices when markup or cost changes
  useEffect(() => {
    const cost = parseFloat(formProduct.purchasePrice as any) || 0;
    const mrpVal = parseFloat(formProduct.mrp as any) || 0;
    const offMarkup = parseFloat(formProduct.offlineMarkup as any) || 0;
    const onMarkup = parseFloat(formProduct.onlineMarkup as any) || 0;
    
    let updated = false;
    const nextState = { ...formProduct };

    if (formProduct.offlineAutoCalculate) {
      const computedOffline = cost * (1 + offMarkup / 100);
      let roundedOffline = formProduct.roundOff ? Math.round(computedOffline) : parseFloat(computedOffline.toFixed(2));
      if (roundedOffline > mrpVal && mrpVal > 0) {
        roundedOffline = mrpVal;
      }
      if (roundedOffline !== formProduct.offlineSellingPrice) {
        nextState.offlineSellingPrice = roundedOffline;
        nextState.sellingPrice = roundedOffline; // Sync base sellingPrice
        updated = true;
      }
    }

    if (formProduct.onlineAutoCalculate) {
      const computedOnline = cost * (1 + onMarkup / 100);
      let roundedOnline = formProduct.roundOff ? Math.round(computedOnline) : parseFloat(computedOnline.toFixed(2));
      if (roundedOnline > mrpVal && mrpVal > 0) {
        roundedOnline = mrpVal;
      }
      if (roundedOnline !== formProduct.onlineSellingPrice) {
        nextState.onlineSellingPrice = roundedOnline;
        updated = true;
      }
    }

    if (updated) {
      setFormProduct(nextState);
    }
  }, [
    formProduct.purchasePrice,
    formProduct.mrp,
    formProduct.offlineMarkup,
    formProduct.offlineAutoCalculate,
    formProduct.onlineMarkup,
    formProduct.onlineAutoCalculate,
    formProduct.roundOff,
  ]);

  // General Create / Update triggers
  const handleOpenCreateMode = () => {
    setFormProduct({
      name: '',
      genericName: '',
      brandName: '',
      medicineType: 'Tablet',
      categoryId: allCategories.length > 0 ? allCategories[0].id : '',
      manufacturerId: allManufacturers.length > 0 ? allManufacturers[0].id : '',
      supplierId: allSuppliers.length > 0 ? allSuppliers[0].id : '',
      description: '',
      sku: '',
      barcode: '',
      hsnCode: '',
      gstPercentage: pricingDefaults.defaultGst,
      rackLocation: '',
      purchasePrice: 0,
      sellingPrice: 0,
      mrp: 0,
      discountPercentage: 0,
      minStockLevel: 10,
      maximumStock: 1000,
      reorderLevel: 20,
      defaultUnit: 'Strip',
      packSize: '10s',
      status: true,
      drugSchedule: 'OTC',
      medicineClassification: 'Other',
      prescriptionRequired: false,
      coldChainRequired: false,
      controlledDrug: false,
      highValueMedicine: false,
      storageCondition: 'Room Temperature',
      // New Pricing Fields
      offlineMarkup: pricingDefaults.defaultOfflineMarkup,
      offlineSellingPrice: 0,
      offlineAutoCalculate: true,
      onlineMarkup: pricingDefaults.defaultOnlineMarkup,
      onlineSellingPrice: 0,
      onlineAutoCalculate: true,
      wholesalePrice: 0,
      hospitalPrice: 0,
      memberPrice: 0,
      specialOfferPrice: 0,
      retailDiscount: pricingDefaults.defaultRetailDiscount,
      roundOff: true,
    });
    setViewMode('create');
  };

  const handleOpenEditMode = (prod: any) => {
    const meta = parseDescriptionField(prod.description);
    setFormProduct({
      name: prod.name,
      genericName: prod.genericName || '',
      brandName: prod.brandName || '',
      medicineType: prod.medicineType || 'Tablet',
      categoryId: prod.categoryId || '',
      manufacturerId: prod.manufacturerId || '',
      supplierId: prod.supplierId || '',
      description: meta.description,
      sku: prod.sku || '',
      barcode: prod.barcode || '',
      hsnCode: prod.hsnCode || '',
      gstPercentage: prod.gstPercentage || 12,
      rackLocation: prod.rackLocation || '',
      purchasePrice: prod.purchasePrice || 0,
      sellingPrice: prod.sellingPrice || 0,
      mrp: prod.mrp || 0,
      discountPercentage: prod.discountPercentage || 0,
      minStockLevel: prod.minStockLevel || 10,
      maximumStock: meta.maximumStock,
      reorderLevel: meta.reorderLevel,
      defaultUnit: meta.defaultUnit,
      packSize: meta.packSize,
      status: prod.status,
      drugSchedule: prod.drugSchedule || 'OTC',
      medicineClassification: prod.medicineClassification || 'Other',
      prescriptionRequired: !!prod.prescriptionRequired,
      coldChainRequired: !!prod.coldChainRequired,
      controlledDrug: !!prod.controlledDrug,
      highValueMedicine: !!prod.highValueMedicine,
      storageCondition: prod.storageCondition || 'Room Temperature',
      // New Pricing Fields
      offlineMarkup: prod.offlineMarkup !== undefined && prod.offlineMarkup !== null ? prod.offlineMarkup : pricingDefaults.defaultOfflineMarkup,
      offlineSellingPrice: prod.offlineSellingPrice || 0,
      offlineAutoCalculate: prod.offlineAutoCalculate !== undefined && prod.offlineAutoCalculate !== null ? !!prod.offlineAutoCalculate : true,
      onlineMarkup: prod.onlineMarkup !== undefined && prod.onlineMarkup !== null ? prod.onlineMarkup : pricingDefaults.defaultOnlineMarkup,
      onlineSellingPrice: prod.onlineSellingPrice || 0,
      onlineAutoCalculate: prod.onlineAutoCalculate !== undefined && prod.onlineAutoCalculate !== null ? !!prod.onlineAutoCalculate : true,
      wholesalePrice: prod.wholesalePrice || 0,
      hospitalPrice: prod.hospitalPrice || 0,
      memberPrice: prod.memberPrice || 0,
      specialOfferPrice: prod.specialOfferPrice || 0,
      retailDiscount: prod.retailDiscount !== undefined && prod.retailDiscount !== null ? prod.retailDiscount : pricingDefaults.defaultRetailDiscount,
      roundOff: prod.roundOff !== undefined && prod.roundOff !== null ? !!prod.roundOff : true,
    });
    setSelectedProduct(prod);
    setViewMode('edit');
  };

  const handleSaveProduct = async (e: React.FormEvent, saveAndNew: boolean = false) => {
    e.preventDefault();
    if (!formProduct.name.trim()) {
      alert("Product Name is required.");
      return;
    }

    const purchaseCost = parseFloat(formProduct.purchasePrice as any) || 0;
    const maxMrp = parseFloat(formProduct.mrp as any) || 0;
    const offlinePrice = parseFloat(formProduct.offlineSellingPrice as any) || 0;
    const onlinePrice = parseFloat(formProduct.onlineSellingPrice as any) || 0;

    if (offlinePrice < purchaseCost) {
      alert("Offline Selling Price cannot be lower than Purchase Cost.");
      return;
    }
    if (offlinePrice > maxMrp) {
      alert("Offline Selling Price cannot exceed MRP.");
      return;
    }
    if (onlinePrice < purchaseCost) {
      alert("Online Selling Price cannot be lower than Purchase Cost.");
      return;
    }
    if (onlinePrice > maxMrp) {
      alert("Online Selling Price cannot exceed MRP.");
      return;
    }

    try {
      const descSerialized = serializeDescription(formProduct.description, {
        maxStock: parseInt(formProduct.maximumStock as any, 10) || 1000,
        reorderLevel: parseInt(formProduct.reorderLevel as any, 10) || 20,
        defaultUnit: formProduct.defaultUnit,
        packSize: formProduct.packSize,
      });

      const payload = {
        name: formProduct.name.trim(),
        genericName: formProduct.genericName.trim() || null,
        brandName: formProduct.brandName.trim() || null,
        medicineType: formProduct.medicineType,
        categoryId: formProduct.categoryId || null,
        manufacturerId: formProduct.manufacturerId || null,
        supplierId: formProduct.supplierId || null,
        sku: formProduct.sku.trim() || null,
        barcode: formProduct.barcode.trim() || null,
        hsnCode: formProduct.hsnCode.trim() || null,
        gstPercentage: parseFloat(formProduct.gstPercentage as any) || 0,
        rackLocation: formProduct.rackLocation.trim() || null,
        purchasePrice: purchaseCost,
        sellingPrice: offlinePrice, // Synced to offlineSellingPrice for reports compatibility
        mrp: maxMrp,
        minStockLevel: parseInt(formProduct.minStockLevel as any, 10) || 0,
        description: descSerialized,
        status: formProduct.status,
        drugSchedule: formProduct.drugSchedule,
        medicineClassification: formProduct.medicineClassification,
        prescriptionRequired: formProduct.prescriptionRequired,
        coldChainRequired: formProduct.coldChainRequired,
        controlledDrug: formProduct.controlledDrug,
        highValueMedicine: formProduct.highValueMedicine,
        storageCondition: formProduct.storageCondition,
        // Multi-channel pricing payload
        offlineMarkup: parseFloat(formProduct.offlineMarkup as any) || 0,
        offlineSellingPrice: offlinePrice,
        offlineAutoCalculate: formProduct.offlineAutoCalculate,
        onlineMarkup: parseFloat(formProduct.onlineMarkup as any) || 0,
        onlineSellingPrice: onlinePrice,
        onlineAutoCalculate: formProduct.onlineAutoCalculate,
        wholesalePrice: parseFloat(formProduct.wholesalePrice as any) || 0,
        hospitalPrice: parseFloat(formProduct.hospitalPrice as any) || 0,
        memberPrice: parseFloat(formProduct.memberPrice as any) || 0,
        specialOfferPrice: parseFloat(formProduct.specialOfferPrice as any) || 0,
        retailDiscount: parseFloat(formProduct.retailDiscount as any) || 0,
        roundOff: formProduct.roundOff,
      };

      const url = viewMode === 'edit' ? `${API_BASE}/products/${selectedProduct.id}` : `${API_BASE}/products`;
      const method = viewMode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const envelope = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(envelope.message || "Failed to save product.");
      }
      const resData = envelope.data || envelope;

      alert("Product saved successfully!");
      if (onProductSaved) {
        onProductSaved(resData, viewMode === 'edit' ? 'edit' : 'create');
      } else {
        fetchProducts();
      }
      
      if (saveAndNew) {
        handleOpenCreateMode();
      } else {
        setViewMode('list');
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDuplicateProduct = () => {
    setViewMode('create');
    setSelectedProduct(null);
    setFormProduct(prev => ({
      ...prev,
      name: `${prev.name} (Copy)`,
      barcode: prev.barcode ? `${prev.barcode}-COPY` : '',
      sku: prev.sku ? `${prev.sku}-COPY` : '',
    }));
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    if (!confirm("Are you sure you want to soft delete this product master record?")) return;

    try {
      const res = await fetch(`${API_BASE}/products/${selectedProduct.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert("Product record soft-deleted.");
        if (onProductDeleted) {
          onProductDeleted(selectedProduct.id);
        } else {
          fetchProducts();
        }
        setViewMode('list');
      } else {
        throw new Error("Deletion failed.");
      }
    } catch (e: any) {
      alert(e.message);
    }
  };



  const handleDownloadTemplate = () => {
    const templateRows = [
      {
        'Medicine Name': 'Dolo 650mg Tablet',
        'Generic Name': 'Paracetamol',
        'Category': 'Tablet',
        'Manufacturer': 'Micro Labs',
        'Barcode': '8901020304050',
        'SKU': 'DOLO650',
        'HSN Code': '30049011',
        'GST Percentage': 12,
        'Rack Location': 'A-02',
        'Purchase Price': 22.50,
        'Selling Price': 26.80,
        'MRP': 30.00,
        'Minimum Stock': 100,
        'Status': 'Active',
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(templateRows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Import Template');

    // Excel direct binary output
    const buffer = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_import_template.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleClientExport = (format: 'CSV' | 'EXCEL') => {
    const rows = products.map(p => {
      const meta = parseDescriptionField(p.description);
      return {
        'Product Name': p.name,
        'Generic Name': p.genericName || '',
        'SKU': p.sku || '',
        'Barcode': p.barcode || '',
        'HSN': p.hsnCode || '',
        'GST %': p.gstPercentage,
        'Rack': p.rackLocation || '',
        'Cost (₹)': p.purchasePrice,
        'Sell (₹)': p.sellingPrice,
        'MRP (₹)': p.mrp,
        'Min Stock': p.minStockLevel,
        'Max Stock': meta.maximumStock,
        'Reorder Level': meta.reorderLevel,
        'Unit': meta.defaultUnit,
        'Pack Size': meta.packSize,
        'Status': p.status ? 'Active' : 'Inactive',
      };
    });

    const worksheet = xlsx.utils.json_to_sheet(rows);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Products Registry');

    if (format === 'EXCEL') {
      const buffer = xlsx.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } else {
      // CSV Export
      const csvContent = xlsx.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  };

  // Details selectors & lists
  const currentProductBatches = useMemo(() => {
    if (!selectedProduct) return [];
    return batches.filter(b => b.productId === selectedProduct.id);
  }, [selectedProduct, batches]);

  const productPurchases = useMemo(() => {
    if (!selectedProduct) return [];
    const list: any[] = [];
    purchaseOrders.forEach(po => {
      if (po.items) {
        po.items.forEach((it: any) => {
          if (it.productId === selectedProduct.id) {
            list.push({
              poNumber: po.poNumber,
              supplierName: po.supplier?.name || 'Unknown',
              invoiceNo: po.supplierInvoiceNumber || 'N/A',
              purchaseDate: po.purchaseDate || po.createdAt,
              quantity: it.quantity + (it.freeQuantity || 0),
              price: it.purchasePrice,
              totalAmount: it.totalAmount,
              status: po.status,
            });
          }
        });
      }
    });
    return list;
  }, [selectedProduct, purchaseOrders]);

  const productSales = useMemo(() => {
    if (!selectedProduct) return [];
    const list: any[] = [];
    invoices.forEach(inv => {
      if (inv.billItems) {
        inv.billItems.forEach((it: any) => {
          if (it.batch?.productId === selectedProduct.id) {
            list.push({
              billNumber: inv.billNumber,
              customerMobile: inv.customer?.mobile || 'Walk-in',
              createdAt: inv.createdAt,
              batchNumber: it.batch?.batchNumber || 'N/A',
              sellingPrice: it.sellingPrice,
              quantity: it.quantity,
              totalAmount: it.totalAmount,
            });
          }
        });
      }
    });
    return list;
  }, [selectedProduct, invoices]);

  // Click batch list handler to open batch specific ledgers
  const handleOpenBatchDetails = (batch: any) => {
    setSelectedBatch(batch);
    setLedgerLoading(true);
    fetch(`${API_BASE}/inventory/ledger?limit=50&batchId=${batch.id}`)
      .then(res => res.ok ? res.json() : { data: [] })
      .then(envelope => setBatchLedger(envelope.data || []))
      .catch(() => {})
      .finally(() => setLedgerLoading(false));
  };

  // Main Registry Columns
  const listColumns: Column<any>[] = [
    {
      header: 'Product Name',
      accessor: (row) => (
        <div onClick={() => { setSelectedProduct(row); setDetailTab('info'); setViewMode('detail'); }} className="cursor-pointer group">
          <div className="flex items-center flex-wrap gap-1">
            <span className="font-bold text-gray-800 group-hover:text-primary transition-colors">{row.name}</span>
            {row.drugSchedule && renderScheduleBadge(row.drugSchedule)}
          </div>
          {row.genericName && <span className="text-[10px] text-gray-500 block font-semibold">{row.genericName}</span>}
        </div>
      ),
      sortKey: 'name',
      exportValue: (row) => row.name,
    },
    {
      header: 'SKU / Barcode',
      accessor: (row) => (
        <div className="font-mono text-[10px]">
          <div>SKU: <span className="text-gray-600">{row.sku || '-'}</span></div>
          {row.barcode && <div>BAR: <span className="text-muted">{row.barcode}</span></div>}
        </div>
      ),
      sortKey: 'sku',
      exportValue: (row) => `SKU: ${row.sku || ''} Barcode: ${row.barcode || ''}`,
    },
    {
      header: 'Stock Levels',
      accessor: (row) => {
        const inv = getProductInventory(row.id);
        const { count, hasExpired, hasNearExpiry } = getProductBatchInfo(row.id);
        const isLow = inv.availableQty <= (row.minStockLevel || 0);

        return (
          <div className="space-y-1 font-semibold">
            <div className="flex items-center gap-1.5 font-bold font-mono">
              <span className={`text-[11px] ${isLow ? 'text-rose-405 font-extrabold' : 'text-gray-700'}`}>
                {inv.availableQty} units
              </span>
              <span className="text-[9px] text-gray-400">({count} batches)</span>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {isLow && <Badge variant="danger">LOW STOCK</Badge>}
              {hasExpired && <Badge variant="danger">EXPIRED</Badge>}
              {!hasExpired && hasNearExpiry && <Badge variant="warning">NEAR EXPIRY</Badge>}
              {!isLow && !hasExpired && !hasNearExpiry && <Badge variant="success">HEALTHY</Badge>}
            </div>
          </div>
        );
      },
      exportValue: (row) => getProductInventory(row.id).availableQty,
    },
    {
      header: 'Price Book',
      accessor: (row) => (
        <div className="font-mono text-[10px]">
          <div>MRP: ₹{row.mrp.toFixed(2)}</div>
          <div>Sell: ₹{row.sellingPrice.toFixed(2)}</div>
        </div>
      ),
      sortKey: 'sellingPrice',
      exportValue: (row) => `MRP: ₹${row.mrp} Sell: ₹${row.sellingPrice}`,
    },
    {
      header: 'Location / Tax',
      accessor: (row) => (
        <div>
          <span className="font-mono text-muted block">{row.rackLocation || 'Unallocated'}</span>
          <span className="text-[10px] text-gray-500 block font-mono">{row.gstPercentage}% GST</span>
        </div>
      ),
      exportValue: (row) => row.rackLocation || '',
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex gap-1.5">
          <Button onClick={() => { setSelectedProduct(row); setDetailTab('info'); setViewMode('detail'); }} variant="outline" size="sm" className="p-1.5" title="View Console">
            <FiEye className="w-3.5 h-3.5" />
          </Button>
          <Button onClick={() => handleOpenEditMode(row)} variant="outline" size="sm" className="p-1.5 text-muted hover:text-primary hover:border-teal-500/30" title="Edit Master record">
            <FiEdit className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
      exportValue: () => '',
    }
  ];

  return (
    <div className="space-y-4 animate-fadeIn text-xs text-muted font-sans relative">
      
      {/* ==================== LIST REGISTRY VIEW ==================== */}
      {viewMode === 'list' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                Products Catalog
                <Badge variant="info" className="font-mono text-[10px] font-bold px-2 py-0.5 select-none">
                  {productTotal} Items
                </Badge>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">Configure items master records, barcodes, and rack locations</p>
            </div>
            
            {/* Top Toolbar Actions */}
            <div className="flex flex-wrap gap-2 justify-end">
              <Button onClick={() => setIsImportModalOpen(true)} variant="outline" className="flex items-center gap-1 cursor-pointer text-primary border-primary/20">
                <FiUpload /> Import Products
              </Button>
              <Button onClick={() => handleClientExport('CSV')} variant="outline" className="flex items-center gap-1 cursor-pointer">
                <FiDownload /> Export CSV
              </Button>
              <Button onClick={() => handleClientExport('EXCEL')} variant="outline" className="flex items-center gap-1 cursor-pointer">
                <FiDownload /> Export Excel
              </Button>
              <Button onClick={handleDownloadTemplate} variant="outline" className="flex items-center gap-1 text-primary border-primary/20 cursor-pointer">
                <FiFileText /> Template
              </Button>
              <Button onClick={handleOpenCreateMode} variant="primary" className="flex items-center gap-1 font-bold cursor-pointer">
                <FiPlus /> Create Product
              </Button>
            </div>
          </div>

          {/* Regulatory Search Filters */}
          <div className="bg-white/60 border border-gray-200 p-3 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-semibold mb-4">
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Drug Schedule</label>
              <select
                value={productDrugScheduleFilter}
                onChange={(e) => { setProductDrugScheduleFilter(e.target.value); setProductPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">All Schedules</option>
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
            
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Classification</label>
              <select
                value={productMedicineClassificationFilter}
                onChange={(e) => { setProductMedicineClassificationFilter(e.target.value); setProductPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">All Classifications</option>
                <option value="Antibiotic">Antibiotic</option>
                <option value="Analgesic">Analgesic</option>
                <option value="Antipyretic">Antipyretic</option>
                <option value="Antihistamine">Antihistamine</option>
                <option value="Cardiac">Cardiac</option>
                <option value="Diabetic">Diabetic</option>
                <option value="Vitamin">Vitamin</option>
                <option value="Hormonal">Hormonal</option>
                <option value="Dermatology">Dermatology</option>
                <option value="Ophthalmology">Ophthalmology</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Psychiatric">Psychiatric</option>
                <option value="Neurology">Neurology</option>
                <option value="Gastro">Gastro</option>
                <option value="Orthopedic">Orthopedic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Prescription Req. (Rx)</label>
              <select
                value={productPrescriptionRequiredFilter}
                onChange={(e) => { setProductPrescriptionRequiredFilter(e.target.value); setProductPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">All Rules</option>
                <option value="true">Prescription Mandatory</option>
                <option value="false">Non-Prescription</option>
              </select>
            </div>
            
            <div>
              <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Controlled Drug</label>
              <select
                value={productControlledDrugFilter}
                onChange={(e) => { setProductControlledDrugFilter(e.target.value); setProductPage(1); }}
                className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="true">Controlled Only</option>
                <option value="false">Standard Only</option>
              </select>
            </div>
          </div>

          <DataTable
            data={products}
            columns={listColumns}
            emptyMessage="No product catalog records found in system database."
            tableName="products_catalog"
            serverSide={true}
            totalItems={productTotal}
            currentPage={productPage}
            onPageChange={(page) => setProductPage(page)}
            searchTerm={productSearch}
            onSearchChange={(term) => {
              setProductSearch(term);
              setProductPage(1);
            }}
            itemsPerPage={productLimit}
            onItemsPerPageChange={(limit) => {
              setProductLimit(limit);
              setProductPage(1);
            }}
          />
        </>
      )}

      {/* ==================== FORM WORKSPACE (CREATE / EDIT) ==================== */}
      {(viewMode === 'create' || viewMode === 'edit') && (
        <form onSubmit={(e) => handleSaveProduct(e, false)} className="bg-white border border-gray-200 rounded-2xl p-5 space-y-6 shadow-xl relative text-left">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-200 pb-4 gap-4 sticky top-0 bg-white/95 z-20 backdrop-blur-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
                {viewMode === 'create' ? "Add New Product Master" : `Modify Product: ${selectedProduct?.name}`}
              </h3>
              <p className="text-[10px] text-gray-500 font-semibold uppercase mt-0.5">Please populate tax tiers and unique identity codes</p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end font-bold text-[11px]">
              <Button type="button" onClick={() => setViewMode('list')} variant="outline" className="px-4 cursor-pointer">
                Cancel
              </Button>
              {viewMode === 'edit' && (
                <>
                  <Button type="button" onClick={handleDuplicateProduct} variant="outline" className="flex items-center gap-1 cursor-pointer text-gray-700">
                    <FiCopy /> Duplicate Product
                  </Button>
                  <Button type="button" onClick={handleDeleteProduct} variant="danger" className="flex items-center gap-1 cursor-pointer text-slate-950">
                    <FiTrash2 /> Delete
                  </Button>
                </>
              )}
              {viewMode === 'create' && (
                <Button type="button" onClick={(e) => handleSaveProduct(e, true)} variant="outline" className="px-4 text-primary border-teal-500/25 cursor-pointer">
                  Save & New
                </Button>
              )}
              <Button type="submit" variant="primary" className="px-6 cursor-pointer">
                {viewMode === 'create' ? "Save Product" : "Update Product"}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[500px] overflow-y-auto pr-2">
            
            {/* Section 1: General Info */}
            <div className="bg-white/45 p-4 rounded-xl border border-gray-200/80 space-y-4">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5">General Information</h4>
              
              <div className="grid grid-cols-1 gap-3 text-slate-405 font-semibold">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Product Name *</label>
                  <input 
                    type="text" 
                    required
                    value={formProduct.name} 
                    onChange={(e) => setFormProduct({ ...formProduct, name: e.target.value })} 
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Generic Name</label>
                    <input 
                      type="text" 
                      value={formProduct.genericName} 
                      onChange={(e) => setFormProduct({ ...formProduct, genericName: e.target.value })} 
                      placeholder="e.g. Acetaminophen"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Brand Name</label>
                    <input 
                      type="text" 
                      value={formProduct.brandName} 
                      onChange={(e) => setFormProduct({ ...formProduct, brandName: e.target.value })} 
                      placeholder="e.g. Dolo 650"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Medicine Type</label>
                    <select 
                      value={formProduct.medicineType} 
                      onChange={(e) => setFormProduct({ ...formProduct, medicineType: e.target.value })} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    >
                      <option value="Tablet">Tablet</option>
                      <option value="Capsule">Capsule</option>
                      <option value="Syrup">Syrup / Suspension</option>
                      <option value="Injection">Injection / Vial</option>
                      <option value="Ointment">Ointment / Gel</option>
                      <option value="Drops">Eye/Ear Drops</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Category Group</label>
                    <select 
                      value={formProduct.categoryId} 
                      onChange={(e) => setFormProduct({ ...formProduct, categoryId: e.target.value })} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    >
                      <option value="">-- Choose Category --</option>
                      {allCategories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Manufacturer</label>
                    <select 
                      value={formProduct.manufacturerId} 
                      onChange={(e) => setFormProduct({ ...formProduct, manufacturerId: e.target.value })} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    >
                      <option value="">-- Choose Manufacturer --</option>
                      {allManufacturers.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Default Supplier</label>
                    <select 
                      value={formProduct.supplierId} 
                      onChange={(e) => setFormProduct({ ...formProduct, supplierId: e.target.value })} 
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                    >
                      <option value="">-- Choose Supplier --</option>
                      {allSuppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Description / Notes</label>
                  <textarea 
                    rows={2}
                    value={formProduct.description} 
                    onChange={(e) => setFormProduct({ ...formProduct, description: e.target.value })} 
                    placeholder="Enter medicine composition, indicators or warnings..."
                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Identification & Codes */}
            <div className="bg-white/45 p-4 rounded-xl border border-gray-200/80 space-y-4">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5">Identification</h4>
              
              <div className="grid grid-cols-2 gap-3 text-slate-405 font-semibold">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">SKU Code</label>
                  <input 
                    type="text" 
                    value={formProduct.sku} 
                    onChange={(e) => setFormProduct({ ...formProduct, sku: e.target.value })} 
                    placeholder="e.g. DOLO-650-TAB"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Barcode / EAN</label>
                  <input 
                    type="text" 
                    value={formProduct.barcode} 
                    onChange={(e) => setFormProduct({ ...formProduct, barcode: e.target.value })} 
                    placeholder="e.g. 890123456789"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">HSN Code</label>
                  <input 
                    type="text" 
                    value={formProduct.hsnCode} 
                    onChange={(e) => setFormProduct({ ...formProduct, hsnCode: e.target.value })} 
                    placeholder="e.g. 30049011"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">GST Tax Slab (%)</label>
                  <input 
                    type="number" 
                    value={formProduct.gstPercentage} 
                    onChange={(e) => setFormProduct({ ...formProduct, gstPercentage: parseFloat(e.target.value) || 0 })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Rack Location Shelf</label>
                  <input 
                    type="text" 
                    value={formProduct.rackLocation} 
                    onChange={(e) => setFormProduct({ ...formProduct, rackLocation: e.target.value })} 
                    placeholder="e.g. Row C, Rack 4"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 2.5: Drug Regulatory Information */}
            <div className="bg-white/45 p-4 rounded-xl border border-gray-200/80 space-y-4 col-span-1 md:col-span-2 text-slate-405 font-semibold text-xs">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5 flex items-center gap-2">
                <span>🧪 Drug Regulatory Information</span>
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Drug Schedule */}
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Drug Schedule *</label>
                  <select 
                    value={formProduct.drugSchedule} 
                    disabled={isPharmacist}
                    onChange={(e) => handleDrugScheduleChange(e.target.value)} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer font-bold"
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
                  
                  <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                    {renderScheduleBadge(formProduct.drugSchedule)}
                    {getScheduleRegulatoryNotice(formProduct.drugSchedule) && (
                      <span className={`text-[10px] ${getScheduleRegulatoryNotice(formProduct.drugSchedule)?.color}`}>
                        {getScheduleRegulatoryNotice(formProduct.drugSchedule)?.text}
                      </span>
                    )}
                  </div>
                </div>

                {/* Storage Condition */}
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Storage Condition *</label>
                  <select 
                    value={formProduct.storageCondition} 
                    onChange={(e) => setFormProduct({ ...formProduct, storageCondition: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="Room Temperature">Room Temperature</option>
                    <option value="2°C–8°C">2°C–8°C</option>
                    <option value="Frozen">Frozen</option>
                    <option value="Protect From Light">Protect From Light</option>
                    <option value="Keep Dry">Keep Dry</option>
                    <option value="Controlled Storage">Controlled Storage</option>
                  </select>
                </div>

                {/* Medicine Classification */}
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Medicine Classification *</label>
                  <select 
                    value={formProduct.medicineClassification} 
                    onChange={(e) => setFormProduct({ ...formProduct, medicineClassification: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs focus:border-primary focus:outline-none cursor-pointer"
                  >
                    <option value="Antibiotic">Antibiotic</option>
                    <option value="Analgesic">Analgesic</option>
                    <option value="Antipyretic">Antipyretic</option>
                    <option value="Antihistamine">Antihistamine</option>
                    <option value="Cardiac">Cardiac</option>
                    <option value="Diabetic">Diabetic</option>
                    <option value="Vitamin">Vitamin</option>
                    <option value="Hormonal">Hormonal</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Ophthalmology">Ophthalmology</option>
                    <option value="Respiratory">Respiratory</option>
                    <option value="Psychiatric">Psychiatric</option>
                    <option value="Neurology">Neurology</option>
                    <option value="Gastro">Gastro</option>
                    <option value="Orthopedic">Orthopedic</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Prescription Required */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/40 border border-gray-200/80 rounded-xl">
                  <div>
                    <span className="text-gray-800 block text-[11px] font-bold">Prescription Required</span>
                    <span className="text-gray-500 block text-[9px] font-medium uppercase mt-0.5">Override requires admin role</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formProduct.prescriptionRequired}
                    disabled={!isAdmin || isPharmacist}
                    onChange={(e) => setFormProduct({ ...formProduct, prescriptionRequired: e.target.checked })}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>

                {/* Controlled Drug */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/40 border border-gray-200/80 rounded-xl">
                  <div>
                    <span className="text-gray-800 block text-[11px] font-bold">Controlled Drug</span>
                    <span className="text-gray-500 block text-[9px] font-medium uppercase mt-0.5">Subject to double lock storage</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formProduct.controlledDrug}
                    disabled={isPharmacist}
                    onChange={(e) => setFormProduct({ ...formProduct, controlledDrug: e.target.checked })}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>

                {/* Cold Chain Required */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/40 border border-gray-200/80 rounded-xl">
                  <div>
                    <span className="text-gray-800 block text-[11px] font-bold">Cold Chain Required</span>
                    <span className="text-gray-500 block text-[9px] font-medium uppercase mt-0.5">Requires refrigerated logistics</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formProduct.coldChainRequired}
                    disabled={isPharmacist}
                    onChange={(e) => setFormProduct({ ...formProduct, coldChainRequired: e.target.checked })}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>

                {/* High Value Medicine */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50/40 border border-gray-200/80 rounded-xl">
                  <div>
                    <span className="text-gray-800 block text-[11px] font-bold">High Value Medicine</span>
                    <span className="text-gray-500 block text-[9px] font-medium uppercase mt-0.5">High financial asset tracking</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={formProduct.highValueMedicine}
                    disabled={isPharmacist}
                    onChange={(e) => setFormProduct({ ...formProduct, highValueMedicine: e.target.checked })}
                    className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pricing Matrix */}
            <div className="bg-gray-50/25 p-4 rounded-xl border border-gray-200/80 space-y-4 col-span-1 md:col-span-2">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest">
                  💰 Multi-Channel Pricing Module
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-semibold text-gray-500 uppercase">Round Off Final Price:</span>
                  <input
                    type="checkbox"
                    checked={formProduct.roundOff}
                    disabled={isPharmacist}
                    onChange={(e) => setFormProduct({ ...formProduct, roundOff: e.target.checked })}
                    className="w-4 h-4 accent-teal-500 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-slate-405 font-semibold">
                
                {/* Panel 1: Base Pricing */}
                <div className="bg-white/40 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                  <h5 className="text-[9px] font-bold text-muted uppercase tracking-wider border-b border-gray-200/60 pb-1">
                    Base Cost & Tax
                  </h5>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Purchase Price (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      disabled={isPharmacist}
                      value={formProduct.purchasePrice} 
                      onChange={(e) => setFormProduct({ ...formProduct, purchasePrice: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Max Retail Price / MRP (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      disabled={isPharmacist}
                      value={formProduct.mrp} 
                      onChange={(e) => setFormProduct({ ...formProduct, mrp: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">GST Tax Percentage (%) *</label>
                    <input 
                      type="number" 
                      disabled={isPharmacist}
                      value={formProduct.gstPercentage} 
                      onChange={(e) => setFormProduct({ ...formProduct, gstPercentage: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Panel 2: Offline Store Channel */}
                <div className="bg-white/40 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200/60 pb-1">
                    <h5 className="text-[9px] font-bold text-muted uppercase tracking-wider">
                      Offline Store
                    </h5>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Auto</span>
                      <input
                        type="checkbox"
                        checked={formProduct.offlineAutoCalculate}
                        disabled={isPharmacist}
                        onChange={(e) => setFormProduct({ ...formProduct, offlineAutoCalculate: e.target.checked })}
                        className="w-3.5 h-3.5 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Markup Percentage (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      disabled={isPharmacist || !formProduct.offlineAutoCalculate}
                      value={formProduct.offlineMarkup} 
                      onChange={(e) => setFormProduct({ ...formProduct, offlineMarkup: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      disabled={formProduct.offlineAutoCalculate}
                      value={formProduct.offlineSellingPrice} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const cost = parseFloat(formProduct.purchasePrice as any) || 0;
                        let markup = 0;
                        if (cost > 0) {
                          markup = parseFloat((((val - cost) / cost) * 100).toFixed(2));
                        }
                        setFormProduct({
                          ...formProduct,
                          offlineSellingPrice: val,
                          sellingPrice: val,
                          offlineMarkup: markup,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold focus:border-primary focus:outline-none disabled:bg-white/60 disabled:text-muted"
                    />
                  </div>
                </div>

                {/* Panel 3: Online Store Channel */}
                <div className="bg-white/40 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200/60 pb-1">
                    <h5 className="text-[9px] font-bold text-muted uppercase tracking-wider">
                      Online Store
                    </h5>
                    <div className="flex items-center gap-1">
                      <span className="text-[8px] font-bold text-gray-500 uppercase">Auto</span>
                      <input
                        type="checkbox"
                        checked={formProduct.onlineAutoCalculate}
                        disabled={isPharmacist}
                        onChange={(e) => setFormProduct({ ...formProduct, onlineAutoCalculate: e.target.checked })}
                        className="w-3.5 h-3.5 accent-teal-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Markup Percentage (%)</label>
                    <input 
                      type="number"
                      step="0.1"
                      disabled={isPharmacist || !formProduct.onlineAutoCalculate}
                      value={formProduct.onlineMarkup} 
                      onChange={(e) => setFormProduct({ ...formProduct, onlineMarkup: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono disabled:opacity-55"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Selling Price (₹) *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      disabled={formProduct.onlineAutoCalculate}
                      value={formProduct.onlineSellingPrice} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const cost = parseFloat(formProduct.purchasePrice as any) || 0;
                        let markup = 0;
                        if (cost > 0) {
                          markup = parseFloat((((val - cost) / cost) * 100).toFixed(2));
                        }
                        setFormProduct({
                          ...formProduct,
                          onlineSellingPrice: val,
                          onlineMarkup: markup,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold focus:border-primary focus:outline-none disabled:bg-gray-50/60 disabled:text-muted"
                    />
                  </div>
                </div>

                {/* Panel 4: Advanced Pricing Tiers */}
                <div className="bg-white/40 p-3.5 rounded-xl border border-gray-200/80 space-y-3">
                  <h5 className="text-[9px] font-bold text-muted uppercase tracking-wider border-b border-gray-200/60 pb-1">
                    Advanced Tiers
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[7px] font-bold text-gray-500 uppercase mb-0.5 font-sans">Wholesale (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        disabled={isPharmacist}
                        value={formProduct.wholesalePrice} 
                        onChange={(e) => setFormProduct({ ...formProduct, wholesalePrice: parseFloat(e.target.value) || 0 })} 
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] font-bold text-gray-500 uppercase mb-0.5 font-sans">Hospital (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        disabled={isPharmacist}
                        value={formProduct.hospitalPrice} 
                        onChange={(e) => setFormProduct({ ...formProduct, hospitalPrice: parseFloat(e.target.value) || 0 })} 
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] font-bold text-gray-500 uppercase mb-0.5 font-sans">Member (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        disabled={isPharmacist}
                        value={formProduct.memberPrice} 
                        onChange={(e) => setFormProduct({ ...formProduct, memberPrice: parseFloat(e.target.value) || 0 })} 
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-mono disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-[7px] font-bold text-gray-500 uppercase mb-0.5 font-sans">Special (₹)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        disabled={isPharmacist}
                        value={formProduct.specialOfferPrice} 
                        onChange={(e) => setFormProduct({ ...formProduct, specialOfferPrice: parseFloat(e.target.value) || 0 })} 
                        className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-[11px] font-mono disabled:opacity-50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-gray-400 uppercase mb-1">Max Retail Discount (%)</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={formProduct.retailDiscount} 
                      onChange={(e) => setFormProduct({ ...formProduct, retailDiscount: parseFloat(e.target.value) || 0 })} 
                      className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Price Summary Panel */}
                <div className="col-span-1 md:col-span-4 bg-white/80 p-3.5 rounded-xl border border-gray-200 grid grid-cols-2 sm:grid-cols-4 gap-4 font-bold text-[11px]">
                  <div className="border-r border-gray-200/60 pr-2">
                    <span className="text-gray-500 block text-[8px] uppercase tracking-wider font-sans">Offline Store Margin</span>
                    <span className="font-mono text-emerald-400 block mt-0.5">₹{marginSummary.offline.absolute.toFixed(2)} / unit</span>
                    <span className="text-[9px] text-gray-500 font-mono">Margin: {marginSummary.offline.percentage}%</span>
                  </div>
                  <div className="border-r border-gray-200/60 pr-2 sm:pl-2">
                    <span className="text-gray-500 block text-[8px] uppercase tracking-wider font-sans">Online Store Margin</span>
                    <span className="font-mono text-cyan-400 block mt-0.5">₹{marginSummary.online.absolute.toFixed(2)} / unit</span>
                    <span className="text-[9px] text-gray-500 font-mono">Margin: {marginSummary.online.percentage}%</span>
                  </div>
                  <div className="border-r border-gray-200/60 pr-2 sm:pl-2">
                    <span className="text-gray-500 block text-[8px] uppercase tracking-wider font-sans">Wholesale Margin</span>
                    <span className="font-mono text-amber-400 block mt-0.5">₹{marginSummary.wholesale.absolute.toFixed(2)} / unit</span>
                    <span className="text-[9px] text-gray-500 font-mono">Margin: {marginSummary.wholesale.percentage}%</span>
                  </div>
                  <div className="sm:pl-2">
                    <span className="text-gray-500 block text-[8px] uppercase tracking-wider font-sans">Max Discount Price</span>
                    <span className="font-mono text-rose-405 block mt-0.5">
                      ₹{(formProduct.offlineSellingPrice * (1 - formProduct.retailDiscount / 100)).toFixed(2)}
                    </span>
                    <span className="text-[9px] text-gray-500 font-mono">Max disc allowable</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Section 4: Inventory Settings */}
            <div className="bg-white/45 p-4 rounded-xl border border-gray-200/80 space-y-4">
              <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5">Inventory Settings</h4>
              
              <div className="grid grid-cols-2 gap-3 text-slate-405 font-semibold">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Minimum Alert stock</label>
                  <input 
                    type="number" 
                    value={formProduct.minStockLevel} 
                    onChange={(e) => setFormProduct({ ...formProduct, minStockLevel: parseInt(e.target.value, 10) || 0 })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Maximum Shelf capacity</label>
                  <input 
                    type="number" 
                    value={formProduct.maximumStock} 
                    onChange={(e) => setFormProduct({ ...formProduct, maximumStock: parseInt(e.target.value, 10) || 0 })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Reorder Level qty</label>
                  <input 
                    type="number" 
                    value={formProduct.reorderLevel} 
                    onChange={(e) => setFormProduct({ ...formProduct, reorderLevel: parseInt(e.target.value, 10) || 0 })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Default Units</label>
                  <select 
                    value={formProduct.defaultUnit} 
                    onChange={(e) => setFormProduct({ ...formProduct, defaultUnit: e.target.value })} 
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                  >
                    <option value="Strip">Strip</option>
                    <option value="Box">Box</option>
                    <option value="Vial">Vial / Bottle</option>
                    <option value="Piece">Piece / Single</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1">Pack Size Count</label>
                  <input 
                    type="text" 
                    value={formProduct.packSize} 
                    onChange={(e) => setFormProduct({ ...formProduct, packSize: e.target.value })} 
                    placeholder="e.g. 10 tablets per strip"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-700 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Status Option */}
            <div className="bg-gray-50/25 p-4 rounded-xl border border-gray-200/80 col-span-1 md:col-span-2 flex items-center justify-between font-bold text-[11px]">
              <div>
                <span className="text-gray-800 block">Active Catalog Listing Status</span>
                <span className="text-gray-500 block font-semibold text-[10px] uppercase mt-0.5">Inactive items are hidden from active checkout desks</span>
              </div>
              <input 
                type="checkbox"
                checked={formProduct.status}
                onChange={(e) => setFormProduct({ ...formProduct, status: e.target.checked })}
                className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
              />
            </div>

          </div>

        </form>
      )}

      {/* ==================== PRODUCT DETAILS CONSOLE VIEW ==================== */}
      {viewMode === 'detail' && selectedProduct && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-6 shadow-xl relative text-left font-sans">
          
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-gray-200 pb-4 gap-4">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest block font-mono">Product Registry Card</span>
              <h3 className="text-sm font-bold text-gray-800 leading-tight mt-0.5">{selectedProduct.name}</h3>
              {selectedProduct.genericName && <span className="text-[10px] text-gray-500 font-semibold">{selectedProduct.genericName}</span>}
            </div>

            <div className="flex gap-2 font-bold text-[11px]">
              <Button onClick={() => setViewMode('list')} variant="outline" className="px-4 cursor-pointer">
                Back to Registry
              </Button>
              <Button onClick={() => handleOpenEditMode(selectedProduct)} variant="primary" className="px-5 cursor-pointer">
                Edit Product
              </Button>
            </div>
          </div>

          {/* Metric cards banner */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Available Stock</span>
              <span className="text-lg font-bold font-mono text-gray-800 block leading-tight">
                {getProductInventory(selectedProduct.id).availableQty} <span className="text-[10px] text-gray-500">U</span>
              </span>
            </div>

            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Reserved Stock</span>
              <span className="text-lg font-bold font-mono text-gray-600 block leading-tight">
                {getProductInventory(selectedProduct.id).reservedQty} <span className="text-[10px] text-gray-500">U</span>
              </span>
            </div>

            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Damaged Qty</span>
              <span className="text-lg font-bold font-mono text-rose-600 block leading-tight">
                {getProductInventory(selectedProduct.id).damagedQty} <span className="text-[10px] text-gray-500">U</span>
              </span>
            </div>

            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Expired Qty</span>
              <span className="text-lg font-bold font-mono text-rose-450 block leading-tight">
                {getProductInventory(selectedProduct.id).expiredQty} <span className="text-[10px] text-gray-500">U</span>
              </span>
            </div>

            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Total Batches</span>
              <span className="text-lg font-bold font-mono text-gray-700 block leading-tight">
                {getProductBatchInfo(selectedProduct.id).count} <span className="text-[10px] text-gray-500">Lots</span>
              </span>
            </div>

            <div className="bg-white/65 p-3 rounded-xl border border-gray-200/80 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-0.5">Stock Status</span>
                {getProductInventory(selectedProduct.id).availableQty <= (selectedProduct.minStockLevel || 0) ? (
                  <span className="text-rose-450 font-bold block text-[10px] uppercase">LOW STOCK</span>
                ) : (
                  <span className="text-emerald-400 font-bold block text-[10px] uppercase">HEALTHY</span>
                )}
              </div>
            </div>
          </div>

          {/* Details view sub-tabs */}
          <div className="bg-white/60 border border-gray-200 px-4 flex gap-1 font-bold text-[11px] overflow-x-auto rounded-xl">
            <button onClick={() => setDetailTab('info')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'info' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>General & Pricing</button>
            <button onClick={() => setDetailTab('batches')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'batches' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>Batches list</button>
            <button onClick={() => setDetailTab('ledger')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'ledger' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>Stock Ledger</button>
            <button onClick={() => setDetailTab('purchases')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'purchases' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>Purchases History</button>
            <button onClick={() => setDetailTab('sales')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'sales' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>Sales History</button>
            <button onClick={() => setDetailTab('audit')} className={`py-3 px-3 border-b-2 transition-all ${detailTab === 'audit' ? 'border-teal-500 text-primary' : 'border-transparent text-muted hover:text-gray-700'}`}>Audit & Sync Log</button>
          </div>

          {/* Details body Panels */}
          <div className="p-2 space-y-4 max-h-[350px] overflow-y-auto pr-1">
            
            {/* Panel 1: General & Pricing */}
            {detailTab === 'info' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/40 p-4 rounded-xl border border-gray-200 leading-relaxed font-semibold">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3">General Catalog Settings</h4>
                  <div className="grid grid-cols-2 gap-3 text-muted">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Medicine Type:</span>
                      <span className="text-gray-700 block">{selectedProduct.medicineType || 'Tablet'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Rack Location:</span>
                      <span className="text-primary block font-mono">{selectedProduct.rackLocation || 'Unallocated'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">SKU Identity:</span>
                      <span className="text-gray-600 block font-mono">{selectedProduct.sku || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">Barcode ID:</span>
                      <span className="text-gray-600 block font-mono">{selectedProduct.barcode || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">GST Tax:</span>
                      <span className="text-gray-700 block font-mono">{selectedProduct.gstPercentage}% GST</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase">HSN Code:</span>
                      <span className="text-gray-700 block font-mono">{selectedProduct.hsnCode || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50/40 p-4 rounded-xl border border-gray-200 leading-relaxed font-semibold col-span-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3">Pricing Book & Channels</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-muted font-mono text-xs">
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase font-sans">Purchase Cost:</span>
                      <span className="text-gray-700 block">₹{selectedProduct.purchasePrice.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase font-sans">MRP Value:</span>
                      <span className="text-gray-700 block">₹{selectedProduct.mrp.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase font-sans">Offline Price:</span>
                      <span className="text-gray-800 block font-bold">₹{(selectedProduct.offlineSellingPrice || selectedProduct.sellingPrice || 0).toFixed(2)} ({selectedProduct.offlineMarkup || 0}% markup)</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[8px] uppercase font-sans">Online Price:</span>
                      <span className="text-gray-800 block font-bold">₹{(selectedProduct.onlineSellingPrice || 0).toFixed(2)} ({selectedProduct.onlineMarkup || 0}% markup)</span>
                    </div>
                    
                    <div className="border-t border-gray-200/60 pt-2 col-span-2 sm:col-span-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <span className="text-gray-400 block text-[7px] uppercase font-sans">Wholesale Tier:</span>
                        <span className="text-gray-700 block">₹{(selectedProduct.wholesalePrice || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[7px] uppercase font-sans">Hospital Tier:</span>
                        <span className="text-gray-700 block">₹{(selectedProduct.hospitalPrice || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[7px] uppercase font-sans">Member Tier:</span>
                        <span className="text-gray-700 block">₹{(selectedProduct.memberPrice || 0).toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[7px] uppercase font-sans">Special Offer:</span>
                        <span className="text-gray-700 block">₹{(selectedProduct.specialOfferPrice || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="border-t border-gray-200/60 pt-2 col-span-2 sm:col-span-4 flex justify-between items-center text-[10px]">
                      <div>
                        <span className="text-gray-400 font-sans uppercase block text-[8px]">Max Retail Discount:</span>
                        <span className="text-rose-400 font-bold block">{selectedProduct.retailDiscount || 0}% Allowed</span>
                      </div>
                      <div>
                        <span className="text-gray-400 font-sans uppercase block text-[8px]">Round Off Flag:</span>
                        <span className="text-primary font-bold block">{selectedProduct.roundOff ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white/40 p-4 rounded-xl border border-gray-200 leading-relaxed font-semibold col-span-1 md:col-span-2">
                  <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-3 flex items-center gap-2">
                    <span>🧪 Drug Regulatory Information</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-slate-405">
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Drug Schedule:</span>
                      <div className="mt-1 flex items-center">
                        {selectedProduct.drugSchedule ? renderScheduleBadge(selectedProduct.drugSchedule) : <span className="text-gray-600">-</span>}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Classification:</span>
                      <span className="text-gray-700 block font-bold mt-1 text-[11px]">{selectedProduct.medicineClassification || 'Other'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Storage Condition:</span>
                      <span className="text-gray-700 block font-bold mt-1 text-[11px]">{selectedProduct.storageCondition || 'Room Temperature'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Prescription Req. (Rx):</span>
                      <span className="block mt-1">
                        <Badge variant={selectedProduct.prescriptionRequired ? 'danger' : 'success'}>
                          {selectedProduct.prescriptionRequired ? 'YES (Rx REQUIRED)' : 'NO (FREE SELL)'}
                        </Badge>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Controlled Drug:</span>
                      <span className="block mt-1">
                        <Badge variant={selectedProduct.controlledDrug ? 'danger' : 'gray'}>
                          {selectedProduct.controlledDrug ? 'YES (CONTROLLED)' : 'NO'}
                        </Badge>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">Cold Chain Required:</span>
                      <span className="block mt-1">
                        <Badge variant={selectedProduct.coldChainRequired ? 'info' : 'gray'}>
                          {selectedProduct.coldChainRequired ? 'YES (REFRIGERATED)' : 'NO'}
                        </Badge>
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[9px] uppercase font-sans font-bold">High Value Medicine:</span>
                      <span className="block mt-1">
                        <Badge variant={selectedProduct.highValueMedicine ? 'warning' : 'gray'}>
                          {selectedProduct.highValueMedicine ? 'YES (HIGH VALUE)' : 'NO'}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Panel 2: Batches */}
            {detailTab === 'batches' && (
              <div className="space-y-3">
                {getProductBatchInfo(selectedProduct.id).batchesList.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                    No batches created. Use a Purchase Order or opening stock adjustment to write batch quantities.
                  </div>
                ) : (
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-[9px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                      <tr>
                        <th className="py-2 px-3">Batch Number</th>
                        <th className="py-2 px-3">Expiry Date</th>
                        <th className="py-2 px-3 text-right">MRP (₹)</th>
                        <th className="py-2 px-3 text-right">Cost Price (₹)</th>
                        <th className="py-2 px-3 text-center">Available Stock</th>
                        <th className="py-2 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40">
                      {getProductBatchInfo(selectedProduct.id).batchesList.map((b: any, idx: number) => {
                        const isExpired = new Date(b.expiryDate) < new Date();
                        return (
                          <tr key={idx} onClick={() => handleOpenBatchDetails(b)} className="hover:bg-gray-50/10 cursor-pointer">
                            <td className="py-2 px-3 font-mono font-bold text-primary">{b.batchNumber}</td>
                            <td className={`py-2 px-3 font-mono ${isExpired ? 'text-rose-600 font-bold' : ''}`}>
                              {new Date(b.expiryDate).toLocaleDateString()} {isExpired ? '(EXPIRED)' : ''}
                            </td>
                            <td className="py-2 px-3 text-right font-mono">₹{b.mrp.toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-mono">₹{b.purchasePrice.toFixed(2)}</td>
                            <td className="py-2 px-3 text-center font-mono font-bold text-gray-700">{b.availableQty} units</td>
                            <td className="py-2 px-3 text-center font-mono">
                              <Badge variant={isExpired ? 'danger' : b.status === 'ACTIVE' ? 'success' : 'gray'}>
                                {isExpired ? 'EXPIRED' : b.status}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Panel 3: Ledger */}
            {detailTab === 'ledger' && (
              <div className="space-y-3">
                {ledgerLoading ? (
                  <div className="text-center py-8 text-gray-500 font-bold">Querying ledger logs...</div>
                ) : productLedger.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                    No stock movements logged.
                  </div>
                ) : (
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-[9px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Batch</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Delta</th>
                        <th className="py-2 px-3 text-right">Balance</th>
                        <th className="py-2 px-3">Reference No</th>
                        <th className="py-2 px-3">Operator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40 font-semibold text-[11px]">
                      {productLedger.map((lg: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-[10px] text-gray-500">{new Date(lg.timestamp).toLocaleString()}</td>
                          <td className="py-2 px-3 font-mono text-primary">{lg.batch?.batchNumber || 'N/A'}</td>
                          <td className="py-2 px-3">
                            <Badge variant={
                              lg.transactionType === 'PURCHASE' || lg.transactionType === 'SALES_RETURN' ? 'success' :
                              lg.transactionType === 'SALES' || lg.transactionType === 'PURCHASE_RETURN' ? 'gray' : 'info'
                            }>
                              {lg.transactionType}
                            </Badge>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${lg.quantity > 0 ? 'text-emerald-400' : 'text-rose-600'}`}>
                            {lg.quantity > 0 ? `+${lg.quantity}` : lg.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{lg.balanceQty} units</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-gray-500">{lg.referenceNumber}</td>
                          <td className="py-2 px-3 text-gray-500 font-bold">{lg.createdBy}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Panel 4: Purchase History */}
            {detailTab === 'purchases' && (
              <div className="space-y-3">
                {productPurchases.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                    No purchase history logs.
                  </div>
                ) : (
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-[9px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                      <tr>
                        <th className="py-2 px-3">PO Number</th>
                        <th className="py-2 px-3">Supplier Name</th>
                        <th className="py-2 px-3">Invoice Number</th>
                        <th className="py-2 px-3">Received Date</th>
                        <th className="py-2 px-3 text-right">Received Qty</th>
                        <th className="py-2 px-3 text-right">Cost (₹)</th>
                        <th className="py-2 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40 font-semibold text-[11px]">
                      {productPurchases.map((pc: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-primary">{pc.poNumber}</td>
                          <td className="py-2 px-3 text-slate-205">{pc.supplierName}</td>
                          <td className="py-2 px-3 font-mono">{pc.invoiceNo}</td>
                          <td className="py-2 px-3 font-mono text-gray-500">{new Date(pc.purchaseDate).toLocaleDateString()}</td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{pc.quantity} units</td>
                          <td className="py-2 px-3 text-right font-mono">₹{pc.price.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-700">₹{pc.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Panel 5: Sales History */}
            {detailTab === 'sales' && (
              <div className="space-y-3">
                {productSales.length === 0 ? (
                  <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                    No sales checkouts logs.
                  </div>
                ) : (
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-[9px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                      <tr>
                        <th className="py-2 px-3">Invoice Number</th>
                        <th className="py-2 px-3">Customer Mobile</th>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3 font-mono">Batch No</th>
                        <th className="py-2 px-3 text-right">Rate (₹)</th>
                        <th className="py-2 px-3 text-center font-mono">Quantity</th>
                        <th className="py-2 px-3 text-right font-mono">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40 font-semibold text-[11px]">
                      {productSales.map((sl: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono font-bold text-primary">{sl.billNumber}</td>
                          <td className="py-2 px-3 text-slate-205">{sl.customerMobile}</td>
                          <td className="py-2 px-3 font-mono text-gray-400">{new Date(sl.createdAt).toLocaleString()}</td>
                          <td className="py-2 px-3 font-mono">{sl.batchNumber}</td>
                          <td className="py-2 px-3 text-right font-mono">₹{sl.sellingPrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-center font-mono text-gray-700">{sl.quantity} units</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-gray-800">₹{sl.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Panel 6: Audit & Sync Log */}
            {detailTab === 'audit' && (
              <div className="bg-white/40 p-4 rounded-xl border border-gray-200 space-y-3 font-semibold text-muted">
                <h4 className="text-[10px] font-bold text-primary uppercase tracking-widest border-b border-gray-200 pb-1.5 mb-2">Audit Logs Metadata</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-sans">Created Time:</span>
                    <span className="text-gray-700 block font-mono">{new Date(selectedProduct.createdAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-sans">Last Updated Time:</span>
                    <span className="text-gray-700 block font-mono">{new Date(selectedProduct.updatedAt).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-sans">Cloud Sync State:</span>
                    <span className="block">
                      <Badge variant={selectedProduct.syncStatus === 'SYNCED' ? 'success' : 'warning'}>
                        {selectedProduct.syncStatus}
                      </Badge>
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-sans">Synced At:</span>
                    <span className="text-gray-700 block font-mono">{selectedProduct.syncedAt ? new Date(selectedProduct.syncedAt).toLocaleString() : 'Pending Cloud Sync Queue'}</span>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ==================== DIALOGS & OVERLAYS ==================== */}

      {/* 1. BULK IMPORT MODAL WIZARD */}
      {isImportModalOpen && (
        <ProductImportWizard
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          fetchProducts={fetchProducts}
          API_BASE={API_BASE}
          allSuppliers={allSuppliers}
        />
      )}

      {/* 2. SUB-MODAL FOR BATCH HISTORY & LEDGERS */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-6 space-y-4 shadow-2xl relative text-gray-600 text-left font-sans text-xs">
            
            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
              <div>
                <span className="text-[9px] font-bold text-primary uppercase tracking-widest block font-mono">Batch Audit Log</span>
                <span className="text-sm font-bold text-gray-800 block">Lot: {selectedBatch.batchNumber}</span>
              </div>
              <button onClick={() => setSelectedBatch(null)} className="text-gray-500 hover:text-gray-700 font-bold cursor-pointer">Close</button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block border-b border-gray-200 pb-1 pl-1">Batch specific ledgers</span>
              
              {ledgerLoading ? (
                <div className="text-center py-8 text-gray-500 font-bold">Querying ledger trails...</div>
              ) : batchLedger.length === 0 ? (
                <div className="py-8 text-center text-gray-500 border border-dashed border-gray-200 rounded-xl">
                  No stock ledgers written for this specific batch number yet.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto">
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-white text-[9px] text-gray-400 uppercase border-b border-gray-200 font-mono font-bold">
                      <tr>
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3 text-right">Delta</th>
                        <th className="py-2 px-3 text-right">Balance</th>
                        <th className="py-2 px-3">Reference No</th>
                        <th className="py-2 px-3">Remarks / User</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/40 text-[11px] font-semibold">
                      {batchLedger.map((lg: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-2 px-3 font-mono text-[10px] text-gray-500">{new Date(lg.timestamp).toLocaleString()}</td>
                          <td className="py-2 px-3">
                            <Badge variant={lg.transactionType === 'PURCHASE' ? 'success' : lg.transactionType === 'SALES' ? 'gray' : 'info'}>
                              {lg.transactionType}
                            </Badge>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${lg.quantity > 0 ? 'text-emerald-400' : 'text-rose-600'}`}>
                            {lg.quantity > 0 ? `+${lg.quantity}` : lg.quantity}
                          </td>
                          <td className="py-2 px-3 text-right font-mono text-gray-700">{lg.balanceQty}</td>
                          <td className="py-2 px-3 font-mono text-[10px] text-gray-500">{lg.referenceNumber}</td>
                          <td className="py-2 px-3 leading-normal">
                            <div className="max-w-[150px] truncate">{lg.remarks}</div>
                            <span className="text-[9px] text-gray-500 font-bold block">Operator: {lg.createdBy}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-200">
              <Button onClick={() => setSelectedBatch(null)} variant="primary" className="px-5 cursor-pointer">
                Done
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductsTab;
