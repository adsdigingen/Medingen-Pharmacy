"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { FiGrid, FiPackage, FiTruck, FiUsers, FiBarChart2, FiRefreshCw, FiMonitor, FiActivity, FiDatabase, FiSettings, FiShield, FiUserCheck, FiBell, FiSearch, FiLogOut, FiClipboard } from 'react-icons/fi';
import { HiOutlineShoppingCart, HiOutlineBuildingStorefront } from 'react-icons/hi2';
import { TbReceipt2 } from 'react-icons/tb';
import { LuBoxes } from 'react-icons/lu';
import LoginScreen from '../components/features/LoginScreen';
import { SetupWizardModal } from '../components/features/SetupWizardModal';
import { useToast } from '../components/common/ToastProvider';

// Tab Components
import DashboardTab from '../components/features/DashboardTab';
import PosTab from '../components/features/PosTab';
import HistoryTab from '../components/features/HistoryTab';
import ReportsTab from '../components/features/ReportsTab';
import SettingsTab from '../components/features/SettingsTab';
import AdminTab from '../components/features/AdminTab';
import SyncTab from '../components/features/SyncTab';
import OwnerTab from '../components/features/OwnerTab';
import PurchasesTab from '../components/features/PurchasesTab';
import InventoryTab from '../components/features/InventoryTab';
import ProductsTab from '../components/features/ProductsTab';
import SuppliersTab from '../components/features/SuppliersTab';
import DrugRegisterTab from '../components/features/DrugRegisterTab';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type Tab = 'dashboard' | 'pos' | 'history' | 'reports' | 'settings' | 'admin' | 'purchases' | 'inventory' | 'products' | 'suppliers' | 'sync' | 'owner' | 'drugRegister';

const logTrace = (msg: string) => {
  if (typeof window !== 'undefined') {
    (window as any).logTrace?.(msg);
  } else {
    console.log(msg);
  }
};

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  description: string,
  fallback: T
): Promise<T> {
  console.time(description);
  logTrace(`[Startup] ${description} - Awaiting task...`);
  let timeoutId: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      logTrace(`[Startup Timeout] "${description}" TIMEOUT OCCURRED after ${ms}ms.`);
      resolve(fallback);
    }, ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    logTrace(`[Startup] ${description} - Completed successfully.`);
    console.timeEnd(description);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    logTrace(`[Startup Error] "${description}" failed: ${error}`);
    console.timeEnd(description);
    return fallback;
  }
}

/**
 * Waits for the local NestJS backend to become reachable, with retries.
 * Uses exponential backoff: 300ms, 600ms, 1200ms, 2000ms ... up to maxMs total.
 */
async function waitForBackend(url: string, maxMs = 10000): Promise<boolean> {
  const start = Date.now();
  let delay = 300;
  logTrace(`[Backend] Waiting for backend at ${url}...`);
  while (Date.now() - start < maxMs) {
    try {
      const res = await fetch(url);
      // Any response (even 401, 403, 404) means the server is listening and reachable
      logTrace(`[Backend] Backend is ready (status ${res.status}).`);
      return true;
    } catch (err: any) {
      // Refused connection/offline — keep retrying
    }
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 2, 2000);
  }
  logTrace(`[Backend] Backend did not become ready within ${maxMs}ms.`);
  return false;
}



export default function Home() {
  const { showToast } = useToast();

  // UI Layout Density
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('medingen-density');
      if (cached === 'compact' || cached === 'comfortable') {
        setDensity(cached);
      }
    }
  }, []);

  // Session Authentication state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  // Navigation tab states
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [localDbConnected, setLocalDbConnected] = useState<boolean>(true);

  // Profile / Menu state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'profile' | 'password' | 'preferences' | 'about' | null>(null);
  const [userProfilePassword, setUserProfilePassword] = useState({ current: '', new: '', confirm: '' });

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Global search Ctrl+K state & Command Palette
  const [searchOpen, setSearchOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [paletteSelectedIndex, setPaletteSelectedIndex] = useState(0);
  const [isShortcutHelpOpen, setIsShortcutHelpOpen] = useState(false);

  // Global catalogs
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [allManufacturers, setAllManufacturers] = useState<any[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  // Stats / Dashboard State
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [expiringList, setExpiringList] = useState<any[]>([]);
  const [lowStockList, setLowStockList] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState<boolean>(false);

  // --- POS BILLING STATE ---
  const [cart, setCart] = useState<any[]>([]);
  const [posSearch, setPosSearch] = useState<string>('');
  const [posSearchResults, setPosSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [productBatches, setProductBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [posQty, setPosQty] = useState<number>(1);
  const [posDiscount, setPosDiscount] = useState<number>(0);
  
  // Customer selection
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [newCustomerForm, setNewCustomerForm] = useState<{ name: string; mobile: string }>({ name: '', mobile: '' });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);

  // Payment configuration
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [mixedPayments, setMixedPayments] = useState<any[]>([
    { method: 'CASH', amount: 0 },
    { method: 'UPI', amount: 0 },
    { method: 'CARD', amount: 0 }
  ]);
  const [invoiceType, setInvoiceType] = useState<string>('TAX');
  
  // Hold bills
  const [holdBills, setHoldBills] = useState<any[]>([]);
  const [holdLabel, setHoldLabel] = useState<string>('');
  const [isHoldModalOpen, setIsHoldModalOpen] = useState<boolean>(false);

  // Receipt popup print emulation
  const [activeReceiptId, setActiveReceiptId] = useState<string | null>(null);
  const [receiptText, setReceiptText] = useState<string>('');
  const [receiptWidth, setReceiptWidth] = useState<'58mm' | '80mm' | '150x95mm'>('80mm');

  // Input refs for keyboard focus navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);
  const cashPaidInputRef = useRef<HTMLInputElement>(null);

  // --- BILL HISTORY STATE ---
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [invoicePage, setInvoicePage] = useState<number>(1);
  const [invoiceLimit] = useState<number>(8);
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('');
  const [invoiceLoading, setInvoiceLoading] = useState<boolean>(false);
  const [invoiceDetail, setInvoiceDetail] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);

  // Sales Return
  const [isSalesReturnModalOpen, setIsSalesReturnModalOpen] = useState<boolean>(false);
  const [salesReturnForm, setSalesReturnForm] = useState<any>({ billId: '', items: [] });

  // --- REPORTS STATE ---
  const [reportsTab, setReportsTab] = useState<'sales' | 'purchases' | 'gst' | 'stock'>('sales');
  const [reportsStartDate, setReportsStartDate] = useState<string>(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [reportsEndDate, setReportsEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [salesReportData, setSalesReportData] = useState<any>(null);
  const [purchaseReportData, setPurchaseReportData] = useState<any>(null);
  const [gstReportData, setGstReportData] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState<boolean>(false);

  // --- SYSTEM SETTINGS STATE ---
  const [settingsForm, setSettingsForm] = useState<any>({ storeName: 'Medingen Pharmacy', gstin: '', phone: '', email: '', address: '', invoicePrefix: 'INV-', poPrefix: 'PO-', printerType: '80mm', backupInterval: 'DAILY' });
  const [settingsLoading, setSettingsLoading] = useState<boolean>(false);
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [activationKey, setActivationKey] = useState<string>('');

  // --- ADMIN PANEL STATE ---
  const [adminTab, setAdminTab] = useState<'users' | 'backups' | 'maintenance' | 'audit'>('users');
  
  // Users list
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [userForm, setUserForm] = useState<any>({ username: '', passwordHash: '', role: 'CASHIER', status: true });

  // Audit Logs list
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState<number>(0);
  const [auditPage, setAuditPage] = useState<number>(1);
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditModuleFilter, setAuditModuleFilter] = useState<string>('');

  // Maintenance metrics
  const [dbHealth, setDbHealth] = useState<any>(null);
  const [maintenanceLoading, setMaintenanceLoading] = useState<boolean>(false);

  // --- SYNC CENTER STATE ---
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncConflicts, setSyncConflicts] = useState<any[]>([]);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);

  // Categories/Manufacturers/Suppliers/Products/Purchases/Inventory lists
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryPage, setCategoryPage] = useState<number>(1);
  const [categorySearch, setCategorySearch] = useState<string>('');
  const [categoryStatusFilter, setCategoryStatusFilter] = useState<string>('');

  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [manufacturerPage, setManufacturerPage] = useState<number>(1);
  const [manufacturerSearch, setManufacturerSearch] = useState<string>('');

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierPage, setSupplierPage] = useState<number>(1);
  const [supplierSearch, setSupplierSearch] = useState<string>('');

  const [products, setProducts] = useState<any[]>([]);
  const [productPage, setProductPage] = useState<number>(1);
  const [productSearch, setProductSearch] = useState<string>('');
  const [productLimit, setProductLimit] = useState<number>(50);
  const [productTotal, setProductTotal] = useState<number>(0);
  const [productDrugScheduleFilter, setProductDrugScheduleFilter] = useState<string>('');
  const [productMedicineClassificationFilter, setProductMedicineClassificationFilter] = useState<string>('');
  const [productPrescriptionRequiredFilter, setProductPrescriptionRequiredFilter] = useState<string>('');
  const [productControlledDrugFilter, setProductControlledDrugFilter] = useState<string>('');

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [purchasePage, setPurchasePage] = useState<number>(1);
  const [purchaseSearch, setPurchaseSearch] = useState<string>('');
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState<string>('');

  const [inventorySubTab, setInventorySubTab] = useState<'stock' | 'batches' | 'ledger' | 'adjustments'>('stock');
  const [inventories, setInventories] = useState<any[]>([]);
  const [inventoryPage, setInventoryPage] = useState<number>(1);
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [inventoryLowStockFilter, setInventoryLowStockFilter] = useState<boolean>(false);
  
  const [batches, setBatches] = useState<any[]>([]);
  const [batchPage, setBatchPage] = useState<number>(1);
  const [batchSearch, setBatchSearch] = useState<string>('');
  const [batchStatusFilter, setBatchStatusFilter] = useState<string>('');

  const [ledgers, setLedgers] = useState<any[]>([]);
  const [ledgerPage, setLedgerPage] = useState<number>(1);
  const [ledgerProductFilter, setLedgerProductFilter] = useState<string>('');

  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [adjustmentPage, setAdjustmentPage] = useState<number>(1);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [adjustForm, setAdjustForm] = useState<any>({ batchId: '', type: 'INCREASE', quantity: 1, reason: 'PHYSICAL_COUNT', remarks: '' });

  const [modeOfSell, setModeOfSell] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');

  // Dynamically update existing cart item prices when the sell mode changes
  useEffect(() => {
    setCart(prevCart => prevCart.map(item => {
      const price = modeOfSell === 'ONLINE' ? (item.onlinePrice ?? item.mrp) : (item.offlinePrice ?? item.sellingPrice);
      const subtotal = item.quantity * price;
      const gstAmt = subtotal * (item.gstPercentage / 100);
      return {
        ...item,
        sellingPrice: price,
        gstAmount: gstAmt,
        totalAmount: subtotal - (subtotal * (item.discountPercentage / 100)) + gstAmt
      };
    }));
  }, [modeOfSell]);

  // Calculate Shift based on local hours
  const currentShift = useMemo(() => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 14) return 'Morning Shift (06:00 - 14:00)';
    if (hours >= 14 && hours < 22) return 'Evening Shift (14:00 - 22:00)';
    return 'Night Shift (22:00 - 06:00)';
  }, [currentTime]);

  const sidebarItems = useMemo(() => [
    {
      id: 'dashboard' as Tab,
      title: 'Dashboard',
      category: 'POS Registry',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
      icon: FiGrid
    },
    {
      id: 'pos' as Tab,
      title: 'Billing Desk',
      category: 'POS Registry',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
      icon: HiOutlineShoppingCart
    },
    {
      id: 'history' as Tab,
      title: 'Invoices & Returns',
      category: 'POS Registry',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
      icon: TbReceipt2
    },
    {
      id: 'products' as Tab,
      title: 'Products Catalog',
      category: 'Stocks & Items',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
      icon: FiPackage
    },
    {
      id: 'inventory' as Tab,
      title: 'Inventory Ledgers',
      category: 'Stocks & Items',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
      icon: LuBoxes
    },
    {
      id: 'drugRegister' as Tab,
      title: 'Drug Schedule Register',
      category: 'Stocks & Items',
      roles: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
      icon: FiClipboard
    },
    {
      id: 'purchases' as Tab,
      title: 'Purchases PO',
      category: 'Stocks & Items',
      roles: ['ADMIN', 'STORE_MANAGER'],
      icon: FiTruck
    },
    {
      id: 'suppliers' as Tab,
      title: 'Suppliers',
      category: 'Stocks & Items',
      roles: ['ADMIN', 'STORE_MANAGER'],
      icon: HiOutlineBuildingStorefront
    },
    {
      id: 'sync' as Tab,
      title: 'Sync Center',
      category: 'Cloud Sync',
      roles: ['ADMIN', 'STORE_MANAGER'],
      icon: FiRefreshCw
    },
    {
      id: 'owner' as Tab,
      title: 'Owner Remote View',
      category: 'Cloud Sync',
      roles: ['ADMIN'],
      icon: FiMonitor
    },
    {
      id: 'reports' as Tab,
      title: 'Reports Analytics',
      category: 'System Admin',
      roles: ['ADMIN', 'STORE_MANAGER'],
      icon: FiBarChart2
    },
    {
      id: 'settings' as Tab,
      title: 'System Settings',
      category: 'System Admin',
      roles: ['ADMIN'],
      icon: FiSettings
    },
    {
      id: 'admin' as Tab,
      title: 'Admin Console',
      category: 'System Admin',
      roles: ['ADMIN'],
      icon: FiShield
    }
  ], []);

  const sidebarCategories = useMemo(() => {
    const categories = ['POS Registry', 'Stocks & Items', 'Cloud Sync', 'System Admin'];
    return categories.map(cat => {
      const items = sidebarItems.filter(item => 
        item.category === cat && 
        currentUser && 
        item.roles.includes(currentUser.role)
      );
      return { categoryName: cat, items };
    }).filter(cat => cat.items.length > 0);
  }, [sidebarItems, currentUser]);

  // Global Fetch Interceptor to inject Authorization header and legacy headers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const startTime = Date.now();
        const url = typeof input === 'string' ? input : (input as Request).url || input.toString();
        console.log(`[API Request Start] URL: ${url}, Start Time: ${new Date(startTime).toLocaleTimeString()}`);

        const cached = localStorage.getItem('medingen_session');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed) {
              init = init || {};
              const headersObj = new Headers(init.headers);
              if (parsed.id) headersObj.set('x-user-id', parsed.id);
              if (parsed.role) headersObj.set('x-user-role', parsed.role);
              if (parsed.token) {
                headersObj.set('Authorization', `Bearer ${parsed.token}`);
              }
              init.headers = headersObj;
            }
          } catch (e) {
            console.error("[Medingen Init] Fetch interceptor error:", e);
          }
        }

        try {
          const res = await originalFetch.call(window, input, init);
          const endTime = Date.now();
          const duration = endTime - startTime;
          console.log(`[API Request End] URL: ${url}, End Time: ${new Date(endTime).toLocaleTimeString()}, Duration: ${duration}ms, Status: ${res.status}`);
          
          try {
            const cloned = res.clone();
            const bodyText = await cloned.text();
            console.log(`[API Request Response] URL: ${url}, Response:`, bodyText.slice(0, 300) + (bodyText.length > 300 ? "..." : ""));
          } catch (respErr) {
            console.warn(`[API Request Response Read Fail] URL: ${url}, Error:`, respErr);
          }

          return res;
        } catch (error: any) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          if (url.includes('/diagnostics/health')) {
            console.warn(`[API Request Failed (Expected)] URL: ${url}, Duration: ${duration}ms`);
          } else {
            console.error(`[API Request Failed] URL: ${url}, End Time: ${new Date(endTime).toLocaleTimeString()}, Duration: ${duration}ms, Error:`, error);
          }
          throw error;
        }
      };

      return () => {
        window.fetch = originalFetch;
      };
    }
  }, []);

  // Session Autoload with initial Tab permission check
  useEffect(() => {
    const checkAuth = async () => {
      const startupReport: string[] = [];
      const reportStep = (stepNum: number, name: string, success: boolean, reason?: string) => {
        const mark = success ? "✓" : "✗";
        let msg = `${mark} Completed Step ${stepNum} (${name})`;
        if (!success && reason) {
          msg += `\n   Reason: ${reason}`;
        }
        startupReport.push(msg);
      };

      // Load cached session token early so it can be used for startup API requests
      let startupToken: string | undefined;
      try {
        const cached = localStorage.getItem('medingen_session');
        if (cached) {
          const parsed = JSON.parse(cached);
          startupToken = parsed.token;
        }
      } catch (_) {}

      logTrace("========== APPLICATION STARTUP ==========");

      // Step 1: Renderer Loaded
      logTrace("[1/10] Renderer Loaded");
      reportStep(1, "Renderer Loaded", true);

      // Step 2: Checking Electron API
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 440\n[2/10] Checking Electron API...");
      const hasElectronAPI = typeof window !== 'undefined' && (window as any).electronAPI !== undefined;
      if (hasElectronAPI) {
        logTrace("Electron API Available");
        reportStep(2, "Checking Electron API", true);
      } else {
        logTrace("Electron API not available (Browser environment)");
        reportStep(2, "Checking Electron API", false, "Electron API not available (running in browser)");
      }

      // Step 3: Checking IPC
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 451\n[3/10] Checking IPC...");
      if (hasElectronAPI) {
        logTrace("IPC Connected");
        reportStep(3, "Checking IPC", true);
      } else {
        logTrace("IPC Not Connected (Browser environment)");
        reportStep(3, "Checking IPC", false, "IPC not available (running in browser)");
      }

      // Step 4: Loading Local Settings
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 461\n[4/10] Loading Local Settings...");
      try {
        // Wait for the local NestJS backend to become reachable before attempting any API calls.
        // This prevents ERR_CONNECTION_REFUSED when the renderer loads faster than the server starts.
        const backendReady = await waitForBackend(`${API_BASE}/diagnostics/health`, 10000);
        if (!backendReady) {
          logTrace("[Startup Warning] Backend did not respond in time — proceeding anyway.");
        }
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 464\nCalling fetchSettings()");
        await withTimeout(fetchSettings(startupToken), 5000, "Load Settings", null);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 464\nCompleted fetchSettings()");
        reportStep(4, "Loading Local Settings", true);
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 464\nfetchSettings() failed: " + err.message);
        reportStep(4, "Loading Local Settings", false, err.message);
      }

      // Step 5: Loading Authentication
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 470\n[5/10] Loading Authentication...");
      let cachedSession: any = null;
      try {
        cachedSession = localStorage.getItem('medingen_session');
        logTrace("Authentication session loaded from storage: " + (cachedSession ? "Present" : "Absent"));
        reportStep(5, "Loading Authentication", true);
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 474\nlocalStorage read failed: " + err.message);
        reportStep(5, "Loading Authentication", false, err.message);
      }

      // Step 6: Checking Database
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 481\n[6/10] Checking Database...");
      try {
        const dbCheck = fetch(`${API_BASE}/diagnostics/status`).then(res => res.ok).catch(() => false);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 485\nCalling Check Database Connection");
        const dbAlive = await withTimeout(dbCheck, 5000, "Check Database Connection", false);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 485\nCompleted Check Database Connection");
        if (dbAlive) {
          logTrace("Database Connection Verified");
          reportStep(6, "Checking Database", true);
        } else {
          logTrace("Database diagnostics status check returned unhealthy");
          reportStep(6, "Checking Database", false, "Diagnostics status check returned unhealthy or failed");
        }
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 485\nCheck Database Connection failed: " + err.message);
        reportStep(6, "Checking Database", false, err.message);
      }

      // Step 7: Loading Dashboard
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 497\n[7/10] Loading Dashboard...");
      try {
        if (cachedSession) {
          logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 501\nCalling fetchDashboardStats()");
          await withTimeout(fetchDashboardStats(startupToken), 5000, "Load Dashboard Stats", null);
          logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 501\nCompleted fetchDashboardStats()");
        } else {
          logTrace("Skipping fetchDashboardStats() (No cached session)");
        }
        reportStep(7, "Loading Dashboard", true);
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 501\nfetchDashboardStats() failed: " + err.message);
        reportStep(7, "Loading Dashboard", false, err.message);
      }

      // Step 8: Starting Workers
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 508\n[8/10] Starting Workers...");
      try {
        const workersCheck = fetch(`${API_BASE}/workers/status`).then(res => res.ok).catch(() => false);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 512\nCalling Check Background Workers");
        const workersAlive = await withTimeout(workersCheck, 5000, "Check Background Workers", false);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 512\nCompleted Check Background Workers");
        if (workersAlive) {
          logTrace("Background Workers Running");
          reportStep(8, "Starting Workers", true);
        } else {
          logTrace("Background workers status returned unhealthy or failed");
          reportStep(8, "Starting Workers", false, "Workers status check returned unhealthy or failed");
        }
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 512\nCheck Background Workers failed: " + err.message);
        reportStep(8, "Starting Workers", false, err.message);
      }

      // Step 9: Finalizing
      logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 524\n[9/10] Finalizing...");
      try {
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 527\nCalling fetchAllUsers()");
        await withTimeout(fetchAllUsers(startupToken), 5000, "Load System Users", null);
        logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 527\nCompleted fetchAllUsers()");
        reportStep(9, "Finalizing", true);
      } catch (err: any) {
        logTrace("[Startup Error]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 527\nfetchAllUsers() failed: " + err.message);
        reportStep(9, "Finalizing", false, err.message);
      }

      // Step 10: Startup Completed
      logTrace("[10/10] Startup Completed");
      reportStep(10, "Startup Completed", true);

      // Print startup report
      logTrace(`
========== STARTUP REPORT ==========
${startupReport.join("\n")}
====================================`);

      // Exit loading state and dismiss splash screen in finally block
      try {
        if (cachedSession) {
          const parsedUser = JSON.parse(cachedSession);
          setCurrentUser(parsedUser);
          
          // Read tab parameter from URL query if logged in
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get('tab') as Tab;
          if (tabParam && ['dashboard', 'pos', 'history', 'reports', 'settings', 'admin', 'purchases', 'inventory', 'products', 'suppliers', 'sync', 'owner', 'drugRegister'].includes(tabParam)) {
            const tabRoleMap: Record<Tab, string[]> = {
              dashboard: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
              pos: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
              history: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
              products: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
              inventory: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
              drugRegister: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
              purchases: ['ADMIN', 'STORE_MANAGER'],
              suppliers: ['ADMIN', 'STORE_MANAGER'],
              sync: ['ADMIN', 'STORE_MANAGER'],
              owner: ['ADMIN'],
              reports: ['ADMIN', 'STORE_MANAGER'],
              settings: ['ADMIN'],
              admin: ['ADMIN'],
            };
            if (tabRoleMap[tabParam]?.includes(parsedUser.role)) {
              setActiveTab(tabParam);
            } else {
              setAuthChecked(true);
              if (typeof window !== 'undefined') {
                (window as any).hideAppLoader?.();
                if (window.location.protocol !== 'file:') {
                  window.history.replaceState({}, '', '/unauthorized');
                }
              }
              return;
            }
          }
        }
      } catch(e: any) {
        logTrace("[Medingen Init] error parsing session or handling tabParam: " + e.message);
      } finally {
        logTrace("Leaving Splash Screen");
        setAuthChecked(true);
        if (typeof window !== 'undefined') {
          logTrace("[Medingen Init] Hiding app loader");
          (window as any).hideAppLoader?.();
        }
      }
    };

    logTrace("[Medingen Init] useEffect checkAuth mounted");
    checkAuth();
  }, []);

  // Active Tab Authorization Guard
  useEffect(() => {
    if (currentUser && activeTab) {
      const tabRoleMap: Record<Tab, string[]> = {
        dashboard: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
        pos: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
        history: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
        products: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
        inventory: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST'],
        drugRegister: ['ADMIN', 'STORE_MANAGER', 'PHARMACIST', 'CASHIER'],
        purchases: ['ADMIN', 'STORE_MANAGER'],
        suppliers: ['ADMIN', 'STORE_MANAGER'],
        sync: ['ADMIN', 'STORE_MANAGER'],
        owner: ['ADMIN'],
        reports: ['ADMIN', 'STORE_MANAGER'],
        settings: ['ADMIN'],
        admin: ['ADMIN'],
      };
      if (!tabRoleMap[activeTab]?.includes(currentUser.role)) {
        setActiveTab('dashboard');
        if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
          window.history.replaceState({}, '', '/unauthorized');
          window.location.pathname = '/unauthorized';
        }
      }
    }
  }, [activeTab, currentUser]);

  // Sync activeTab and currentUser with Browser URL Path
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
      if (!currentUser) {
        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.history.pushState({}, '', '/login');
        }
      } else {
        let path = '/dashboard';
        if (activeTab === 'pos') path = '/billing';
        else if (activeTab === 'dashboard') path = '/dashboard';
        else if (activeTab === 'products') path = '/products';
        else if (activeTab === 'inventory') path = '/inventory';
        else if (activeTab === 'reports') path = '/reports';
        else if (activeTab === 'admin') path = '/admin';
        else if (activeTab === 'suppliers') path = '/suppliers';
        else path = `/${activeTab}`;

        if (window.location.pathname !== path) {
          window.history.pushState({}, '', path);
        }
      }
    }
  }, [activeTab, currentUser]);


  const fetchAllUsers = async (token?: string) => {
    logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 650\nCalling fetchAllUsers()");
    console.time("fetchAllUsers");
    logTrace("[Medingen Init] fetchAllUsers started");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const activeToken = token || currentUser?.token;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch(`${API_BASE}/users-management?limit=200`, { 
        signal: controller.signal,
        headers
      });
      if (res.ok) {
        const envelope = await res.json();
        const usersList = envelope.data || [];
        setAllUsers(usersList);
        setAdminUsers(usersList);
        logTrace("[Medingen Init] fetchAllUsers set users list count: " + usersList.length);
        // Seed default admin if user table is fully empty
        if (usersList.length === 0) {
          const defaultAdmin = { id: 'admin-default', username: 'admin', role: 'ADMIN', status: true };
          setAllUsers([defaultAdmin]);
          setAdminUsers([defaultAdmin]);
        }
      } else {
        logTrace("[Medingen Init] fetchAllUsers returned non-ok status: " + res.status);
        setAllUsers([{ id: 'admin-default', username: 'admin', role: 'ADMIN', status: true }]);
      }
    } catch(err: any) {
      logTrace("[Medingen Init] fetchAllUsers encountered error or aborted: " + err.message);
      // Fallback local mock user in case DB is offline/initializing or timed out
      setAllUsers([{ id: 'admin-default', username: 'admin', role: 'ADMIN', status: true }]);
    } finally {
      clearTimeout(timeoutId);
      logTrace("[Medingen Init] fetchAllUsers finished");
      console.timeEnd("fetchAllUsers");
    }
  };

  // Time Tracker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (!currentUser) return; // No shortcuts active on login screen

      if (e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(prev => !prev);
      } else if (e.key === '?' || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutHelpOpen(prev => !prev);
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (activeTab === 'pos' && cart.length > 0) {
          if (confirm("Are you sure you want to clear the active cart? All progress will be lost.")) {
            handleNewBill();
          }
        } else {
          setActiveTab('pos');
          handleNewBill();
        }
      } else if (e.key === 'F3') {
        e.preventDefault();
        if (activeTab === 'pos') {
          searchInputRef.current?.focus();
        } else {
          setActiveTab('pos');
          setTimeout(() => searchInputRef.current?.focus(), 50);
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (activeTab === 'pos') {
          customerInputRef.current?.focus();
        }
      } else if (e.key === 'F5') {
        // Redirect POS checkout shortcut to F5 for cashier workflow
        e.preventDefault();
        if (activeTab === 'pos') {
          handleCheckoutSubmit();
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (activeTab === 'pos') {
          setIsHoldModalOpen(true);
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (activeTab === 'pos') {
          cashPaidInputRef.current?.focus();
        }
      } else if (e.key === 'Escape') {
        setIsCustomerModalOpen(false);
        setIsHoldModalOpen(false);
        setIsAdjustModalOpen(false);
        setIsCancelModalOpen(false);
        setIsSalesReturnModalOpen(false);
        setIsUserModalOpen(false);
        setIsShortcutHelpOpen(false);
        setActiveReceiptId(null);
        setSearchOpen(false);
        setProfileDropdownOpen(false);
        setActiveDialog(null);
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [cart, selectedCustomer, paymentMethod, amountPaid, mixedPayments, currentUser, activeTab]);

  // Autocomplete Products Search inside POS Billing
  useEffect(() => {
    if (!posSearch) {
      setPosSearchResults([]);
      return;
    }
    const filtered = allProducts.filter(p => 
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      (p.genericName && p.genericName.toLowerCase().includes(posSearch.toLowerCase())) ||
      (p.brandName && p.brandName.toLowerCase().includes(posSearch.toLowerCase())) ||
      (p.barcode && p.barcode.includes(posSearch)) ||
      (p.sku && p.sku.toLowerCase().includes(posSearch.toLowerCase()))
    ).slice(0, 8);
    setPosSearchResults(filtered);

    // Barcode scanner quick add (continuous scan-to-cart automation)
    const exactMatch = allProducts.find(p => p.barcode === posSearch);
    if (exactMatch) {
      handleBarcodeScanAdd(exactMatch);
    }
  }, [posSearch, allProducts]);

  // Autocomplete Customers Search inside POS Billing (search on mobile number/name)
  useEffect(() => {
    if (!customerSearch.trim()) {
      setCustomerResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/customers?search=${customerSearch}&limit=5`);
        if (res.ok) {
          const envelope = await res.json();
          // ResponseTransformInterceptor wraps paginated responses in { success: true, data: customerObj[] }
          setCustomerResults(envelope.data || []);
        }
      } catch (e) {
        console.warn("Failed to search customers", e);
      }
    }, 200); // 200ms debounce to prevent spamming
    return () => clearTimeout(delayDebounce);
  }, [customerSearch]);

  // Fetch catalogs on mount (only when authenticated)
  useEffect(() => {
    if (!currentUser) return;
    fetchCatalogs();
    fetchHoldBills();
  }, [currentUser]);

  // Populate dynamic notifications checklist (low stock and soon expiring items)
  useEffect(() => {
    const list: any[] = [];
    lowStockList.forEach(item => {
      list.push({
        id: `stock-${item.id}`,
        type: 'STOCK_WARN',
        title: 'Low Stock Alert',
        message: `${item.name} is running low. Current Stock: ${item.quantity}`,
        read: false,
        time: new Date()
      });
    });
    expiringList.forEach(item => {
      list.push({
        id: `exp-${item.id}`,
        type: 'EXP_WARN',
        title: 'Batch Expiring Soon',
        message: `${item.productName} (Batch: ${item.batchNumber}) expires on ${new Date(item.expiryDate).toLocaleDateString()}`,
        read: false,
        time: new Date()
      });
    });
    setNotifications(list);
  }, [lowStockList, expiringList]);

  // Fetch lists based on active tab and filters
  useEffect(() => {
    if (!currentUser) return; // Wait until logged in

    if (activeTab === 'dashboard') fetchDashboardStats();
    else if (activeTab === 'pos') fetchHoldBills();
    else if (activeTab === 'history') fetchInvoices();
    else if (activeTab === 'reports') fetchReportsData();
    else if (activeTab === 'settings') {
      fetchSettings();
      fetchLicense();
    } else if (activeTab === 'admin') {
      if (adminTab === 'users') fetchAdminUsers();
      else if (adminTab === 'maintenance') fetchDbHealth();
      else if (adminTab === 'audit') fetchAuditLogs();
    } else if (activeTab === 'sync') {
      fetchSyncStatus();
      fetchSyncConflicts();
    } else if (activeTab === 'owner') {
      fetchDashboardStats();
      fetchSyncStatus();
    }
    else if (activeTab === 'products') fetchProducts();
    else if (activeTab === 'suppliers') fetchCatalogs();
    else if (activeTab === 'purchases') fetchPurchaseOrders();
    else if (activeTab === 'inventory') {
      if (inventorySubTab === 'stock') fetchInventories();
      else if (inventorySubTab === 'batches') fetchBatches();
      else if (inventorySubTab === 'ledger') fetchLedgers();
      else if (inventorySubTab === 'adjustments') fetchAdjustments();
    }
  }, [
    activeTab, reportsTab, reportsStartDate, reportsEndDate,
    adminTab, auditPage, auditSearch, auditModuleFilter,
    inventorySubTab,
    invoicePage, invoiceSearch, invoiceStatusFilter,
    productPage, productSearch, productLimit,
    productDrugScheduleFilter, productMedicineClassificationFilter,
    productPrescriptionRequiredFilter, productControlledDrugFilter,
    purchasePage, purchaseSearch, purchaseStatusFilter,
    inventoryPage, inventorySearch, inventoryLowStockFilter,
    batchPage, batchSearch, batchStatusFilter,
    ledgerPage, ledgerProductFilter,
    adjustmentPage, currentUser
  ]);

  const fetchCatalogs = async () => {
    try {
      const [catRes, manRes, supRes, prodRes] = await Promise.all([
        fetch(`${API_BASE}/categories?limit=200`),
        fetch(`${API_BASE}/manufacturers?limit=200`),
        fetch(`${API_BASE}/suppliers?limit=200`),
        fetch(`${API_BASE}/products?limit=10000`)
      ]);
      if (catRes.ok) setAllCategories((await catRes.json()).data || []);
      if (manRes.ok) setAllManufacturers((await manRes.json()).data || []);
      if (supRes.ok) setAllSuppliers((await supRes.json()).data || []);
      if (prodRes.ok) setAllProducts((await prodRes.json()).data || []);
    } catch (e) {
      console.warn("Failed to fetch catalogs", e);
      setLocalDbConnected(false);
    }
  };

  // --- DASHBOARD STATS ---
  const fetchDashboardStats = async (token?: string) => {
    logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 868\nCalling fetchDashboardStats()");
    setDashboardLoading(true);
    try {
      const activeToken = token || currentUser?.token;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch(`${API_BASE}/dashboard/stats`, { headers });
      if (res.ok) {
        const envelope = await res.json();
        const data = envelope.data || {};
        setDashboardStats(data.stats || {});
        setExpiringList(data.expiringBatches || []);
        setLowStockList(data.lowStockList || []);
        setTrendData(data.trendData || []);
        setCategoryDistribution(data.categoryDistribution || []);
        setLocalDbConnected(true);
        logTrace("[Medingen Init] fetchDashboardStats successfully completed");
      } else {
        logTrace("[Medingen Init] fetchDashboardStats returned non-ok status: " + res.status);
      }
    } catch (e: any) {
      logTrace("[Medingen Init] fetchDashboardStats failed: " + e.message);
      setLocalDbConnected(false);
    } finally {
      setDashboardLoading(false);
    }
  };

  // --- POS CART CONTROLLER ---
  const handleBarcodeScanAdd = async (product: any) => {
    try {
      const res = await fetch(`${API_BASE}/batches/fefo/${product.id}`);
      if (res.ok) {
        const envelope = await res.json();
        const batchesList = envelope.data || [];
        const activeBatch = batchesList.find((b: any) => b.availableQty > 0);
        if (!activeBatch) {
          showToast(`Product "${product.name}" is out of stock in all batches.`, 'error');
          setPosSearch('');
          return;
        }
        
        // Add directly to cart
        setCart(prevCart => {
          const existingIndex = prevCart.findIndex(it => it.batchId === activeBatch.id);
          const isOnline = modeOfSell === 'ONLINE';
          const priceToUse = isOnline ? activeBatch.mrp : activeBatch.sellingPrice;
          
          if (existingIndex > -1) {
            const updatedCart = [...prevCart];
            const newQty = updatedCart[existingIndex].quantity + 1;
            if (activeBatch.availableQty < newQty) {
              showToast(`Insufficient stock. Cumulative cart quantity (${newQty}) exceeds available batch stock (${activeBatch.availableQty}).`, 'warning');
              return prevCart;
            }
            const item = { ...updatedCart[existingIndex] };
            item.quantity = newQty;
            
            const subtotal = newQty * item.sellingPrice;
            const gstAmt = subtotal * (item.gstPercentage / 100);
            item.gstAmount = gstAmt;
            item.totalAmount = subtotal - (subtotal * (item.discountPercentage / 100)) + gstAmt;
            
            updatedCart[existingIndex] = item;
            return updatedCart;
          } else {
            const subtotal = 1 * priceToUse;
            const gstAmt = subtotal * (activeBatch.gstPercentage / 100);
            return [
              ...prevCart,
              {
                productId: product.id,
                name: product.name,
                batchId: activeBatch.id,
                batchNumber: activeBatch.batchNumber,
                expiryDate: activeBatch.expiryDate,
                quantity: 1,
                sellingPrice: priceToUse,
                mrp: activeBatch.mrp,
                offlinePrice: activeBatch.sellingPrice,
                onlinePrice: activeBatch.mrp,
                discountPercentage: 0,
                gstPercentage: activeBatch.gstPercentage,
                gstAmount: gstAmt,
                totalAmount: subtotal + gstAmt
              }
            ];
          }
        });

        // Continuous scan sound feedback
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
          gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.12);
        } catch (err) {
          console.warn("Audio Context blocked:", err);
        }

        showToast(`Added ${product.name} (Batch: ${activeBatch.batchNumber}) to cart`, 'success');
        setPosSearch('');
        setPosSearchResults([]);
        searchInputRef.current?.focus();
      }
    } catch (e) {
      console.error("Failed to auto-add product on barcode scan:", e);
    }
  };

  const handleSelectProduct = async (product: any) => {
    setSelectedProduct(product);
    setPosSearch('');
    setPosSearchResults([]);
    setPosQty(1);
    setPosDiscount(0);
    
    try {
      const res = await fetch(`${API_BASE}/batches/fefo/${product.id}`);
      if (res.ok) {
        const envelope = await res.json();
        const batchesList = envelope.data || [];
        setProductBatches(batchesList);
        if (batchesList.length > 0) setSelectedBatchId(batchesList[0].id);
        else setSelectedBatchId('');
        qtyInputRef.current?.focus();
      }
    } catch (e) {
      alert("Failed to load FEFO batches: " + e);
    }
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedBatchId) return;
    const batch = productBatches.find(b => b.id === selectedBatchId);
    if (!batch) return;

    if (batch.availableQty < posQty) {
      alert(`Insufficient stock. Batch ${batch.batchNumber} has only ${batch.availableQty} items available.`);
      return;
    }

    const existingIndex = cart.findIndex(it => it.batchId === batch.id);
    
    const isOnline = modeOfSell === 'ONLINE';
    const priceToUse = isOnline ? batch.mrp : batch.sellingPrice;

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      const newQty = updatedCart[existingIndex].quantity + posQty;
      if (batch.availableQty < newQty) {
        alert(`Insufficient stock. Cumulative cart quantity (${newQty}) exceeds available batch stock (${batch.availableQty}).`);
        return;
      }
      const item = { ...updatedCart[existingIndex] };
      item.quantity = newQty;
      
      const subtotal = newQty * item.sellingPrice;
      const gstAmt = subtotal * (item.gstPercentage / 100);
      item.gstAmount = gstAmt;
      item.totalAmount = subtotal - (subtotal * (item.discountPercentage / 100)) + gstAmt;
      
      updatedCart[existingIndex] = item;
      setCart(updatedCart);
    } else {
      const subtotal = posQty * priceToUse;
      const gstAmt = subtotal * (batch.gstPercentage / 100);
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          expiryDate: batch.expiryDate,
          quantity: posQty,
          sellingPrice: priceToUse,
          mrp: batch.mrp,
          offlinePrice: batch.sellingPrice,
          onlinePrice: batch.mrp,
          discountPercentage: posDiscount,
          gstPercentage: batch.gstPercentage,
          gstAmount: gstAmt,
          totalAmount: subtotal - (subtotal * (posDiscount / 100)) + gstAmt
        }
      ]);
    }

    setSelectedProduct(null);
    setProductBatches([]);
    setSelectedBatchId('');
    setPosQty(1);
    setPosDiscount(0);
    searchInputRef.current?.focus();
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      const updated = [...cart];
      updated.splice(index, 1);
      setCart(updated);
      return;
    }
    const updated = [...cart];
    const item = { ...updated[index] };
    item.quantity = newQty;
    
    // Recalculate line total and gst
    const subtotal = newQty * item.sellingPrice;
    const gstAmt = subtotal * (item.gstPercentage / 100);
    item.gstAmount = gstAmt;
    item.totalAmount = subtotal - (subtotal * (item.discountPercentage / 100)) + gstAmt;
    
    updated[index] = item;
    setCart(updated);
  };

  const handleRemoveCartItem = (index: number) => {
    const removedItem = cart[index];
    if (!removedItem) return;

    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);

    showToast(`Removed ${removedItem.name} from cart`, 'info', 5000, {
      label: 'Undo',
      onClick: () => {
        setCart(prev => {
          const u = [...prev];
          u.splice(index, 0, removedItem);
          return u;
        });
        showToast("Restored cart item", "success");
      }
    });
  };

  const calculateCartSummary = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;

    cart.forEach(item => {
      const itemSub = item.quantity * item.sellingPrice;
      const itemDisc = itemSub * (item.discountPercentage / 100);
      const taxable = itemSub - itemDisc;
      const gst = taxable * (item.gstPercentage / 100);

      subtotal += itemSub;
      totalDiscount += itemDisc;
      totalGst += gst;
    });

    const grossTotal = subtotal - totalDiscount + totalGst;
    const grandTotal = Math.round(grossTotal);
    const roundOff = parseFloat((grandTotal - grossTotal).toFixed(2));

    return {
      subtotal,
      discount: totalDiscount,
      gst: totalGst,
      roundOff,
      total: grandTotal
    };
  };

  const cartSummary = calculateCartSummary();

  const handleNewBill = () => {
    if (cart.length > 0) {
      const oldCart = [...cart];
      const oldCustomer = selectedCustomer;
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('CASH');
      setAmountPaid(0);
      setMixedPayments([
        { method: 'CASH', amount: 0 },
        { method: 'UPI', amount: 0 },
        { method: 'CARD', amount: 0 },
        { method: 'CREDIT', amount: 0 }
      ]);
      showToast("Cleared active billing cart", "info", 5000, {
        label: "Undo",
        onClick: () => {
          setCart(oldCart);
          setSelectedCustomer(oldCustomer);
          showToast("Restored billing cart", "success");
        }
      });
    } else {
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod('CASH');
      setAmountPaid(0);
      setMixedPayments([
        { method: 'CASH', amount: 0 },
        { method: 'UPI', amount: 0 },
        { method: 'CARD', amount: 0 },
        { method: 'CREDIT', amount: 0 }
      ]);
    }
    searchInputRef.current?.focus();
  };

  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    
    // Enforce customer registration for CREDIT checkouts only
    if (paymentMethod === 'CREDIT' && !selectedCustomer) {
      alert("A registered customer is required for purchases on Credit. Please select or register a customer first.");
      return;
    }

    let splits: any[] = [];
    if (paymentMethod === 'MIXED') {
      const sum = mixedPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
      if (Math.abs(sum - cartSummary.total) > 0.01) {
        alert(`Split payments total (₹${sum}) must match the Invoice Net Total (₹${cartSummary.total}).`);
        return;
      }
      splits = mixedPayments.map(p => ({
        method: p.method,
        amount: parseFloat(p.amount) || 0
      }));
    }

    try {
      const payload: any = {
        paymentMethod,
        paymentStatus: paymentMethod === 'CREDIT' ? 'PENDING' : 'PAID',
        amountPaid: paymentMethod === 'MIXED' ? cartSummary.total : (amountPaid || cartSummary.total),
        invoiceType,
        items: cart.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          discountPercentage: it.discountPercentage,
          customPrice: it.sellingPrice // Sync the active UI selling price (online/offline) to backend
        })),
        payments: paymentMethod === 'MIXED' ? splits : undefined
      };

      if (selectedCustomer) payload.customerId = selectedCustomer.id;

      const res = await fetch(`${API_BASE}/billing/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Checkout transaction failed");
      const envelope = await res.json();
      const completedBill = envelope.data;
      
      handleFetchReceipt(completedBill.id);
      handleNewBill();
      fetchCatalogs();
    } catch (e: any) {
      alert("Checkout error: " + e.message);
    }
  };

  // --- HOLD BILLS ---
  const fetchHoldBills = async () => {
    try {
      const res = await fetch(`${API_BASE}/billing/hold`);
      if (res.ok) setHoldBills((await res.json()).data || []);
    } catch (e) {}
  };

  const handleHoldBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    try {
      const payload = {
        holdLabel: holdLabel.trim(),
        customerId: selectedCustomer?.id || null,
        customerName: selectedCustomer ? selectedCustomer.name : undefined,
        customerMobile: selectedCustomer ? selectedCustomer.mobile : undefined,
        items: cart.map(it => ({
          productId: it.productId,
          quantity: it.quantity,
          discountPercentage: it.discountPercentage
        }))
      };

      const res = await fetch(`${API_BASE}/billing/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Hold transaction failed");
      setIsHoldModalOpen(false);
      setHoldLabel('');
      handleNewBill();
      fetchHoldBills();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // --- RECEIPT PRINT EMULATION ---
  const handleFetchReceipt = async (billId: string, widthOverride?: '58mm' | '80mm' | '150x95mm') => {
    const width = widthOverride || receiptWidth;
    try {
      const res = await fetch(`${API_BASE}/print/${billId}?width=${width}`);
      if (res.ok) {
        const envelope = await res.json();
        setReceiptText(envelope.data.text);
        setActiveReceiptId(billId);
      }
    } catch (e) {}
  };

  // --- BILL HISTORY ---
  const fetchInvoices = async () => {
    setInvoiceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/billing?page=${invoicePage}&limit=${invoiceLimit}&search=${invoiceSearch}&status=${invoiceStatusFilter}`);
      if (res.ok) {
        const envelope = await res.json();
        setInvoices(envelope.data || []);
        setInvoiceTotal(envelope.meta?.total || 0);
      }
    } catch (e) {}
    finally { setInvoiceLoading(false); }
  };

  const handleCancelInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceDetail || !cancelReason) return;
    try {
      const res = await fetch(`${API_BASE}/billing/${invoiceDetail.id}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (!res.ok) throw new Error("Cancellation failed.");
      setIsCancelModalOpen(false);
      setInvoiceDetail(null);
      setCancelReason('');
      fetchInvoices();
      alert("Invoice Cancelled. Stock restored to database.");
    } catch (e: any) { alert(e.message); }
  };

  const handleOpenSalesReturnModal = (bill: any) => {
    setSalesReturnForm({
      billId: bill.id,
      items: bill.billItems.map((it: any) => ({
        billItemId: it.id,
        productName: it.batch.product.name,
        batchNumber: it.batch.batchNumber,
        sellingPrice: it.sellingPrice,
        boughtQty: it.quantity,
        returnedQty: it.returnedQty,
        quantity: 0,
        reason: 'EXPIRED'
      }))
    });
    setIsSalesReturnModalOpen(true);
  };

  const handleSalesReturnItemQty = (index: number, val: number) => {
    const updated = [...salesReturnForm.items];
    const item = { ...updated[index] };
    const maxRefundable = item.boughtQty - item.returnedQty;
    item.quantity = Math.min(maxRefundable, Math.max(0, val));
    updated[index] = item;
    setSalesReturnForm({ ...salesReturnForm, items: updated });
  };

  const handleSalesReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const active = salesReturnForm.items.filter((it: any) => it.quantity > 0);
    if (active.length === 0) return;

    try {
      const res = await fetch(`${API_BASE}/billing/return`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billId: salesReturnForm.billId,
          items: active.map((it: any) => ({
            billItemId: it.billItemId,
            quantity: it.quantity,
            reason: it.reason
          }))
        })
      });

      if (!res.ok) throw new Error("Refund failed.");
      setIsSalesReturnModalOpen(false);
      fetchInvoices();
      alert("Sales Return logged. Stock restored.");
    } catch (e: any) { alert(e.message); }
  };

  // --- REPORTS LOGIC ---
  const fetchReportsData = async () => {
    setReportsLoading(true);
    try {
      const q = `startDate=${reportsStartDate}&endDate=${reportsEndDate}`;
      if (reportsTab === 'sales') {
        const res = await fetch(`${API_BASE}/reports/sales?${q}`);
        if (res.ok) setSalesReportData((await res.json()).data || []);
      } else if (reportsTab === 'purchases') {
        const res = await fetch(`${API_BASE}/reports/purchases?${q}`);
        if (res.ok) setPurchaseReportData((await res.json()).data || []);
      } else if (reportsTab === 'gst') {
        const res = await fetch(`${API_BASE}/reports/gst?${q}`);
        if (res.ok) setGstReportData((await res.json()).data || []);
      }
    } catch (e) {
      console.warn("Failed to load reports", e);
    } finally {
      setReportsLoading(false);
    }
  };

  // CSV Exporters
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // --- SYSTEM SETTINGS LOGIC ---
  const fetchSettings = async (token?: string) => {
    logTrace("[Startup]\nFile: apps/desktop/renderer/src/app/page.tsx\nLine: 1274\nCalling fetchSettings()");
    console.time("fetchSettings");
    logTrace("[Medingen Init] fetchSettings started");
    // 5-second timeout: if /system-settings never responds, don't block startup forever.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    try {
      const activeToken = token || currentUser?.token;
      const headers: Record<string, string> = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch(`${API_BASE}/system-settings`, { 
        signal: controller.signal,
        headers
      });
      if (res.ok) {
        const envelope = await res.json();
        setSettingsForm(envelope.data);
        logTrace("[Medingen Init] fetchSettings data set successfully");
      } else {
        logTrace("[Medingen Init] fetchSettings returned non-ok status: " + res.status);
      }
    } catch (e: any) {
      logTrace("[Medingen Init] fetchSettings encountered error or aborted: " + e.message);
    } finally {
      clearTimeout(timeoutId);
      logTrace("[Medingen Init] fetchSettings finished");
      console.timeEnd("fetchSettings");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/system-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm)
      });
      if (res.ok) alert("Settings saved successfully!");
    } catch (e) {
      alert("Settings save failed");
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchLicense = async () => {
    try {
      const res = await fetch(`${API_BASE}/license`);
      if (res.ok) setLicenseInfo((await res.json()).data);
    } catch (e) {}
  };

  const handleActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationKey) return;
    try {
      const res = await fetch(`${API_BASE}/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: activationKey })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to activate");
      }
      alert("License Activated Successfully!");
      setActivationKey('');
      fetchLicense();
    } catch (e: any) {
      alert("Activation failed: " + e.message);
    }
  };

  // --- ADMIN LOGIC ---
  const fetchAdminUsers = async () => {
    try {
      const res = await fetch(`${API_BASE}/users-management?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(data.data || []);
        setAllUsers(data.data || []);
      }
    } catch (e) {}
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const isEdit = !!userForm.id;
      const url = isEdit ? `${API_BASE}/users-management/${userForm.id}` : `${API_BASE}/users-management`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userForm)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save user");
      }

      // Sync password locally
      if (userForm.passwordHash) {
        try {
          let cached = JSON.parse(localStorage.getItem('medingen_user_passwords') || '{}');
          cached[userForm.username] = userForm.passwordHash;
          localStorage.setItem('medingen_user_passwords', JSON.stringify(cached));
        } catch(err){}
      }

      setIsUserModalOpen(false);
      setUserForm({ username: '', passwordHash: '', role: 'CASHIER', status: true });
      fetchAdminUsers();
      alert("User record saved!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const fetchDbHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/maintenance/health`);
      if (res.ok) setDbHealth((await res.json()).data);
    } catch (e) {}
  };

  const triggerOptimize = async () => {
    setMaintenanceLoading(true);
    try {
      const res = await fetch(`${API_BASE}/maintenance/optimize`, { method: 'POST' });
      if (res.ok) {
        alert("Database indexes rebuilt and vacuumed successfully!");
        fetchDbHealth();
      }
    } catch (e) {
      alert("Reindexing failed");
    } finally {
      setMaintenanceLoading(false);
    }
  };

  const triggerBackupDownload = async () => {
    try {
      const res = await fetch(`${API_BASE}/maintenance/backup`);
      if (res.ok) {
        const envelope = await res.json();
        const str = JSON.stringify(envelope.data, null, 2);
        const blob = new Blob([str], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medingen_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (e) {
      alert("Backup failed");
    }
  };

  const triggerBackupRestore = async (file: File) => {
    const isConfirm = confirm("Are you sure you want to RESTORE? This deletes active local tables.");
    if (!isConfirm) return;
    
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await fetch(`${API_BASE}/maintenance/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      if (res.ok) {
        alert("Database Restored successfully!");
        fetchCatalogs();
      } else {
        throw new Error("Restore script failed");
      }
    } catch (err: any) { alert("Restore failed: " + err.message); }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${API_BASE}/audit-logs?page=${auditPage}&search=${auditSearch}&module=${auditModuleFilter}`);
      if (res.ok) {
        const envelope = await res.json();
        setAuditLogs(envelope.data || []);
        setAuditTotal(envelope.meta?.total || 0);
      }
    } catch (e) {}
  };

  // --- SYNC CENTER SERVICES ---
  const fetchSyncStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/status`);
      if (res.ok) setSyncStatus((await res.json()).data);
    } catch (e) {}
  };

  const fetchSyncConflicts = async () => {
    try {
      const res = await fetch(`${API_BASE}/sync/conflicts`);
      if (res.ok) setSyncConflicts((await res.json()).data || []);
    } catch (e) {}
  };

  const triggerForceSync = async () => {
    setSyncLoading(true);
    try {
      const res = await fetch(`${API_BASE}/sync/force`, { method: 'POST' });
      if (res.ok) {
        alert("Manual sync processing initiated!");
        fetchSyncStatus();
        fetchSyncConflicts();
      }
    } catch (e) {
      alert("Manual sync failed");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleResolveConflict = async (id: string, resolution: 'LOCAL_WINS' | 'CLOUD_WINS') => {
    try {
      const res = await fetch(`${API_BASE}/sync/conflicts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution })
      });
      if (res.ok) {
        alert("Conflict resolved and override applied.");
        fetchSyncConflicts();
        fetchSyncStatus();
      }
    } catch (e) {}
  };

  // Minimal CRUD fetching for MDM components to maintain code dependencies
  const fetchProducts = async () => {
    try {
      const q = `page=${productPage}&limit=${productLimit}&search=${productSearch}` +
        `&drugSchedule=${productDrugScheduleFilter}` +
        `&medicineClassification=${productMedicineClassificationFilter}` +
        `&prescriptionRequired=${productPrescriptionRequiredFilter}` +
        `&controlledDrug=${productControlledDrugFilter}`;
      const res = await fetch(`${API_BASE}/products?${q}`);
      if (res.ok) {
        const envelope = await res.json();
        setProducts(envelope.data || []);
        setProductTotal(envelope.meta?.total || 0);
      }
    } catch (e) {}
  };
  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/purchase-orders?page=${purchasePage}&limit=100&search=${purchaseSearch}`);
      if (res.ok) setPurchaseOrders((await res.json()).data || []);
    } catch (e) {}
  };
  const fetchInventories = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory?page=${inventoryPage}&search=${inventorySearch}&lowStock=${inventoryLowStockFilter}`);
      if (res.ok) setInventories((await res.json()).data || []);
    } catch (e) {}
  };
  const fetchBatches = async () => {
    try {
      const res = await fetch(`${API_BASE}/batches?page=${batchPage}&search=${batchSearch}&status=${batchStatusFilter}`);
      if (res.ok) setBatches((await res.json()).data || []);
    } catch (e) {}
  };
  const fetchLedgers = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/ledger?page=${ledgerPage}&productId=${ledgerProductFilter}`);
      if (res.ok) setLedgers((await res.json()).data || []);
    } catch (e) {}
  };
  const fetchAdjustments = async () => {
    try {
      const res = await fetch(`${API_BASE}/inventory/adjustments?page=${adjustmentPage}`);
      if (res.ok) setAdjustments((await res.json()).data || []);
    } catch (e) {}
  };

  const handleOpenAdjustModal = (batch: any) => {
    setAdjustForm({
      batchId: batch.id,
      type: 'INCREASE',
      quantity: 1,
      reason: 'PHYSICAL_COUNT',
      remarks: ''
    });
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/inventory/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: adjustForm.batchId,
          type: adjustForm.type,
          quantity: parseInt(adjustForm.quantity, 10),
          reason: adjustForm.reason,
          remarks: adjustForm.remarks
        })
      });
      if (!res.ok) throw new Error("Adjustment failed.");
      setIsAdjustModalOpen(false);
      fetchBatches();
      fetchInventories();
      alert("Stock adjusted successfully!");
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleLogout = () => {
    const check = confirm("Are you sure you want to log out of the station?");
    if (!check) return;
    localStorage.removeItem('medingen_session');
    setCurrentUser(null);
    setProfileDropdownOpen(false);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userProfilePassword.new !== userProfilePassword.confirm) {
      alert("Passwords do not match!");
      return;
    }
    
    // Perform simulated password change on client
    try {
      let cached = JSON.parse(localStorage.getItem('medingen_user_passwords') || '{}');
      cached[currentUser.username] = userProfilePassword.new;
      localStorage.setItem('medingen_user_passwords', JSON.stringify(cached));
      
      // Update backend record
      fetch(`${API_BASE}/users-management/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordHash: userProfilePassword.new })
      });
      
      alert("Your password has been changed successfully.");
      setActiveDialog(null);
      setUserProfilePassword({ current: '', new: '', confirm: '' });
    } catch(err) {
      alert("Failed to update password");
    }
  };

  // Notification methods
  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const unreadNotificationCount = notifications.filter(n => !n.read).length;

  // Flat Search Results for Command Palette
  const navCommands = useMemo(() => [
    { type: 'COMMAND', name: 'Go to POS Tab (Billing Desk)', action: () => { setActiveTab('pos'); }, tab: 'pos' },
    { type: 'COMMAND', name: 'Go to Dashboard Summary', action: () => { setActiveTab('dashboard'); }, tab: 'dashboard' },
    { type: 'COMMAND', name: 'Go to Inventory Stock Ledger', action: () => { setActiveTab('inventory'); setInventorySubTab('stock'); }, tab: 'inventory' },
    { type: 'COMMAND', name: 'Go to Products Catalog', action: () => { setActiveTab('products'); }, tab: 'products' },
    { type: 'COMMAND', name: 'Go to Suppliers Directory', action: () => { setActiveTab('suppliers'); }, tab: 'suppliers' },
    { type: 'COMMAND', name: 'Go to Billing History Logs', action: () => { setActiveTab('history'); }, tab: 'history' },
    { type: 'COMMAND', name: 'Go to Financial Reports', action: () => { setActiveTab('reports'); }, tab: 'reports' },
    { type: 'COMMAND', name: 'Go to Offline Synchronization', action: () => { setActiveTab('sync'); }, tab: 'sync' },
    { type: 'COMMAND', name: 'Go to System & User Settings', action: () => { setActiveTab('settings'); }, tab: 'settings' },
    { type: 'COMMAND', name: 'Go to Administrator Panel', action: () => { setActiveTab('admin'); }, tab: 'admin' },
  ], []);

  const flatSearchResults = useMemo(() => {
    const q = globalQuery.toLowerCase().trim();
    
    // Filter Commands
    const filteredCommands = q.startsWith('>') 
      ? navCommands.filter(c => c.name.toLowerCase().includes(q.substring(1).trim()))
      : navCommands.filter(c => c.name.toLowerCase().includes(q));

    if (!q) {
      return filteredCommands.map(c => ({ ...c, uniqueKey: `cmd-${c.name}` }));
    }

    // Filter Products
    const matchedProducts = allProducts
      .filter(p => p.name.toLowerCase().includes(q) || p.genericName?.toLowerCase().includes(q) || p.barcode?.includes(q))
      .slice(0, 5)
      .map(p => ({
        type: 'PRODUCT',
        name: p.name,
        subtitle: `Sku: ${p.sku || 'N/A'} | Barcode: ${p.barcode || 'N/A'}`,
        action: () => { setActiveTab('products'); setProductSearch(p.name); },
        uniqueKey: `prod-${p.id}`
      }));

    // Filter Suppliers
    const matchedSuppliers = allSuppliers
      .filter(s => s.name.toLowerCase().includes(q) || s.phone?.includes(q))
      .slice(0, 5)
      .map(s => ({
        type: 'SUPPLIER',
        name: s.name,
        subtitle: `Gstin: ${s.gstin || 'N/A'} | Phone: ${s.phone || 'N/A'}`,
        action: () => { setActiveTab('suppliers'); },
        uniqueKey: `sup-${s.id}`
      }));

    // Filter Invoices
    const matchedInvoices = invoices
      .filter(inv => inv.billNumber?.toLowerCase().includes(q))
      .slice(0, 5)
      .map(inv => ({
        type: 'INVOICE',
        name: inv.billNumber,
        subtitle: `Total: ₹${inv.netAmount} | Status: ${inv.status}`,
        action: () => { setActiveTab('history'); setInvoiceSearch(inv.billNumber); },
        uniqueKey: `inv-${inv.id}`
      }));

    return [
      ...matchedProducts,
      ...matchedSuppliers,
      ...matchedInvoices,
      ...filteredCommands.map(c => ({ ...c, uniqueKey: `cmd-${c.name}` }))
    ];
  }, [globalQuery, allProducts, allSuppliers, invoices, navCommands]);

  const handlePaletteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatSearchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setPaletteSelectedIndex(prev => (prev + 1) % flatSearchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setPaletteSelectedIndex(prev => (prev - 1 + flatSearchResults.length) % flatSearchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selectedItem = flatSearchResults[paletteSelectedIndex];
      if (selectedItem) {
        selectedItem.action();
        setSearchOpen(false);
        setGlobalQuery('');
      }
    }
  };

  // Reset keyboard cursor on query change
  useEffect(() => {
    setPaletteSelectedIndex(0);
  }, [globalQuery, searchOpen]);

  // The splash screen is now owned by layout.tsx as instant HTML.
  // It is dismissed via window.hideAppLoader() when setAuthChecked(true) fires.
  // No React loading barrier needed here — authChecked being false just means
  // the HTML overlay is still visible; rendering null prevents a flash of wrong content.
  if (!authChecked) return null;

  // Not logged in -> Show Login view
  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          fetchSettings(); // Refresh settings details upon login
        }}
        localDbConnected={localDbConnected}
        syncStatus={syncStatus}
        allUsers={allUsers}
      />
    );
  }

  const showSetupWizard = currentUser && currentUser.role === 'ADMIN' && (!settingsForm || !settingsForm.gstin || settingsForm.gstin.trim() === '');

  return (
    <div className={`min-h-screen bg-white text-gray-800 flex flex-col font-sans select-none antialiased ${density === 'compact' ? 'density-compact' : 'density-comfortable'}`}>
      {showSetupWizard && (
        <SetupWizardModal
          settingsForm={settingsForm}
          setSettingsForm={setSettingsForm}
          onComplete={async (updatedSettings) => {
            setSettingsForm(updatedSettings);
          }}
          currentUser={currentUser}
        />
      )}
      {/* Top Header Navigation */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50 px-5 py-3 flex items-center justify-between">
        
        {/* Brand section */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-12h.008v.008H12v-.008z" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-gray-800">{settingsForm.storeName || 'Medingen Pharmacy'}</h1>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">ERP Desk</p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-4">
          
          {/* Quick billing screen trigger */}
          <button 
            onClick={() => setActiveTab('pos')} 
            className="px-3.5 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-lg active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Billing Screen (F2)
          </button>

          {/* Universal search trigger button */}
          <button 
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-800 transition-colors cursor-pointer hidden md:flex items-center gap-2"
          >
            <FiSearch className="text-gray-400 shrink-0" size={16} />
            <span className="text-xs text-gray-400 font-semibold pr-2">Search ERP...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-gray-100 border border-gray-200 text-[10px] text-gray-400 font-bold">Ctrl+K</kbd>
          </button>

          {/* Notification bell center */}
          <div className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors relative cursor-pointer"
            >
              <FiBell className="shrink-0" size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[9px] font-extrabold shadow-sm animate-pulse">
                  {unreadNotificationCount}
                </span>
              )}
            </button>
            
            {notificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
                  <div className="p-3.5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <span className="font-bold text-gray-600 uppercase tracking-wider text-[10px]">Notification Center</span>
                    <button onClick={clearAllNotifications} className="text-[10px] text-rose-600 hover:underline">Clear all</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400">No new updates or alerts.</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-3.5 hover:bg-gray-50 flex justify-between gap-2.5 items-start ${n.read ? 'opacity-60' : ''}`}>
                          <div className="space-y-0.5">
                            <span className={`font-bold block ${n.type === 'STOCK_WARN' ? 'text-amber-400' : 'text-rose-600'}`}>{n.title}</span>
                            <p className="text-gray-500 leading-normal">{n.message}</p>
                          </div>
                          {!n.read && (
                            <button onClick={() => markNotificationRead(n.id)} className="text-[9px] text-primary hover:underline shrink-0">Read</button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* User profile dropdown menu */}
          <div className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20">
                {currentUser?.username?.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left text-xs leading-none">
                <div className="font-bold text-gray-800">{currentUser?.username}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{currentUser?.role}</div>
              </div>
              <svg className="w-3.5 h-3.5 text-gray-400 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {profileDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setProfileDropdownOpen(false)} />
                <div className="absolute right-0 mt-2.5 w-52 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs text-gray-600">
                  <div className="p-3 bg-gray-50 border-b border-gray-200 flex flex-col gap-0.5">
                    <span className="font-bold text-gray-800 leading-none">{currentUser?.username}</span>
                    <span className="text-[10px] text-gray-400">{currentUser?.role}</span>
                  </div>
                  <div className="p-1.5 space-y-0.5">
                    <button onClick={() => { setProfileDropdownOpen(false); setActiveDialog('profile'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> My Profile</button>
                    <button onClick={() => { setProfileDropdownOpen(false); setActiveDialog('password'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m-5-2a2 2 0 00-2 2m5 0a2 2 0 012 2m-5-2a2 2 0 00-2 2m5 4a3 3 0 11-6 0 3 3 0 016 0z" /></svg> Change Password</button>
                    <button onClick={() => { setProfileDropdownOpen(false); setActiveDialog('preferences'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> Preferences</button>
                    <button onClick={() => { setProfileDropdownOpen(false); setActiveDialog('about'); }} className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"><svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> About ERP</button>
                    <div className="border-t border-gray-100 my-1.5" />
                    <button onClick={handleLogout} className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-600 hover:text-rose-400 flex items-center gap-2"><FiLogOut className="w-4 h-4" /> Sign Out</button>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      </header>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Navigation Sidebar */}
        <aside className={`border-r border-gray-200 bg-primary transition-all duration-300 flex flex-col justify-between ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}>
          <div className="p-3.5 space-y-6 overflow-y-auto overflow-x-hidden flex-1">
            
            {sidebarCategories.map((cat, catIdx) => (
              <div key={catIdx}>
                {!sidebarCollapsed && (
                  <p className="text-[10px] font-bold text-white/60 tracking-wider uppercase px-3.5 mb-2.5">
                    {cat.categoryName}
                  </p>
                )}
                <nav className="space-y-1">
                  {cat.items.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                          sidebarCollapsed ? 'justify-center px-0' : 'px-3.5'
                        } ${
                          activeTab === item.id
                            ? 'bg-white/20 text-white border border-white/30 font-semibold'
                            : 'text-white/80 hover:bg-white/10 hover:text-white'
                        }`}
                        title={item.title}
                      >
                        <Icon className="transition-all duration-200 shrink-0" size={sidebarCollapsed ? 18 : 20} />
                        {!sidebarCollapsed && <span>{item.title}</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}

          </div>
        </aside>

        {/* Workspace Display Grid */}
        <main className="flex-1 p-6 overflow-y-auto bg-gray-50">
          
          {activeTab === 'dashboard' && (
            <DashboardTab
              dashboardStats={dashboardStats}
              lowStockList={lowStockList}
              expiringList={expiringList}
              dashboardLoading={dashboardLoading}
              setActiveTab={setActiveTab}
              setIsCustomerModalOpen={setIsCustomerModalOpen}
              syncStatus={syncStatus}
              invoices={invoices}
              purchaseOrders={purchaseOrders}
            />
          )}

          {activeTab === 'pos' && (
            <PosTab
              cart={cart}
              setCart={setCart}
              posSearch={posSearch}
              setPosSearch={setPosSearch}
              posSearchResults={posSearchResults}
              selectedProduct={selectedProduct}
              setSelectedProduct={setSelectedProduct}
              productBatches={productBatches}
              selectedBatchId={selectedBatchId}
              setSelectedBatchId={setSelectedBatchId}
              posQty={posQty}
              setPosQty={setPosQty}
              posDiscount={posDiscount}
              setPosDiscount={setPosDiscount}
              customerSearch={customerSearch}
              setCustomerSearch={setCustomerSearch}
              customerResults={customerResults}
              setCustomerResults={setCustomerResults}
              selectedCustomer={selectedCustomer}
              setSelectedCustomer={setSelectedCustomer}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              amountPaid={amountPaid}
              setAmountPaid={setAmountPaid}
              mixedPayments={mixedPayments}
              setMixedPayments={setMixedPayments}
              invoiceType={invoiceType}
              setInvoiceType={setInvoiceType}
              cartSummary={cartSummary}
              modeOfSell={modeOfSell}
              setModeOfSell={setModeOfSell}
              
              searchInputRef={searchInputRef}
              customerInputRef={customerInputRef}
              qtyInputRef={qtyInputRef}
              cashPaidInputRef={cashPaidInputRef}

              handleSelectProduct={handleSelectProduct}
              handleAddToCart={handleAddToCart}
              handleUpdateCartQty={handleUpdateCartQty}
              handleRemoveCartItem={handleRemoveCartItem}
              handleCheckoutSubmit={handleCheckoutSubmit}
              setIsHoldModalOpen={setIsHoldModalOpen}
              setIsCustomerModalOpen={setIsCustomerModalOpen}
              setNewCustomerForm={setNewCustomerForm}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              invoices={invoices}
              invoiceTotal={invoiceTotal}
              invoicePage={invoicePage}
              invoiceLimit={invoiceLimit}
              invoiceSearch={invoiceSearch}
              setInvoiceSearch={setInvoiceSearch}
              invoiceStatusFilter={invoiceStatusFilter}
              setInvoiceStatusFilter={setInvoiceStatusFilter}
              invoiceLoading={invoiceLoading}
              setInvoicePage={setInvoicePage}
              setInvoiceDetail={setInvoiceDetail}
              handleFetchReceipt={handleFetchReceipt}
              setIsCancelModalOpen={setIsCancelModalOpen}
              handleOpenSalesReturnModal={handleOpenSalesReturnModal}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsTab
              reportsTab={reportsTab}
              setReportsTab={setReportsTab}
              reportsStartDate={reportsStartDate}
              setReportsStartDate={setReportsStartDate}
              reportsEndDate={reportsEndDate}
              setReportsEndDate={setReportsEndDate}
              salesReportData={salesReportData}
              purchaseReportData={purchaseReportData}
              gstReportData={gstReportData}
              reportsLoading={reportsLoading}
              fetchReportsData={fetchReportsData}
              exportToCSV={exportToCSV}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              settingsForm={settingsForm}
              setSettingsForm={setSettingsForm}
              settingsLoading={settingsLoading}
              handleSaveSettings={handleSaveSettings}
              licenseInfo={licenseInfo}
              activationKey={activationKey}
              setActivationKey={setActivationKey}
              handleActivateLicense={handleActivateLicense}
              density={density}
              setDensity={setDensity}
            />
          )}

          {activeTab === 'admin' && (
            <AdminTab
              adminTab={adminTab}
              setAdminTab={setAdminTab}
              adminUsers={adminUsers}
              userForm={userForm}
              setUserForm={setUserForm}
              setIsUserModalOpen={setIsUserModalOpen}
              fetchAdminUsers={fetchAdminUsers}
              API_BASE={API_BASE}
              triggerBackupDownload={triggerBackupDownload}
              dbHealth={dbHealth}
              triggerOptimize={triggerOptimize}
              maintenanceLoading={maintenanceLoading}
              auditLogs={auditLogs}
              auditTotal={auditTotal}
              auditPage={auditPage}
              setAuditPage={setAuditPage}
              auditSearch={auditSearch}
              setAuditSearch={setAuditSearch}
              auditModuleFilter={auditModuleFilter}
              setAuditModuleFilter={setAuditModuleFilter}
              triggerBackupRestore={triggerBackupRestore}
            />
          )}

          {activeTab === 'sync' && (
            <SyncTab
              syncStatus={syncStatus}
              syncConflicts={syncConflicts}
              syncLoading={syncLoading}
              triggerForceSync={triggerForceSync}
              handleResolveConflict={handleResolveConflict}
            />
          )}

          {activeTab === 'owner' && (
            <OwnerTab
              dashboardStats={dashboardStats}
              syncStatus={syncStatus}
            />
          )}

          {activeTab === 'purchases' && (
            <PurchasesTab
              purchaseOrders={purchaseOrders}
              allSuppliers={allSuppliers}
              allProducts={allProducts}
              fetchPurchaseOrders={fetchPurchaseOrders}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryTab
              inventorySubTab={inventorySubTab}
              setInventorySubTab={setInventorySubTab}
              inventories={inventories}
              batches={batches}
              handleOpenAdjustModal={handleOpenAdjustModal}
              allProducts={allProducts}
              purchaseOrders={purchaseOrders}
              invoices={invoices}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'products' && (
            <ProductsTab
              products={products}
              productPage={productPage}
              setProductPage={setProductPage}
              productLimit={productLimit}
              setProductLimit={setProductLimit}
              productTotal={productTotal}
              productSearch={productSearch}
              setProductSearch={setProductSearch}
              inventories={inventories}
              batches={batches}
              purchaseOrders={purchaseOrders}
              invoices={invoices}
              allCategories={allCategories}
              allManufacturers={allManufacturers}
              allSuppliers={allSuppliers}
              fetchProducts={fetchProducts}
              API_BASE={API_BASE}
              setActiveTab={setActiveTab}
              setInventorySubTab={setInventorySubTab}
              setLedgerProductFilter={setLedgerProductFilter}
              currentUser={currentUser}
              productDrugScheduleFilter={productDrugScheduleFilter}
              setProductDrugScheduleFilter={setProductDrugScheduleFilter}
              productMedicineClassificationFilter={productMedicineClassificationFilter}
              setProductMedicineClassificationFilter={setProductMedicineClassificationFilter}
              productPrescriptionRequiredFilter={productPrescriptionRequiredFilter}
              setProductPrescriptionRequiredFilter={setProductPrescriptionRequiredFilter}
              productControlledDrugFilter={productControlledDrugFilter}
              setProductControlledDrugFilter={setProductControlledDrugFilter}
            />
          )}

          {activeTab === 'suppliers' && (
            <SuppliersTab
              suppliers={allSuppliers}
              fetchSuppliers={fetchCatalogs}
              API_BASE={API_BASE}
            />
          )}

          {activeTab === 'drugRegister' && (
            <DrugRegisterTab
              currentUser={currentUser}
              allUsers={allUsers}
            />
          )}

        </main>
      </div>

      {/* Sticky Bottom Status Bar */}
      <footer className="border-t border-gray-200 bg-white px-5 py-2 text-[10px] font-mono text-gray-400 flex flex-wrap justify-between items-center gap-2">
        <div className="flex gap-4">
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${localDbConnected ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-rose-500'}`} />
            DB: {localDbConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${syncStatus?.activeWorkers ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : 'bg-slate-700'}`} />
            CLOUD SYNC: {syncStatus?.activeWorkers ? 'ONLINE' : 'OFFLINE'}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${dbHealth?.status === 'HEALTHY' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            WORKER STATUS: OK
          </span>
        </div>
        <div className="flex gap-4">
          <span>OPERATOR: <span className="text-gray-600 font-bold uppercase">{currentUser?.username} ({currentUser?.role})</span></span>
          <span>SHIFT: <span className="text-gray-600 font-bold uppercase">{currentShift.split(' ')[0]} SHIFT</span></span>
          <span>PRINTER: <span className="text-gray-600 font-bold">{settingsForm.printerType || '80MM'}</span></span>
          <span>LICENSE: <span className={licenseInfo?.status === 'ACTIVE' ? 'text-emerald-400 font-bold' : 'text-rose-400'}>{licenseInfo?.status || 'N/A'}</span></span>
          <span>VERSION: <span className="text-gray-600 font-bold">1.0.4</span></span>
          <span className="text-gray-500 font-semibold border-l border-gray-200 pl-4">{currentTime}</span>
        </div>
      </footer>

      {/* ==================== DIALOGS & OVERLAYS ==================== */}

      {/* Universal Search Modal (Ctrl + K Command Palette) */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/70 backdrop-blur-sm pt-20 animate-fadeIn text-xs">
          <div className="w-full max-w-xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="relative">
              <input
                type="text"
                autoFocus
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={handlePaletteKeyDown}
                placeholder="Search products, invoices, commands (type '>' for commands)..."
                className="w-full pl-11 pr-12 py-4 bg-white border-b border-gray-200 text-gray-800 text-sm focus:outline-none placeholder-slate-500 font-sans"
              />
              <svg className="absolute left-4 top-4.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <kbd className="absolute right-4 top-4.5 px-2 py-0.5 rounded bg-white border border-gray-200 text-[10px] text-gray-400 font-bold">ESC</kbd>
            </div>
            
            <div className="p-2 max-h-[380px] overflow-y-auto space-y-1.5 bg-gray-50/50">
              {flatSearchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p className="font-bold">No results found</p>
                  <p className="mt-1">Try another search keyword.</p>
                </div>
              ) : (
                flatSearchResults.map((item, idx) => {
                  const isSelected = idx === paletteSelectedIndex;
                  return (
                    <div
                      key={item.uniqueKey}
                      onClick={() => {
                        item.action();
                        setSearchOpen(false);
                        setGlobalQuery('');
                      }}
                      className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-all ${
                        isSelected 
                          ? 'bg-primary-light border-l-4 border-primary text-gray-850 translate-x-1 shadow-sm' 
                          : 'bg-white hover:bg-gray-50 text-gray-600 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                          item.type === 'PRODUCT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/25' :
                          item.type === 'SUPPLIER' ? 'bg-orange-50 text-orange-600 border border-orange-200/25' :
                          item.type === 'INVOICE' ? 'bg-sky-50 text-sky-600 border border-sky-200/25' :
                          'bg-primary-light text-primary border border-primary/20'
                        }`}>
                          {item.type || 'COMMAND'}
                        </span>
                        <div>
                          <span className="font-bold text-gray-800 block">{item.name}</span>
                          {item.subtitle && <span className="text-[10px] text-gray-500">{item.subtitle}</span>}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-455">
                        {isSelected ? '⏎ Select' : 'Click'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="px-4 py-2 border-t border-gray-200 bg-white text-[9px] text-gray-400 font-mono flex justify-between items-center">
              <span>↑↓ Navigation</span>
              <span>⏎ Trigger Command</span>
              <span>ESC Close</span>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcut Help Dialog */}
      {isShortcutHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-xs text-gray-500">
          <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-6 space-y-4 animate-scale-in">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2.5">
              <h3 className="text-base font-bold text-gray-850 uppercase tracking-wider flex items-center gap-2">
                ⌨️ Keyboard Shortcuts Help
              </h3>
              <button onClick={() => setIsShortcutHelpOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm font-bold">✕</button>
            </div>
            <div className="space-y-2 bg-gray-50 p-4 border border-gray-200 rounded-xl max-h-72 overflow-y-auto font-mono text-[11px]">
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">Ctrl + K</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Command Palette</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">?  /  Ctrl + /</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Shortcut Helper</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F2</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">New Invoice (Clear Cart)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F3</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Focus Medicine Search</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F4</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Focus Customer Mobile</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F5</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Submit Bill & Print</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F6</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Hold Bill</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">F8</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Focus Cash Paid</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-150">
                <span className="text-gray-700 font-semibold">ESC</span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-gray-300 font-bold">Close Dialogs / Modals</span>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setIsShortcutHelpOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-lg cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialogue Modal Overlay (Change password, My Profile, Preferences, About) */}
      {activeDialog === 'profile' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">My Operator Profile</h3>
            <div className="space-y-2 bg-white p-4 border border-gray-200 rounded-xl">
              <div>Username: <span className="font-bold text-gray-800">{currentUser?.username}</span></div>
              <div>Assigned Profile: <span className="font-bold text-gray-800">{currentUser?.role}</span></div>
              <div>Duty Shift: <span className="font-bold text-primary">{currentShift}</span></div>
              <div>Station: <span className="font-bold text-gray-800">{settingsForm.storeName}</span></div>
              <div>Session Login Time: <span className="font-semibold text-gray-500">{new Date(currentUser?.loginTime).toLocaleTimeString()}</span></div>
            </div>
            <div className="flex justify-end">
              <button onClick={() => setActiveDialog(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-700 font-bold rounded-lg cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {activeDialog === 'password' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6">
            <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider mb-4">Change Operator Password</h3>
            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">New Password *</label>
                <input
                  type="password"
                  required
                  value={userProfilePassword.new}
                  onChange={(e) => setUserProfilePassword({ ...userProfilePassword, new: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  value={userProfilePassword.confirm}
                  onChange={(e) => setUserProfilePassword({ ...userProfilePassword, confirm: e.target.value })}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-xs"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setActiveDialog(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-700 font-bold rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary text-slate-955 font-bold rounded-lg cursor-pointer">Change Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeDialog === 'preferences' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">Interface Preferences</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Theme Style</label>
                <select className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700">
                  <option>Medingen Dark Carbon (Active)</option>
                  <option disabled>Emerald Classic (Premium Only)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-gray-400 font-bold">Receipt Layout Size</label>
                <select 
                  value={receiptWidth}
                  onChange={(e: any) => setReceiptWidth(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700"
                >
                  <option value="80mm">80mm Paper width (Standard)</option>
                  <option value="58mm">58mm Paper width (Compact)</option>
                  <option value="150x95mm">150mm x 95mm (Medicine Label)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button onClick={() => setActiveDialog(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-700 font-bold rounded-lg cursor-pointer">Save & Exit</button>
            </div>
          </div>
        </div>
      )}

      {activeDialog === 'about' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="text-center">
              <div className="mx-auto w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-500 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-955" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-12h.008v.008H12v-.008z" /></svg>
              </div>
              <h4 className="text-sm font-bold text-gray-800">Medingen Pharmacy ERP</h4>
              <p className="text-[10px] text-gray-400 font-bold">Hybrid Desktop & Billing Suite</p>
            </div>
            
            <div className="space-y-1.5 bg-white p-4 border border-gray-200 rounded-xl font-mono text-[10px] text-gray-500">
              <div className="flex justify-between"><span>App Version:</span><span className="text-gray-700">1.0.4</span></div>
              <div className="flex justify-between"><span>Prisma Engine:</span><span className="text-gray-700">v5.12.0</span></div>
              <div className="flex justify-between"><span>Database:</span><span className="text-gray-700">PostgreSQL 16</span></div>
              <div className="flex justify-between"><span>Next.js API:</span><span className="text-gray-700">v16.2.9</span></div>
              <div className="flex justify-between"><span>License Type:</span><span className="text-emerald-450 font-bold">{licenseInfo?.status || 'N/A'}</span></div>
              <div className="flex justify-between"><span>Company:</span><span className="text-gray-700">Medingen Solutions Group</span></div>
            </div>

            <div className="text-center text-[10px] text-gray-400">
              For system technical support, call: <span className="text-primary hover:underline cursor-pointer">+91 99887 76655</span>
            </div>

            <div className="flex justify-end">
              <button onClick={() => setActiveDialog(null)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-gray-700 font-bold rounded-lg cursor-pointer">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Register Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4">Register New Customer</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.name}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={newCustomerForm.mobile}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, mobile: e.target.value })}
                  placeholder="Enter 10-digit mobile"
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700 font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 font-semibold">
              <button onClick={() => setIsCustomerModalOpen(false)} className="px-3.5 py-1.5 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Cancel</button>
              <button
                onClick={async () => {
                  if (!newCustomerForm.name || !newCustomerForm.mobile) return;
                  try {
                    const res = await fetch(`${API_BASE}/customers`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(newCustomerForm)
                    });
                    if (!res.ok) throw new Error("Registration failed.");
                    const added = await res.json();
                    // ResponseTransformInterceptor wraps created customer in { success: true, data: customer }
                    setSelectedCustomer(added.data || added);
                    setIsCustomerModalOpen(false);
                  } catch (e: any) { alert(e.message); }
                }}
                className="px-3.5 py-1.5 rounded bg-primary text-slate-955 font-bold cursor-pointer"
              >
                Register & Select
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hold Bill Modal */}
      {isHoldModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-gray-800 mb-2">Hold Active Transaction</h3>
            <p className="text-xs text-gray-400 mb-4">Temporarily save this bill. Enter a label to identify it.</p>
            <form onSubmit={handleHoldBillSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 uppercase tracking-wider font-bold">Hold Label *</label>
                <input
                  type="text"
                  required
                  value={holdLabel}
                  onChange={(e) => setHoldLabel(e.target.value)}
                  placeholder="e.g. Counter 2 Customer"
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700"
                />
              </div>
              <div className="flex justify-end gap-3 font-semibold">
                <button type="button" onClick={() => setIsHoldModalOpen(false)} className="px-3.5 py-1.5 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 rounded bg-primary text-slate-955 font-bold cursor-pointer">Confirm Hold</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sales Return Modal */}
      {isSalesReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Process Sales Return</h3>
              <button onClick={() => setIsSalesReturnModalOpen(false)} className="text-gray-500 hover:text-gray-800 transition-all cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleSalesReturnSubmit} className="p-6 space-y-4">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {salesReturnForm.items.map((it: any, index: number) => (
                  <div key={index} className="bg-white border border-gray-200 p-3 rounded-lg flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-gray-700">{it.productName}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {it.batchNumber} | Sold: {it.boughtQty}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="0"
                        max={it.boughtQty - it.returnedQty}
                        value={it.quantity}
                        onChange={(e) => handleSalesReturnItemQty(index, parseInt(e.target.value, 10) || 0)}
                        className="w-16 px-2 py-1 rounded bg-white border border-gray-200 text-center text-gray-800"
                      />
                      <select
                        value={it.reason}
                        onChange={(e) => {
                          const updated = [...salesReturnForm.items];
                          updated[index].reason = e.target.value;
                          setSalesReturnForm({ ...salesReturnForm, items: updated });
                        }}
                        className="px-2 py-1 rounded bg-white border border-gray-200"
                      >
                        <option value="EXPIRED">Expired Medicine</option>
                        <option value="WRONG_ITEM">Wrong Dispensing</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4 font-semibold">
                <button type="button" onClick={() => setIsSalesReturnModalOpen(false)} className="px-4 py-2 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded bg-rose-500 text-white font-bold cursor-pointer">Process Returns</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Dialog */}
      {invoiceDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">Invoice Details: {invoiceDetail.billNumber}</h3>
              <button onClick={() => setInvoiceDetail(null)} className="text-gray-500 hover:text-gray-800 transition-all cursor-pointer">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 border border-gray-200 rounded-xl">
                <div>
                  <span className="text-gray-400 block">Customer</span>
                  <span className="font-bold text-gray-700">{invoiceDetail.customer?.name || 'Walk-in Customer'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Date</span>
                  <span className="font-semibold text-gray-600">{new Date(invoiceDetail.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Total Tax</span>
                  <span className="font-semibold text-gray-600">₹{invoiceDetail.gstAmount.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block">Status</span>
                  <span className="font-bold text-primary">{invoiceDetail.status}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-700">Billed items</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-white text-gray-500 border-b border-gray-200 text-[10px]">
                      <tr>
                        <th className="py-2.5 px-4">Medicine</th>
                        <th className="py-2.5 px-4">Batch Number</th>
                        <th className="py-2.5 px-4">MRP / Price</th>
                        <th className="py-2.5 px-4">Qty</th>
                        <th className="py-2.5 px-4 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceDetail.billItems.map((it: any, i: number) => (
                        <tr key={i} className="hover:bg-white">
                          <td className="py-2.5 px-4 font-semibold text-gray-700">{it.batch.product.name}</td>
                          <td className="py-2.5 px-4 font-mono">{it.batch.batchNumber}</td>
                          <td className="py-2.5 px-4">MRP: ₹{it.mrp.toFixed(2)} / Sell: ₹{it.sellingPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-4 font-semibold">{it.quantity}</td>
                          <td className="py-2.5 px-4 text-right font-bold font-mono">₹{it.totalAmount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {isCancelModalOpen && (
                <form onSubmit={handleCancelInvoiceSubmit} className="space-y-3 bg-white p-4 border border-rose-500/25 rounded-xl animate-fadeIn">
                  <span className="text-rose-600 font-bold block">Invoice Cancellation Offset</span>
                  <div className="space-y-1">
                    <label className="text-gray-400 font-semibold">Cancel Reason *</label>
                    <input
                      type="text"
                      required
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="e.g. Duplicate print check"
                      className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setIsCancelModalOpen(false)} className="px-2.5 py-1.5 rounded bg-white hover:bg-gray-100 text-gray-600 cursor-pointer">Close</button>
                    <button type="submit" className="px-3.5 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold cursor-pointer">Confirm Cancel</button>
                  </div>
                </form>
              )}

              <div className="flex justify-end gap-3 font-semibold">
                <button onClick={() => setInvoiceDetail(null)} className="px-4 py-2 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Close Window</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Emulated Output Overlay */}
      {activeReceiptId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn font-sans text-xs text-gray-500">
          <div className={`w-full bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden my-8 transition-all duration-300 ${
            receiptWidth === '150x95mm' ? 'max-w-3xl' : 'max-w-md'
          }`}>
            <div className="px-5 py-3 border-b border-gray-200 flex justify-between items-center bg-white">
              <h3 className="font-bold text-gray-800 text-xs">Thermal Receipt Preview</h3>
              <div className="flex gap-2">
                <button onClick={() => { setReceiptWidth('58mm'); handleFetchReceipt(activeReceiptId, '58mm'); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${receiptWidth === '58mm' ? 'bg-primary text-slate-955' : 'bg-slate-800 text-gray-500'}`}>58mm</button>
                <button onClick={() => { setReceiptWidth('80mm'); handleFetchReceipt(activeReceiptId, '80mm'); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${receiptWidth === '80mm' ? 'bg-primary text-slate-955' : 'bg-slate-800 text-gray-500'}`}>80mm</button>
                <button onClick={() => { setReceiptWidth('150x95mm'); handleFetchReceipt(activeReceiptId, '150x95mm'); }} className={`px-2 py-0.5 rounded text-[10px] font-bold ${receiptWidth === '150x95mm' ? 'bg-primary text-slate-955' : 'bg-slate-800 text-gray-500'}`}>150mm x 95mm</button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              <pre className="p-4 bg-white text-black font-mono text-[10px] rounded-lg border border-slate-200 overflow-x-auto shadow-inner leading-relaxed whitespace-pre font-semibold">
                {receiptText}
              </pre>

              <div className="flex justify-end gap-3 font-semibold">
                <button onClick={() => setActiveReceiptId(null)} className="px-3 py-1.5 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Close</button>
                <button
                  onClick={() => {
                    const printWin = window.open('', '', 'width=600,height=400');
                    if (printWin) {
                      printWin.document.write(`<html><body style="font-family:monospace;font-size:10px;white-space:pre-wrap;padding:10px;">${receiptText.replace(/\n/g, '<br>')}</body></html>`);
                      printWin.document.close();
                      printWin.focus();
                      printWin.print();
                      printWin.close();
                    }
                  }}
                  className="px-4 py-1.5 rounded bg-primary hover:bg-primary-hover text-slate-955 font-extrabold shadow-lg cursor-pointer"
                >
                  Send to Printer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Register User Account</h3>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Username *</label>
                <input
                  type="text"
                  required
                  value={userForm.username || ''}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  placeholder="Enter login username"
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Password *</label>
                <input
                  type="password"
                  required
                  value={userForm.passwordHash || ''}
                  onChange={(e) => setUserForm({ ...userForm, passwordHash: e.target.value })}
                  placeholder="Enter password"
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Role Profile *</label>
                <select
                  value={userForm.role || 'CASHIER'}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-700"
                >
                  <option value="CASHIER">Cashier (POS checkout only)</option>
                  <option value="PHARMACIST">Pharmacist (MDM + POS billing)</option>
                  <option value="STORE_MANAGER">Store Manager (Purchases + POS)</option>
                  <option value="ADMIN">Administrator (Full Access)</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6 font-semibold">
                <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-3.5 py-1.5 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 rounded bg-primary text-slate-955 font-bold cursor-pointer">Save Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Stock Adjust Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn font-sans text-xs text-gray-500">
          <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-2xl p-6">
            <h3 className="font-bold text-gray-800 text-sm mb-4">Stock Adjustment</h3>
            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Qty to adjust *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustForm.quantity || 1}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantity: parseInt(e.target.value, 10) || 1 })}
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-800"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-500 font-semibold">Remarks *</label>
                <input
                  type="text"
                  required
                  value={adjustForm.remarks || ''}
                  onChange={(e) => setAdjustForm({ ...adjustForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-white border border-gray-200 text-gray-800"
                />
              </div>
              <div className="flex justify-end gap-3 font-semibold">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="px-3.5 py-1.5 rounded bg-white border border-gray-200 text-gray-600 cursor-pointer">Cancel</button>
                <button type="submit" className="px-3.5 py-1.5 rounded bg-primary text-slate-955 font-bold cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
