import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  FiUpload, FiLayers, FiEye, FiAlertTriangle, FiCheckCircle, 
  FiRefreshCw, FiDownload, FiX, FiSave, FiAlertOctagon, FiPlay,
  FiFileText, FiClock, FiSettings, FiCheck, FiChevronRight, FiChevronLeft, FiActivity
} from 'react-icons/fi';
import { Button } from '../common/Button';
import { Badge } from '../common/Badge';

interface ProductImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  fetchProducts: () => Promise<void>;
  API_BASE: string;
  allSuppliers: any[];
}

const TARGET_FIELDS = [
  { key: 'name', label: 'Product Name', required: true, description: 'Brand name or medicine name' },
  { key: 'genericName', label: 'Generic Name', required: false, description: 'Salt name or composition' },
  { key: 'brandName', label: 'Brand Name', required: false, description: 'Brand/manufacturer label' },
  { key: 'manufacturerName', label: 'Manufacturer', required: false, description: 'Manufacturing company' },
  { key: 'categoryName', label: 'Category', required: false, description: 'Tablet, Syrup, Injection, etc.' },
  { key: 'barcode', label: 'Barcode', required: false, description: 'Unique barcode UPC/EAN' },
  { key: 'sku', label: 'SKU', required: false, description: 'Internal product/item code' },
  { key: 'hsnCode', label: 'HSN Code', required: false, description: 'GST HSN tariff code' },
  { key: 'gstPercentage', label: 'GST Percentage', required: false, description: 'Tax percentage (0-100)' },
  { key: 'purchasePrice', label: 'Purchase Price', required: true, description: 'Cost price per unit' },
  { key: 'mrp', label: 'MRP', required: true, description: 'Maximum retail price' },
  { key: 'sellingPrice', label: 'Selling Price', required: false, description: 'Retail price (optional)' },
  { key: 'minStockLevel', label: 'Minimum Stock', required: false, description: 'Low stock notification level' },
  { key: 'rackLocation', label: 'Rack Location', required: false, description: 'Physical shelf placement' },
  { key: 'description', label: 'Description', required: false, description: 'Product details/remarks' },
  { key: 'status', label: 'Status', required: false, description: 'Active / Inactive status' },
];

export const ProductImportWizard: React.FC<ProductImportWizardProps> = ({
  isOpen,
  onClose,
  fetchProducts,
  API_BASE,
  allSuppliers,
}) => {
  const [step, setStep] = useState<number>(1);
  const [file, setFile] = useState<File | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<string>('SKIP_DUPLICATES');
  
  // Supplier selection / write-in for template saving
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [newSupplierName, setNewSupplierName] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);

  // Raw file details parsed from backend
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [rawPreviewRows, setRawPreviewRows] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState<number>(0);
  const [isLoadingFile, setIsLoadingFile] = useState<boolean>(false);

  // Mapped and validated preview
  const [validatedPreview, setValidatedPreview] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [allRawRows, setAllRawRows] = useState<any[]>([]);

  // Client-side worksheet support
  const [worksheets, setWorksheets] = useState<string[]>([]);
  const [selectedWorksheet, setSelectedWorksheet] = useState<string>('');
  const [fileSizeFormatted, setFileSizeFormatted] = useState<string>('');
  const [detectedHeaderRow, setDetectedHeaderRow] = useState<number>(1);

  // Import execution stats
  const [importId, setImportId] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<number>(0);
  const [currentBatchText, setCurrentBatchText] = useState<string>('');
  const [cancelRequested, setCancelRequested] = useState<boolean>(false);

  // Live progress metrics
  const [importSpeed, setImportSpeed] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [currentProductName, setCurrentProductName] = useState<string>('');

  // Live background checklist checkpoints
  const [opValidating, setOpValidating] = useState<boolean>(false);
  const [opCreatingProduct, setOpCreatingProduct] = useState<boolean>(false);
  const [opCreatingCategory, setOpCreatingCategory] = useState<boolean>(false);
  const [opCreatingManufacturer, setOpCreatingManufacturer] = useState<boolean>(false);
  const [opWritingAudit, setOpWritingAudit] = useState<boolean>(false);
  const [opQueueSync, setOpQueueSync] = useState<boolean>(false);
  const [opFinished, setOpFinished] = useState<boolean>(false);

  // Validation diagnostics checkpoints
  const [valScanActive, setValScanActive] = useState<boolean>(false);
  const [valDupSkuActive, setValDupSkuActive] = useState<boolean>(false);
  const [valDupBarcodeActive, setValDupBarcodeActive] = useState<boolean>(false);
  const [valPricesActive, setValPricesActive] = useState<boolean>(false);
  const [valRequiredActive, setValRequiredActive] = useState<boolean>(false);

  // Final summary statistics
  const [summary, setSummary] = useState<{
    rowsRead: number;
    imported: number;
    updated: number;
    skipped: number;
    failed: number;
    validationErrorsCount: number;
    timeTaken: number;
    failedRowsList: any[];
  } | null>(null);

  // Load mappings on mount
  useEffect(() => {
    if (isOpen) {
      fetchSavedTemplates();
      resetState();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setMapping({});
    setRawPreviewRows([]);
    setTotalRows(0);
    setValidatedPreview([]);
    setValidationErrors([]);
    setAllRawRows([]);
    setImportProgress(0);
    setCurrentBatchText('');
    setCancelRequested(false);
    setSummary(null);
    setNewSupplierName('');
    setSelectedSupplierId('');

    setWorksheets([]);
    setSelectedWorksheet('');
    setFileSizeFormatted('');
    setDetectedHeaderRow(1);

    setImportSpeed(0);
    setElapsedSeconds(0);
    setRemainingSeconds(0);
    setCurrentProductName('');

    setOpValidating(false);
    setOpCreatingProduct(false);
    setOpCreatingCategory(false);
    setOpCreatingManufacturer(false);
    setOpWritingAudit(false);
    setOpQueueSync(false);
    setOpFinished(false);

    setValScanActive(false);
    setValDupSkuActive(false);
    setValDupBarcodeActive(false);
    setValPricesActive(false);
    setValRequiredActive(false);
  };

  const handleCancelRequest = () => {
    setCancelRequested(true);
    setCurrentBatchText('Cancelling import... finishing current batch.');
  };

  const prevStep = () => setStep(prev => prev - 1);
  const nextStep = () => setStep(prev => prev + 1);

  const fetchSavedTemplates = async () => {
    try {
      const res = await fetch(`${API_BASE}/products/import/mappings`);
      if (res.ok) {
        const envelope = await res.json();
        setSavedTemplates(envelope.data || []);
      }
    } catch (err) {
      console.error('Failed to load supplier mappings:', err);
    }
  };

  // Step 1: Upload File and call parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    // Format file size
    const sizeInMB = selectedFile.size / (1024 * 1024);
    setFileSizeFormatted(sizeInMB < 0.1 ? `${(selectedFile.size / 1024).toFixed(1)} KB` : `${sizeInMB.toFixed(2)} MB`);

    setIsLoadingFile(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const { read } = require('xlsx');
      const workbook = read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetNames = workbook.SheetNames || [];
      setWorksheets(sheetNames);
      
      const firstSheet = sheetNames[0] || '';
      setSelectedWorksheet(firstSheet);

      await parseSheetAndUpload(selectedFile, firstSheet);
    } catch (err: any) {
      alert(`Failed to load workbook worksheets: ${err.message}`);
      setFile(null);
      setIsLoadingFile(false);
    }
  };

  const handleWorksheetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sheet = e.target.value;
    if (!file || !sheet) return;
    setSelectedWorksheet(sheet);
    await parseSheetAndUpload(file, sheet);
  };

  const parseSheetAndUpload = async (originalFile: File, sheetName: string) => {
    setIsLoadingFile(true);
    try {
      let fileToUpload = originalFile;
      const fileExt = originalFile.name.split('.').pop()?.toLowerCase();

      if ((fileExt === 'xlsx' || fileExt === 'xls') && sheetName) {
        const arrayBuffer = await originalFile.arrayBuffer();
        const { read, write, utils } = require('xlsx');
        const wb = read(new Uint8Array(arrayBuffer), { type: 'array' });
        const ws = wb.Sheets[sheetName];
        if (ws) {
          const singleSheetWb = utils.book_new();
          utils.book_append_sheet(singleSheetWb, ws, sheetName);
          const outBuffer = write(singleSheetWb, { bookType: 'xlsx', type: 'array' });
          fileToUpload = new File([outBuffer], originalFile.name, { type: originalFile.type });
        }
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      const res = await fetch(`${API_BASE}/products/import/parse`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        alert(`Parsing Failed: ${errData.message || 'Unknown error'}`);
        setFile(null);
        setIsLoadingFile(false);
        return;
      }

      const envelope = await res.json();
      console.log('[DEBUG handleFileChange] Raw API parse response envelope:', envelope);
      const data = envelope.data || {};
      console.log('[DEBUG handleFileChange] Extracted data payload:', data);

      setHeaders(data.headers || []);
      setMapping(data.suggestedMapping || {});
      setRawPreviewRows(data.previewRows || []);
      setTotalRows(data.totalRows || 0);
      setDetectedHeaderRow(1); // Default to 1

      applySupplierMapping(selectedSupplierId, data.headers || [], data.suggestedMapping || {});
    } catch (err: any) {
      alert(`Parsing Failed: ${err.message}`);
      setFile(null);
    } finally {
      setIsLoadingFile(false);
    }
  };

  // Helper to apply saved supplier template
  const applySupplierMapping = (supplierId: string, availableHeaders: string[], autoMapping: Record<string, string>) => {
    if (!supplierId) return;
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    setNewSupplierName(supplier.name);

    const template = savedTemplates.find(t => t.supplierName.toLowerCase() === supplier.name.toLowerCase());
    if (template && template.mapping) {
      const loadedMapping: Record<string, string> = {};
      for (const [excelCol, dbField] of Object.entries(template.mapping)) {
        if (availableHeaders.includes(excelCol)) {
          loadedMapping[excelCol] = dbField as string;
        }
      }
      for (const h of availableHeaders) {
        if (!loadedMapping[h] && autoMapping[h]) {
          loadedMapping[h] = autoMapping[h];
        }
      }
      setMapping(loadedMapping);
    }
  };

  const handleMappingChange = (excelCol: string, val: string) => {
    setMapping(prev => {
      const updated = { ...prev };
      if (val) updated[excelCol] = val;
      else delete updated[excelCol];
      return updated;
    });
  };

  const handleSupplierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedSupplierId(id);
    applySupplierMapping(id, headers, mapping);
  };

  // Step 2: Validate current mapping and fetch validations/preview
  const proceedToPreview = async () => {
    const mappedDbFields = Object.values(mapping);
    const missingRequired = TARGET_FIELDS.filter(f => f.required && !mappedDbFields.includes(f.key));

    if (missingRequired.length > 0) {
      alert(`Missing required fields mapping: ${missingRequired.map(f => f.label).join(', ')}`);
      return;
    }

    setIsValidating(true);
    setStep(3);

    try {
      const reader = new FileReader();
      reader.onload = async (event: any) => {
        try {
          const data = new Uint8Array(event.target.result);
          const { read, utils } = require('xlsx');
          const workbook = read(data, { type: 'array' });
          const worksheet = workbook.Sheets[selectedWorksheet || workbook.SheetNames[0]];
          
          const rows2D = utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
          
          let headerRowIndex = 0;
          let maxMatches = 0;
          const aliasDict: Record<string, string[]> = {};
          TARGET_FIELDS.forEach(tf => {
            aliasDict[tf.key] = [tf.label.toLowerCase()];
          });
          
          for (let r = 0; r < Math.min(rows2D.length, 20); r++) {
            const row = rows2D[r];
            if (!row || !Array.isArray(row)) continue;
            let matches = 0;
            for (const val of row) {
              if (!val) continue;
              const cleanVal = String(val).toLowerCase().trim().replace(/[\s\-_]/g, '');
              for (const headerName of headers) {
                if (cleanVal === headerName.toLowerCase().trim().replace(/[\s\-_]/g, '')) {
                  matches++;
                  break;
                }
              }
            }
            if (matches > maxMatches) {
              maxMatches = matches;
              headerRowIndex = r;
            }
          }

          const fileHeaders = rows2D[headerRowIndex].map((h: any) => String(h || '').trim()).filter(Boolean);
          const allRows: any[] = [];
          for (let r = headerRowIndex + 1; r < rows2D.length; r++) {
            const row = rows2D[r];
            if (!row || row.every((cell: any) => cell === null || cell === undefined || String(cell).trim() === '')) {
              continue;
            }
            const rowObj: Record<string, any> = {};
            for (let c = 0; c < fileHeaders.length; c++) {
              rowObj[fileHeaders[c]] = row[c] !== undefined ? row[c] : null;
            }
            allRows.push(rowObj);
          }

          setAllRawRows(allRows);

          // Now validate first 50 rows in backend
          const previewPayload = allRows.slice(0, 50);
          const res = await fetch(`${API_BASE}/products/import/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              rows: previewPayload,
              mapping,
              duplicateMode,
            }),
          });

          if (!res.ok) {
            throw new Error('Validation failed');
          }

          const validatedEnvelope = await res.json();
          setValidatedPreview(validatedEnvelope.data?.previewRows || []);

          // Trigger simulated checklist timers for Step 4
          triggerValidationLogs(allRows);
        } catch (err: any) {
          alert(`Validation process failed: ${err.message}`);
          setStep(2);
        } finally {
          setIsValidating(false);
        }
      };
      reader.readAsArrayBuffer(file!);
    } catch (err: any) {
      alert(`Validation failed: ${err.message}`);
      setStep(2);
      setIsValidating(false);
    }
  };

  // Simulated validation steps checklist logic
  const triggerValidationLogs = async (allRows: any[]) => {
    setValScanActive(true);
    setTimeout(() => {
      setValDupSkuActive(true);
      setTimeout(() => {
        setValDupBarcodeActive(true);
        setTimeout(() => {
          setValPricesActive(true);
          setTimeout(() => {
            setValRequiredActive(true);
          }, 300);
        }, 300);
      }, 300);
    }, 300);

    // Call actual backend validation for all rows
    try {
      const fullRes = await fetch(`${API_BASE}/products/import/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: allRows,
          mapping,
          duplicateMode,
        }),
      });

      if (fullRes.ok) {
        const fullValidatedEnvelope = await fullRes.json();
        setValidationErrors(fullValidatedEnvelope.data?.validationErrors || []);
      }
    } catch (err) {
      console.error('Full validation run failed:', err);
    }
  };

  // Step 6: Execute Import in chunks
  const executeImport = async () => {
    setStep(6);
    setIsImporting(true);
    setCancelRequested(false);
    setImportProgress(0);

    setOpValidating(true);
    setOpCreatingProduct(false);
    setOpCreatingCategory(false);
    setOpCreatingManufacturer(false);
    setOpWritingAudit(false);
    setOpQueueSync(false);
    setOpFinished(false);

    const startTime = Date.now();
    const currentImportId = `import-${Date.now()}`;
    setImportId(currentImportId);

    let rowsImported = 0;
    let rowsUpdated = 0;
    let rowsSkipped = 0;
    let rowsFailed = 0;
    const failedRowsList: any[] = [];

    const finalSupplierName = newSupplierName.trim() || 'Generic Supplier';

    // Start Smooth Timer Interval for elapsed seconds
    let timerInterval = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      await fetch(`${API_BASE}/products/import/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: currentImportId,
          supplierName: finalSupplierName,
          totalRows,
        }),
      });

      setOpCreatingCategory(true);
      setOpCreatingManufacturer(true);

      const fileData = await file!.arrayBuffer();
      const { read, utils } = require('xlsx');
      const workbook = read(new Uint8Array(fileData), { type: 'array' });
      const worksheet = workbook.Sheets[selectedWorksheet || workbook.SheetNames[0]];
      const rows2D = utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      let headerRowIndex = 0;
      let maxMatches = 0;
      for (let r = 0; r < Math.min(rows2D.length, 20); r++) {
        const row = rows2D[r];
        if (!row || !Array.isArray(row)) continue;
        let matches = 0;
        for (const val of row) {
          if (!val) continue;
          const cleanVal = String(val).toLowerCase().trim().replace(/[\s\-_]/g, '');
          for (const headerName of headers) {
            if (cleanVal === headerName.toLowerCase().trim().replace(/[\s\-_]/g, '')) {
              matches++;
              break;
            }
          }
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIndex = r;
        }
      }

      const fileHeaders = rows2D[headerRowIndex].map((h: any) => String(h || '').trim()).filter(Boolean);
      const allRows: any[] = [];
      for (let r = headerRowIndex + 1; r < rows2D.length; r++) {
        const row = rows2D[r];
        if (!row || row.every((cell: any) => cell === null || cell === undefined || String(cell).trim() === '')) {
          continue;
        }
        const rowObj: Record<string, any> = {};
        for (let c = 0; c < fileHeaders.length; c++) {
          rowObj[fileHeaders[c]] = row[c] !== undefined ? row[c] : null;
        }
        allRows.push(rowObj);
      }

      const invalidRowNumbers = new Set(validationErrors.map(e => e.row));

      const rowsToWrite: any[] = [];
      allRows.forEach((row, index) => {
        const rowNum = index + 2;
        if (invalidRowNumbers.has(rowNum)) {
          const err = validationErrors.find(e => e.row === rowNum);
          failedRowsList.push({
            row: rowNum,
            name: row[Object.keys(mapping).find(k => mapping[k] === 'name') || ''] || 'Unknown Medicine',
            reason: err ? err.details.join('; ') : 'Pre-import validation failed',
          });
          rowsFailed++;
        } else {
          const mappedRow: any = { rowNum };
          for (const [rawCol, dbField] of Object.entries(mapping)) {
            mappedRow[dbField] = row[rawCol] !== undefined ? row[rawCol] : null;
          }
          rowsToWrite.push(mappedRow);
        }
      });

      const chunkSize = 500;
      const totalChunks = Math.ceil(rowsToWrite.length / chunkSize);

      let isCancelled = false;

      setOpCreatingProduct(true);

      for (let i = 0; i < totalChunks; i++) {
        let checkCancel = false;
        setCancelRequested(prev => {
          checkCancel = prev;
          return prev;
        });

        if (checkCancel) {
          isCancelled = true;
          break;
        }

        const chunkRows = rowsToWrite.slice(i * chunkSize, (i + 1) * chunkSize);
        
        // Show current product name driving from chunk list
        const sampleProdName = chunkRows[0]?.name || '';
        setCurrentProductName(sampleProdName);

        setCurrentBatchText(`Processing batch ${i + 1} of ${totalChunks}...`);

        const chunkRes = await fetch(`${API_BASE}/products/import/chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: chunkRows,
            mapping,
            duplicateMode,
          }),
        });

        if (!chunkRes.ok) {
          const errText = await chunkRes.text();
          throw new Error(`Batch execution failed: ${errText}`);
        }

        const chunkStatsEnvelope = await chunkRes.json();
        const chunkStats = chunkStatsEnvelope.data || {};
        rowsImported += chunkStats.successCount || 0;
        rowsUpdated += chunkStats.updatedCount || 0;
        rowsSkipped += chunkStats.skippedCount || 0;
        rowsFailed += chunkStats.errorCount || 0;

        if (chunkStats.errors && chunkStats.errors.length > 0) {
          chunkStats.errors.forEach((err: any) => {
            failedRowsList.push({
              row: err.row,
              name: err.name,
              reason: err.errors.join('; '),
            });
          });
        }

        // Calculate and update metrics
        const elapsed = Math.max(1, (Date.now() - startTime) / 1000);
        const processed = Math.min((i + 1) * chunkSize, rowsToWrite.length);
        const speed = Math.round(processed / elapsed);
        setImportSpeed(speed);

        const remaining = rowsToWrite.length - processed;
        const estRemaining = speed > 0 ? Math.round(remaining / speed) : 0;
        setRemainingSeconds(estRemaining);

        setImportProgress(Math.round(((i + 1) / totalChunks) * 100));
      }

      setOpWritingAudit(true);
      setOpQueueSync(true);

      clearInterval(timerInterval);

      if (isCancelled) {
        await fetch(`${API_BASE}/products/import/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importId: currentImportId,
            supplierName: finalSupplierName,
            successCount: rowsImported + rowsUpdated,
            errorCount: rowsFailed + rowsSkipped,
            error: 'Import cancelled by user',
          }),
        });
      } else {
        await fetch(`${API_BASE}/products/import/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            importId: currentImportId,
            supplierName: finalSupplierName,
            successCount: rowsImported + rowsUpdated,
            errorCount: rowsFailed,
          }),
        });
      }

      setOpFinished(true);

      setSummary({
        rowsRead: totalRows,
        imported: rowsImported,
        updated: rowsUpdated,
        skipped: rowsSkipped,
        failed: rowsFailed,
        validationErrorsCount: validationErrors.length,
        timeTaken: Math.round((Date.now() - startTime) / 1000),
        failedRowsList,
      });

      await fetchProducts();
      setStep(7); // Jump directly to completion screen
    } catch (err: any) {
      clearInterval(timerInterval);
      alert(`Import Failed: ${err.message}`);
      await fetch(`${API_BASE}/products/import/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          importId: currentImportId,
          supplierName: finalSupplierName,
          successCount: rowsImported,
          errorCount: rowsFailed + (totalRows - rowsImported - rowsUpdated),
          error: err.message,
        }),
      });

      setSummary({
        rowsRead: totalRows,
        imported: rowsImported,
        updated: rowsUpdated,
        skipped: rowsSkipped,
        failed: rowsFailed + (totalRows - rowsImported - rowsUpdated - rowsSkipped),
        validationErrorsCount: validationErrors.length,
        timeTaken: Math.round((Date.now() - startTime) / 1000),
        failedRowsList: [...failedRowsList, { row: 'ALL', name: 'System Error', reason: err.message }],
      });
      setStep(7);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSaveMapping = async () => {
    const nameToSave = newSupplierName.trim();
    if (!nameToSave) {
      alert('Please enter a supplier name to save mapping.');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/products/import/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: nameToSave,
          mapping,
        }),
      });

      if (res.ok) {
        alert('Mapping template saved successfully!');
        fetchSavedTemplates();
      } else {
        alert('Failed to save mapping.');
      }
    } catch (err: any) {
      alert(`Error saving mapping: ${err.message}`);
    }
  };

  const handleRetryFailedRows = async () => {
    if (!summary || summary.failedRowsList.length === 0) return;

    setIsLoadingFile(true);
    setStep(1);

    try {
      const fileData = await file!.arrayBuffer();
      const { read, utils } = require('xlsx');
      const workbook = read(new Uint8Array(fileData), { type: 'array' });
      const worksheet = workbook.Sheets[selectedWorksheet || workbook.SheetNames[0]];
      const rows2D = utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

      let headerRowIndex = 0;
      let maxMatches = 0;
      for (let r = 0; r < Math.min(rows2D.length, 20); r++) {
        const row = rows2D[r];
        if (!row || !Array.isArray(row)) continue;
        let matches = 0;
        for (const val of row) {
          if (!val) continue;
          const cleanVal = String(val).toLowerCase().trim().replace(/[\s\-_]/g, '');
          for (const headerName of headers) {
            if (cleanVal === headerName.toLowerCase().trim().replace(/[\s\-_]/g, '')) {
              matches++;
              break;
            }
          }
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          headerRowIndex = r;
        }
      }

      const fileHeaders = rows2D[headerRowIndex].map((h: any) => String(h || '').trim()).filter(Boolean);
      const failedNumbers = new Set(summary.failedRowsList.map(fr => fr.row).filter(Number.isInteger));

      const retryingRows2D: any[][] = [rows2D[headerRowIndex]];
      for (let r = headerRowIndex + 1; r < rows2D.length; r++) {
        const rowNumFromStart = r - headerRowIndex + 1;
        if (failedNumbers.has(rowNumFromStart)) {
          retryingRows2D.push(rows2D[r]);
        }
      }

      const newWorksheet = utils.aoa_to_sheet(retryingRows2D);
      const newWorkbook = utils.book_new();
      utils.book_append_sheet(newWorkbook, newWorksheet, 'Retried Products');
      const newBuffer = writeBinary(newWorkbook);

      const newFileObj = new File([newBuffer], `retry_failed_${file!.name}`, {
        type: file!.type
      });

      setFile(newFileObj);

      const rawRows: any[] = [];
      for (let r = 1; r < retryingRows2D.length; r++) {
        const row = retryingRows2D[r];
        const rowObj: Record<string, any> = {};
        for (let c = 0; c < fileHeaders.length; c++) {
          rowObj[fileHeaders[c]] = row[c] !== undefined ? row[c] : null;
        }
        rawRows.push(rowObj);
      }

      setRawPreviewRows(rawRows.slice(0, 50));
      setTotalRows(rawRows.length);
      setValidatedPreview([]);
      setValidationErrors([]);
      setSummary(null);
      setImportProgress(0);
      setCancelRequested(false);
      
      alert(`Loaded ${rawRows.length} failed rows back into the wizard for retry. Review column mapping in Step 2.`);
    } catch (err: any) {
      alert(`Failed to load retry file: ${err.message}`);
    } finally {
      setIsLoadingFile(false);
    }
  };

  const writeBinary = (wb: any) => {
    const { write } = require('xlsx');
    const out = write(wb, { bookType: 'xlsx', type: 'array' });
    return new Uint8Array(out);
  };

  // Helper to extract sample value for column mapping
  const getSampleValue = (excelHeader: string) => {
    const rowObj = rawPreviewRows.find(
      r => r[excelHeader] !== undefined && r[excelHeader] !== null && String(r[excelHeader]).trim() !== ''
    );
    return rowObj ? String(rowObj[excelHeader]).trim() : '-';
  };

  // Format currency helpers
  const formatCurrency = (val: any) => {
    const num = parseFloat(val);
    if (isNaN(num)) return '₹0';
    return `₹${num.toFixed(2)}`;
  };

  // Lookup excel mapped columns
  const getRowValueByDbField = (rowNum: number, dbField: string) => {
    const rowData = allRawRows[rowNum - 2];
    if (!rowData) return null;
    const excelCol = Object.keys(mapping).find(key => mapping[key] === dbField);
    return excelCol ? rowData[excelCol] : null;
  };

  const downloadErrorReport = () => {
    const failedList = summary ? summary.failedRowsList : validationErrors.map(e => ({
      row: e.row,
      name: e.name,
      reason: e.details ? e.details.join('; ') : 'Pre-import validation failed'
    }));

    if (failedList.length === 0) return;

    let csvContent = 'Workbook Row,Product,Reason,Suggested Fix\n';
    failedList.forEach(fr => {
      const escapedName = `"${String(fr.name || 'Unknown Product').replace(/"/g, '""')}"`;
      const reasonStr = fr.reason || fr.details?.join('; ') || 'Invalid row fields format';
      const escapedReason = `"${String(reasonStr).replace(/"/g, '""')}"`;
      
      let suggestion = 'Review row fields and correct formatting.';
      if (reasonStr.toLowerCase().includes('mrp')) {
        suggestion = 'Increase MRP rate to match or exceed Purchase Price.';
      } else if (reasonStr.toLowerCase().includes('name')) {
        suggestion = 'Provide a valid brand/medicine name.';
      } else if (reasonStr.toLowerCase().includes('barcode') || reasonStr.toLowerCase().includes('sku')) {
        suggestion = 'Provide a unique code identifier or change duplicate settings.';
      }
      const escapedSuggest = `"${suggestion.replace(/"/g, '""')}"`;

      csvContent += `${fr.row},${escapedName},${escapedReason},${escapedSuggest}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_errors_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImportLog = () => {
    if (!summary) return;
    const finalSupplierName = newSupplierName.trim() || 'Generic Supplier';
    const auditId = `IMP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;

    let logContent = `Medingen Pharmacy ERP - Import Engine Session Log\n`;
    logContent += `==================================================\n`;
    logContent += `Session ID:      ${auditId}\n`;
    logContent += `Timestamp:       ${new Date().toLocaleString()}\n`;
    logContent += `Workbook:        ${file?.name || 'Unknown'}\n`;
    logContent += `Worksheet:       ${selectedWorksheet || 'Default'}\n`;
    logContent += `Supplier:        ${finalSupplierName}\n`;
    logContent += `Duplicate Mode:  ${duplicateMode}\n`;
    logContent += `Time Taken:      ${summary.timeTaken} seconds\n`;
    logContent += `--------------------------------------------------\n`;
    logContent += `Rows Scanned:    ${summary.rowsRead}\n`;
    logContent += `Imported (New):  ${summary.imported}\n`;
    logContent += `Updated:         ${summary.updated}\n`;
    logContent += `Skipped:         ${summary.skipped}\n`;
    logContent += `Failed:          ${summary.failed}\n`;
    logContent += `==================================================\n\n`;
    logContent += `LOG DETAILS:\n`;
    
    if (summary.imported > 0) logContent += `[SUCCESS] Created ${summary.imported} new products.\n`;
    if (summary.updated > 0) logContent += `[SUCCESS] Updated ${summary.updated} existing products.\n`;
    if (summary.skipped > 0) logContent += `[INFO] Skipped ${summary.skipped} duplicate or unmapped records.\n`;
    
    if (summary.failedRowsList.length > 0) {
      logContent += `\n[ERRORS] ${summary.failedRowsList.length} rows encountered errors:\n`;
      summary.failedRowsList.forEach(fr => {
        logContent += `- Row ${fr.row}: ${fr.name} - Reason: ${fr.reason}\n`;
      });
    } else {
      logContent += `\n[INFO] No errors encountered during import session.\n`;
    }

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `import_log_${Date.now()}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDuplicateModeLabel = (mode: string) => {
    switch (mode) {
      case 'SKIP_DUPLICATES': return 'Skip Duplicate';
      case 'UPDATE_EXISTING': return 'Update Existing Profile';
      case 'CREATE_NEW': return 'Create New Copy';
      case 'MERGE_MISSING': return 'Merge Missing Fields';
      default: return mode;
    }
  };

  // Action overrides inside error cards
  const ignoreRow = (rowNum: number) => {
    setValidationErrors(prev => prev.filter(e => e.row !== rowNum));
  };

  const locateRow = (rowNum: number) => {
    setStep(3);
    setTimeout(() => {
      const element = document.getElementById(`preview-row-${rowNum}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('bg-primary/20');
        setTimeout(() => element.classList.remove('bg-primary/20'), 2500);
      }
    }, 100);
  };

  const downloadSingleError = (err: any) => {
    const reasonStr = err.details?.join('; ') || err.reason || 'Invalid fields format';
    let suggestion = 'Review row fields and correct formatting.';
    if (reasonStr.toLowerCase().includes('mrp')) {
      suggestion = 'Increase MRP rate to match or exceed Purchase Price.';
    } else if (reasonStr.toLowerCase().includes('name')) {
      suggestion = 'Provide a valid brand/medicine name.';
    }
    
    let csvContent = 'Workbook Row,Product,Reason,Suggested Fix\n';
    csvContent += `${err.row},"${String(err.name || 'Unknown').replace(/"/g, '""')}","${reasonStr.replace(/"/g, '""')}","${suggestion.replace(/"/g, '""')}"\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `error_row_${err.row}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  // Confirmation stats calculations
  const invalidCount = validationErrors.length;
  const validCount = Math.max(0, totalRows - invalidCount);
  const duplicatePreviewCount = validatedPreview.filter(r => r.status === 'DUPLICATE' || r.status === 'Duplicate').length;
  const estimatedDuplicates = Math.min(validCount, Math.round((duplicatePreviewCount / Math.max(1, validatedPreview.length)) * totalRows));

  let confCreateCount = validCount;
  let confUpdateCount = 0;
  let confSkipCount = invalidCount;

  if (duplicateMode === 'SKIP_DUPLICATES') {
    confCreateCount = Math.max(0, validCount - estimatedDuplicates);
    confSkipCount = invalidCount + estimatedDuplicates;
  } else if (duplicateMode === 'UPDATE_EXISTING' || duplicateMode === 'MERGE_MISSING') {
    confCreateCount = Math.max(0, validCount - estimatedDuplicates);
    confUpdateCount = estimatedDuplicates;
  }

  const estimatedTimeSeconds = Math.max(1, Math.ceil(totalRows / 180));

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans animate-scale-in">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" onClick={() => !isImporting && onClose()} />

        {/* Dialog Container */}
        <div className="relative inline-block w-full max-w-[96vw] align-middle transition-all transform bg-white border border-gray-200 rounded-3xl shadow-2xl text-left my-6 text-gray-700">
          
          {/* Header */}
          <div className="px-8 py-5 border-b border-gray-200/80 flex justify-between items-center bg-white/60 backdrop-blur-sm sticky top-0 rounded-t-3xl z-10">
            <div>
              <h2 className="text-lg font-bold text-gray-800 tracking-wide uppercase flex items-center gap-2">
                <FiUpload className="text-primary" /> Universal Product Import Engine
              </h2>
              <p className="text-xs text-slate-455 mt-1">Import medicine databases from any distributor spreadsheet dynamically.</p>
            </div>
            {!isImporting && (
              <button 
                onClick={onClose} 
                className="p-1.5 rounded-full hover:bg-gray-100 text-muted hover:text-gray-800 transition-colors cursor-pointer"
              >
                <FiX size={20} />
              </button>
            )}
          </div>

          {/* Wizard Steps Indicator */}
          <div className="px-8 py-4 bg-white/40 border-b border-gray-200 flex justify-between items-center text-xs font-semibold select-none">
            <div className="flex items-center gap-6 w-full max-w-5xl mx-auto overflow-x-auto scrollbar-none py-1">
              {[
                { s: 1, label: 'Upload' },
                { s: 2, label: 'Column Mapping' },
                { s: 3, label: 'Preview' },
                { s: 4, label: 'Validation' },
                { s: 5, label: 'Confirmation' },
                { s: 6, label: 'Live Progress' },
                { s: 7, label: 'Completed' }
              ].map((stepItem, idx) => (
                <div key={idx} className="flex items-center gap-2 shrink-0">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-mono border text-[10px] transition-all duration-350 ${
                    step >= stepItem.s 
                      ? 'bg-primary border-teal-500 text-slate-950 font-bold shadow-[0_0_10px_rgba(20,184,166,0.35)]' 
                      : 'border-gray-200 text-gray-500 bg-gray-50'
                  }`}>
                    {stepItem.s}
                  </div>
                  <span className={`transition-colors duration-300 text-[11px] ${step >= stepItem.s ? 'text-gray-800 font-bold' : 'text-gray-500'}`}>
                    {stepItem.label}
                  </span>
                  {idx < 6 && <div className={`w-6 h-0.5 rounded transition-all duration-500 ${step > stepItem.s ? 'bg-primary' : 'bg-gray-50'}`} />}
                </div>
              ))}
            </div>
          </div>

          {/* Main Body */}
          <div className="p-8 max-h-[72vh] overflow-y-auto">

            {/* STEP 1: UPLOAD FILE & DUPLICATE CONFIG */}
            {step === 1 && (
              <div className="space-y-6 max-w-4xl mx-auto py-2 animate-slide-up">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left block - File Upload Area */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="border-2 border-dashed border-gray-200 hover:border-teal-500/50 rounded-3xl p-10 text-center bg-white/20 hover:bg-white/30 transition-all cursor-pointer relative group">
                      <input 
                        type="file" 
                        accept=".csv, .xls, .xlsx"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={isLoadingFile}
                      />
                      <div className="space-y-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto group-hover:scale-105 transition-transform duration-300">
                          {isLoadingFile ? <FiRefreshCw className="animate-spin text-2xl" /> : <FiUpload className="text-2xl" />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-700">{file ? file.name : 'Choose spreadsheet catalog file or drag here'}</p>
                          <p className="text-xs text-gray-500 mt-1.5">Supports Microsoft Excel (.xlsx, .xls) and CSV sheets.</p>
                        </div>
                        {file && (
                          <Badge variant="success" className="font-mono mt-1 px-3 py-1">
                            {totalRows > 0 ? `${totalRows.toLocaleString()} Rows Scanned` : 'Reading Workbook...'}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {file && worksheets.length > 1 && (
                      <div className="bg-gray-50/25 border border-gray-200 p-5 rounded-2xl text-left space-y-3">
                        <label className="block text-xs font-bold text-muted uppercase tracking-wider">
                          Select Worksheet to Import
                        </label>
                        <div className="relative">
                          <select
                            value={selectedWorksheet}
                            onChange={handleWorksheetChange}
                            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-bold focus:outline-none focus:border-primary transition-colors"
                          >
                            {worksheets.map((sheet, i) => (
                              <option key={i} value={sheet}>{sheet}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right block - Workbook Metadata & Parameters */}
                  <div className="space-y-4">
                    {/* Metadata summary display */}
                    {file && (
                      <div className="bg-gray-50/30 border border-gray-200 rounded-3xl p-5 text-left space-y-4 animate-scale-in">
                        <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-gray-200/50 pb-2">Workbook Details</h3>
                        <div className="space-y-2.5 font-mono text-[11px] text-gray-500 leading-relaxed">
                          <div className="flex justify-between">
                            <span>Workbook:</span>
                            <span className="text-gray-700 font-bold truncate max-w-[180px]">{file.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Worksheet:</span>
                            <span className="text-gray-700 font-bold text-primary">{selectedWorksheet || 'Default'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Sheets:</span>
                            <span className="text-gray-700 font-bold">{worksheets.length || 1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Header Row:</span>
                            <span className="text-gray-700 font-bold">Row {detectedHeaderRow}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cols Detected:</span>
                            <span className="text-gray-700 font-bold">{headers.length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Rows Detected:</span>
                            <span className="text-gray-700 font-bold text-emerald-450">{(totalRows ?? 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>File Size:</span>
                            <span className="text-gray-700 font-bold">{fileSizeFormatted}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="bg-gray-50/30 border border-gray-200 rounded-3xl p-5 text-left space-y-4">
                      <h3 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-gray-200/50 pb-2">Import Settings</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Supplier / Template
                          </label>
                          <select
                            value={selectedSupplierId}
                            onChange={handleSupplierChange}
                            className="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 text-xs font-bold focus:outline-none focus:border-primary transition-colors"
                          >
                            <option value="">-- Auto-Detect (Default) --</option>
                            {allSuppliers.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                            Duplicate Handling
                          </label>
                          <select
                            value={duplicateMode}
                            onChange={(e) => setDuplicateMode(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-xs font-bold focus:outline-none focus:border-primary transition-colors"
                          >
                            <option value="SKIP_DUPLICATES">Skip duplicate rows</option>
                            <option value="UPDATE_EXISTING">Update existing profiles</option>
                            <option value="CREATE_NEW">Import as new duplicate copy</option>
                            <option value="MERGE_MISSING">Merge missing data only</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* STEP 2: COLUMN MAPPING DIALOG */}
            {step === 2 && (
              <div className="space-y-6 animate-slide-up">
                <div className="flex justify-between items-center bg-gray-50/40 p-4 border border-gray-200 rounded-2xl select-none">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Map Columns</h3>
                    <p className="text-xs text-gray-500 mt-0.5 font-medium">Link spreadsheet headers to target catalog fields. Verify sample values.</p>
                  </div>
                  <div className="flex gap-2 font-mono text-[10px]">
                    <Badge variant="gray" className="text-muted border-gray-200 font-mono px-3">
                      Mapped: {Object.values(mapping).filter(Boolean).length} / {TARGET_FIELDS.filter(f => f.required).length} Required
                    </Badge>
                  </div>
                </div>

                <div className="bg-white/20 border border-gray-200/70 rounded-2xl overflow-hidden shadow-inner">
                  <table className="w-full text-left text-gray-600">
                    <thead className="bg-white text-[10px] text-gray-500 uppercase font-mono font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-6">Excel Column Header</th>
                        <th className="py-3 px-6 text-center">Maps To Field</th>
                        <th className="py-3 px-6">Sample Value</th>
                        <th className="py-3 px-6 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-xs leading-normal">
                      {headers.map((h, index) => {
                        const dbFieldKey = mapping[h];
                        const targetField = TARGET_FIELDS.find(f => f.key === dbFieldKey);
                        const isMapped = !!dbFieldKey;
                        const sampleVal = getSampleValue(h);

                        return (
                          <tr key={index} className="hover:bg-white/15">
                            <td className="py-3.5 px-6 font-mono font-semibold text-gray-700">{h}</td>
                            <td className="py-2.5 px-6 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <span className="text-slate-600 font-bold text-xs">→</span>
                                <select
                                  value={dbFieldKey || ''}
                                  onChange={(e) => handleMappingChange(h, e.target.value)}
                                  className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-700 font-semibold focus:outline-none focus:border-primary transition-colors w-64 text-xs"
                                >
                                  <option value="">-- Ignore Column --</option>
                                  {TARGET_FIELDS.map(f => (
                                    <option key={f.key} value={f.key}>
                                      {f.label} {f.required ? '*' : ''}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="py-3.5 px-6 font-mono text-muted text-xs italic max-w-[200px] truncate">
                              {sampleVal}
                            </td>
                            <td className="py-2.5 text-center select-none">
                              <Badge variant={isMapped ? 'success' : 'gray'} className="font-semibold text-[8px] tracking-wider px-2">
                                {isMapped ? targetField?.label.toUpperCase() : 'IGNORED'}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Save Mapping Template */}
                <div className="p-5 bg-gray-50/35 border border-gray-200 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-4 text-left">
                  <div>
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide block">Save template mapping?</span>
                    <span className="text-[11px] text-gray-500 font-medium">Easily auto-map columns next time you upload this supplier's catalog sheet.</span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <input
                      type="text"
                      placeholder="Supplier / Distributor Name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-xs font-bold focus:outline-none w-full sm:w-64"
                    />
                    <Button
                      onClick={handleSaveMapping}
                      variant="outline"
                      className="flex items-center justify-center gap-1.5 py-2.5 text-teal-450 border-primary/20 hover:bg-primary/10 cursor-pointer font-bold shrink-0 text-xs"
                    >
                      <FiSave size={13} /> Save Template
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: PREVIEW DATA (GATED FIRST 50 ROWS) */}
            {step === 3 && (
              <div className="space-y-6 animate-slide-up">
                
                {/* Statistics cards header */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                  {[
                    { label: 'Total Rows', val: totalRows, color: 'text-gray-700' },
                    { label: 'Preview Rows', val: Math.min(50, totalRows), color: 'text-primary' },
                    { label: 'New Products', val: Math.max(0, totalRows - estimatedDuplicates), color: 'text-emerald-450' },
                    { label: 'Duplicates', val: estimatedDuplicates, color: 'text-amber-400' },
                    { label: 'Skipped', val: duplicateMode === 'SKIP_DUPLICATES' ? estimatedDuplicates : 0, color: 'text-gray-500' },
                    { label: 'Warnings', val: validationErrors.length, color: 'text-rose-600' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50/30 border border-gray-200 p-4 rounded-2xl text-center select-none font-mono">
                      <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block font-sans">{item.label}</span>
                      <span className={`text-lg font-bold block mt-1 ${item.color}`}>{item.val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-955/10 border border-amber-950/20 p-4 rounded-2xl flex items-center justify-between text-left gap-4 select-none">
                  <div className="flex items-center gap-2 text-xs text-amber-305 font-semibold">
                    <FiEye className="text-amber-450 text-base shrink-0 animate-pulse" />
                    <span>Showing the first 50 of {totalRows.toLocaleString()} products. All {totalRows.toLocaleString()} products will be validated and imported.</span>
                  </div>
                  <Badge variant="info">Preview Mode</Badge>
                </div>

                <div className="bg-white/20 border border-gray-200/70 rounded-2xl overflow-x-auto shadow-xl">
                  <table className="w-full text-left text-gray-600 border-collapse min-w-[800px]">
                    <thead className="bg-white text-[10px] text-gray-500 uppercase font-mono font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">Row</th>
                        <th className="py-3 px-4">Medicine Name</th>
                        <th className="py-3 px-4">Composition</th>
                        <th className="py-3 px-4 font-mono">Barcode / SKU</th>
                        <th className="py-3 px-4 text-right">Purchase (₹)</th>
                        <th className="py-3 px-4 text-right">MRP (₹)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/50 text-xs font-semibold">
                      {validatedPreview.map((row, idx) => (
                        <tr 
                          key={idx} 
                          id={`preview-row-${row.row}`}
                          className={`transition-colors duration-350 ${row.valid ? 'hover:bg-white/20' : 'bg-rose-955/5 hover:bg-rose-955/10 border-l-2 border-rose-500'}`}
                        >
                          <td className="py-3 px-4 font-mono text-gray-400">{row.row}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-gray-700 block">{row.name || '-'}</span>
                            <span className="text-[10px] text-gray-500 font-medium block mt-0.5">Mfr: {row.manufacturerName || '-'}</span>
                          </td>
                          <td className="py-3 px-4 text-muted font-medium max-w-xs truncate">{row.genericName || '-'}</td>
                          <td className="py-3 px-4 font-mono text-[10px] text-gray-500 leading-relaxed">
                            <div>Bar: {row.barcode || '-'}</div>
                            <div className="text-gray-400">SKU: {row.sku || '-'}</div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">₹{parseFloat(row.cost || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-right font-mono text-gray-700">₹{parseFloat(row.mrp || 0).toFixed(2)}</td>
                          <td className="py-3 px-4 text-center select-none">
                            <Badge 
                              variant={row.status === 'DUPLICATE' ? 'warning' : row.status === 'INVALID' ? 'danger' : 'success'}
                              className="text-[8px] font-bold tracking-wider px-2"
                            >
                              {row.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* STEP 4: DETAILED VALIDATIONS LIST & STRUCTURED DIAGNOSTICS */}
            {step === 4 && (
              <div className="space-y-6 animate-slide-up">
                
                {/* Active scan progress indicators */}
                <div className="bg-gray-50/45 border border-gray-200 p-5 rounded-2xl text-left space-y-4">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">Active Validation Checklist</span>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${valScanActive ? 'bg-primary/20 border-teal-500 text-primary' : 'border-gray-300 bg-white text-slate-650'}`}>
                        <FiCheck className="text-[10px]" />
                      </div>
                      <span className={valScanActive ? 'text-gray-700' : 'text-gray-400'}>1. Scan spreadsheet</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${valDupSkuActive ? 'bg-primary/20 border-teal-500 text-primary' : 'border-gray-300 bg-white text-slate-650'}`}>
                        <FiCheck className="text-[10px]" />
                      </div>
                      <span className={valDupSkuActive ? 'text-gray-700' : 'text-gray-400'}>2. Check duplicates SKU</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${valDupBarcodeActive ? 'bg-primary/20 border-teal-500 text-primary' : 'border-gray-300 bg-white text-slate-650'}`}>
                        <FiCheck className="text-[10px]" />
                      </div>
                      <span className={valDupBarcodeActive ? 'text-gray-700' : 'text-gray-400'}>3. Check duplicates barcode</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${valPricesActive ? 'bg-primary/20 border-teal-500 text-primary' : 'border-gray-300 bg-white text-slate-650'}`}>
                        <FiCheck className="text-[10px]" />
                      </div>
                      <span className={valPricesActive ? 'text-gray-700' : 'text-gray-400'}>4. Pricing checks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${valRequiredActive ? 'bg-primary/20 border-teal-500 text-primary' : 'border-gray-300 bg-white text-slate-650'}`}>
                        <FiCheck className="text-[10px]" />
                      </div>
                      <span className={valRequiredActive ? 'text-gray-700' : 'text-gray-400'}>5. Check required keys</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  
                  {/* Left layout stats info */}
                  <div className="space-y-4 lg:col-span-1">
                    <div className="bg-gray-50/30 border border-gray-200 rounded-2xl p-5 space-y-4 text-left">
                      <h4 className="text-xs font-bold text-muted uppercase tracking-widest border-b border-gray-200 pb-2">Validation Summary</h4>
                      
                      <div className="space-y-3 font-semibold text-xs leading-relaxed">
                        <div className="flex justify-between">
                          <span className="text-gray-400 font-medium">Total Rows:</span>
                          <span className="font-mono text-gray-700 font-bold">{totalRows.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Valid Rows:</span>
                          <span className="font-mono text-emerald-450 font-bold">{(totalRows - validationErrors.length).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 font-medium">Invalid Rows:</span>
                          <span className={`font-mono font-bold ${validationErrors.length > 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                            {validationErrors.length.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {validationErrors.length > 0 && (
                        <div className="p-3 bg-amber-955/10 border border-amber-950/20 rounded-xl text-[10px] text-amber-300 leading-normal font-medium mt-4">
                          <FiAlertTriangle className="inline mr-1 text-xs mb-0.5" /> <strong>Partial Import:</strong> Valid rows can be imported directly. Ignored row warnings will allow the import process to complete.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Diagnostic Error cards panel */}
                  <div className="lg:col-span-3 bg-gray-50/30 border border-gray-200 p-5 rounded-2xl max-h-[500px] overflow-y-auto space-y-4 text-left">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-3 select-none">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
                        Detailed validation warnings ({validationErrors.length} issues detected)
                      </span>
                      {validationErrors.length > 0 && (
                        <button 
                          onClick={downloadErrorReport}
                          className="text-[10px] font-bold text-teal-450 hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <FiDownload size={11} /> Download Report
                        </button>
                      )}
                    </div>

                    {validationErrors.length === 0 ? (
                      <div className="py-24 text-center text-gray-500 select-none font-bold">
                        <FiCheckCircle className="text-emerald-450 text-3xl mx-auto mb-2.5 animate-bounce" />
                        All uploaded rows are structurally valid! Ready for final import.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {validationErrors.map((err, idx) => {
                          const costRaw = getRowValueByDbField(err.row, 'purchasePrice');
                          const mrpRaw = getRowValueByDbField(err.row, 'mrp');
                          
                          const cost = parseFloat(costRaw || 0);
                          const mrp = parseFloat(mrpRaw || 0);
                          const isPriceError = !isNaN(cost) && !isNaN(mrp) && (mrp < cost || costRaw || mrpRaw);
                          const difference = mrp - cost;

                          const errorText = err.details ? err.details.join('; ') : '';
                          let suggestedFix = 'Check that format and cells are populated correctly.';

                          if (errorText.toLowerCase().includes('mrp must be greater than or equal to purchase price')) {
                            suggestedFix = `Increase MRP to at least ${formatCurrency(cost)} or reduce Purchase Price.`;
                          } else if (errorText.toLowerCase().includes('mrp is required')) {
                            suggestedFix = 'Provide a numeric MRP rate column value.';
                          } else if (errorText.toLowerCase().includes('product name is required')) {
                            suggestedFix = 'Please input a brand/medicine name.';
                          } else if (errorText.toLowerCase().includes('barcode') || errorText.toLowerCase().includes('sku')) {
                            suggestedFix = 'Provide a unique barcode or change handling to Update mode.';
                          }

                          return (
                            <div key={idx} className="bg-gray-50/30 border border-gray-200/80 rounded-2xl p-5 space-y-4 hover:border-rose-500/20 transition-all duration-300 animate-fadeIn">
                              <div className="flex justify-between items-start border-b border-gray-200/50 pb-2">
                                <div>
                                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block font-mono">Row {err.row}</span>
                                  <h4 className="text-sm font-bold text-gray-800 mt-1">{err.name || 'Unknown Product'}</h4>
                                </div>
                                <Badge variant="danger" className="text-[8px] font-bold tracking-wider uppercase px-2 py-0.5">INVALID</Badge>
                              </div>

                              {isPriceError && (costRaw || mrpRaw) && (
                                <div className="grid grid-cols-3 gap-2 bg-gray-50/65 p-3 rounded-xl border border-gray-200/60 font-mono text-[11px] text-left">
                                  <div>
                                    <span className="text-[9px] text-gray-500 block uppercase font-sans">Purchase Price</span>
                                    <span className="text-gray-700 font-bold">{formatCurrency(cost)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-gray-500 block uppercase font-sans">MRP</span>
                                    <span className="text-gray-700 font-bold">{formatCurrency(mrp)}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-gray-500 block uppercase font-sans">Difference</span>
                                    <span className={difference < 0 ? 'text-rose-600 font-bold animate-pulse' : 'text-emerald-450 font-bold'}>
                                      {difference < 0 ? '-' : ''}{formatCurrency(Math.abs(difference))}
                                    </span>
                                  </div>
                                </div>
                              )}

                              <div className="text-xs leading-normal">
                                <span className="text-[9px] text-gray-400 uppercase font-sans tracking-wide block mb-1">Validation Warnings</span>
                                <ul className="list-disc pl-4 text-gray-600 space-y-0.5 font-semibold">
                                  {(err.details || err.errors || []).map((d: string, i: number) => (
                                    <li key={i}>{d}</li>
                                  ))}
                                </ul>
                              </div>

                              <div className="bg-rose-500/5 p-3 rounded-xl border border-rose-500/10 text-xs text-rose-300 leading-relaxed font-semibold flex gap-2">
                                <FiAlertTriangle className="text-rose-600 shrink-0 mt-0.5" />
                                <div>
                                  <span className="font-bold block text-[10px] text-rose-400 uppercase tracking-wide">Suggested Fix</span>
                                  <p className="mt-0.5 text-gray-600">{suggestedFix}</p>
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2 border-t border-gray-200/60 text-[10px] font-bold">
                                <button 
                                  onClick={() => locateRow(err.row)} 
                                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-muted hover:text-gray-800 uppercase transition-colors cursor-pointer"
                                >
                                  Locate Row
                                </button>
                                <button 
                                  onClick={() => downloadSingleError(err)} 
                                  className="px-3.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-muted hover:text-gray-800 uppercase transition-colors cursor-pointer"
                                >
                                  Download Error
                                </button>
                                <button 
                                  onClick={() => ignoreRow(err.row)} 
                                  className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-450 rounded-xl uppercase transition-colors cursor-pointer"
                                >
                                  Ignore Row
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            )}

            {/* STEP 5: CONFIRMATION REVIEW SCREEN */}
            {step === 5 && (
              <div className="space-y-6 max-w-2xl mx-auto py-2 animate-slide-up text-left">
                <div className="text-center space-y-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2 border border-teal-500/25">
                    <FiSettings className="text-xl animate-pulse" />
                  </div>
                  <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide">Confirm Import Execution</h3>
                  <p className="text-xs text-slate-455 font-semibold">Review sheet parameters, database mapping tallies, and estimations before starting.</p>
                </div>

                <div className="bg-gray-50/35 border border-gray-200 rounded-3xl p-6 space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-b border-gray-200 pb-5 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Workbook Name</span>
                      <span className="text-gray-700 font-bold block mt-1 font-mono truncate max-w-[200px]">{file?.name}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Worksheet Selected</span>
                      <span className="text-teal-450 font-bold block mt-1">{selectedWorksheet || 'Default'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Rows Found</span>
                      <span className="text-gray-700 font-bold block mt-1 font-mono">{totalRows.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 border-b border-gray-200 pb-5 text-sm">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Valid Rows</span>
                      <span className="text-emerald-450 font-bold block mt-1 font-mono">{validCount.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Invalid Rows</span>
                      <span className={`font-bold block mt-1 font-mono ${invalidCount > 0 ? 'text-rose-600' : 'text-muted'}`}>
                        {invalidCount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Duplicate Mode</span>
                      <span className="text-gray-700 font-bold block mt-1 font-sans">{getDuplicateModeLabel(duplicateMode)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="bg-white p-4 rounded-xl border border-gray-200/65 text-center">
                      <span className="text-[9px] text-gray-400 font-sans block uppercase font-bold">Records to Create</span>
                      <span className="text-base font-bold text-emerald-450 block mt-1">{confCreateCount.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200/65 text-center">
                      <span className="text-[9px] text-gray-500 font-sans block uppercase font-bold">Records to Update</span>
                      <span className="text-base font-bold text-teal-450 block mt-1">{confUpdateCount.toLocaleString()}</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200/65 text-center">
                      <span className="text-[9px] text-gray-500 font-sans block uppercase font-bold">Skipped (Dup / Err)</span>
                      <span className="text-base font-bold text-amber-405 block mt-1">{confSkipCount.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/65 text-center">
                      <span className="text-[9px] text-gray-500 font-sans block uppercase font-bold">Estimated Time</span>
                      <span className="text-base font-bold text-primary block mt-1 font-sans">{estimatedTimeSeconds} Seconds</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 flex flex-col items-center justify-center text-center space-y-4">
                    <span className="text-base font-bold text-gray-700">Start Product Catalog Import?</span>
                    <p className="text-xs text-gray-500 font-medium max-w-md">Clicking Start Import will initiate chunked database writing. Do not shut down or reload during the process.</p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 6: LIVE IMPORT PROGRESS & RUNNING CHECKS */}
            {step === 6 && (
              <div className="space-y-8 max-w-2xl mx-auto py-4 animate-slide-up text-left">
                
                {/* Real-time speed stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-mono">
                  <div className="bg-gray-50/35 border border-gray-200 p-4 rounded-2xl select-none">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block font-sans">Processing Speed</span>
                    <span className="text-lg font-bold text-primary block mt-1">{importSpeed} rows/sec</span>
                  </div>
                  <div className="bg-gray-50/35 border border-gray-200 p-4 rounded-2xl select-none">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block font-sans">Elapsed Time</span>
                    <span className="text-lg font-bold text-gray-700 block mt-1">
                      {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="bg-gray-50/35 border border-gray-200 p-4 rounded-2xl select-none">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block font-sans">Remaining Time</span>
                    <span className="text-lg font-bold text-primary block mt-1">
                      {Math.floor(remainingSeconds / 60)}:{(remainingSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="bg-gray-50/35 border border-gray-200 p-4 rounded-2xl select-none">
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block font-sans">Current Chunk</span>
                    <span className="text-lg font-bold text-emerald-450 block mt-1">
                      {Math.min(totalRows, Math.round((importProgress / 100) * totalRows))} / {totalRows}
                    </span>
                  </div>
                </div>

                {/* Real-time loader */}
                <div className="py-2 text-center space-y-5 select-none">
                  <div className="space-y-2">
                    <h3 className="text-base font-bold text-gray-800 uppercase tracking-wide flex items-center justify-center gap-2">
                      <FiActivity className="text-primary animate-pulse text-base" /> Writing Records
                    </h3>
                    <p className="text-xs text-teal-455 font-mono font-bold animate-pulse">{currentBatchText}</p>
                    <p className="text-[11px] text-gray-500 font-mono font-semibold max-w-sm mx-auto truncate">
                      Current Item: {currentProductName || 'Processing...'}
                    </p>
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <div className="w-full bg-white rounded-full h-3.5 overflow-hidden border border-gray-200 p-0.5 shadow-inner">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-350 shadow-[0_0_10px_rgba(20,184,166,0.7)]" 
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono font-bold px-1 select-none">
                      <span>Import progress: {importProgress}%</span>
                      <span>Transactional boundary active</span>
                    </div>
                  </div>
                </div>

                {/* Operations checklist ticks */}
                <div className="bg-gray-50/30 border border-gray-200 p-5 rounded-3xl space-y-3.5">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block font-mono">Live Operations Log</span>
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opValidating ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-600'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opValidating ? 'text-gray-700' : 'text-gray-500'}>Validating rows</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opCreatingProduct ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-650'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opCreatingProduct ? 'text-gray-700' : 'text-gray-500'}>Creating catalog profiles</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opCreatingCategory ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-650'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opCreatingCategory ? 'text-gray-700' : 'text-gray-500'}>Auto category indexing</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opCreatingManufacturer ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-650'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opCreatingManufacturer ? 'text-gray-700' : 'text-gray-500'}>Auto manufacturer resolver</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opWritingAudit ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-650'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opWritingAudit ? 'text-gray-700' : 'text-gray-500'}>Writing audit traces</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center transition-all ${opQueueSync ? 'bg-emerald-500/20 border-emerald-500 text-emerald-450' : 'border-gray-200 bg-gray-50 text-slate-650'}`}>
                        <FiCheck className="text-[11px]" />
                      </div>
                      <span className={opQueueSync ? 'text-gray-700' : 'text-gray-500'}>Queuing sync records</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={handleCancelRequest}
                    disabled={cancelRequested}
                    className="px-6 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 hover:text-rose-400 border border-rose-500/20 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                  >
                    {cancelRequested ? 'Cancelling on next chunk transaction boundary...' : 'Cancel Import Session'}
                  </button>
                </div>
              </div>
            )}

            {/* STEP 7: IMPORT COMPLETED */}
            {step === 7 && summary && (
              <div className="space-y-6 max-w-4xl mx-auto py-2 animate-scale-in text-left">
                <div className="text-center space-y-2 py-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 flex items-center justify-center mx-auto mb-2 animate-bounce">
                    <FiCheckCircle className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 uppercase tracking-wide">Import Completed Successfully</h3>
                  <p className="text-xs text-gray-500 font-bold">Catalog import session finished in {summary.timeTaken} seconds.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Rows Scanned', val: summary.rowsRead, color: 'text-gray-700' },
                    { label: 'Imported (New)', val: summary.imported, color: 'text-emerald-400 font-bold' },
                    { label: 'Updated Profiles', val: summary.updated, color: 'text-primary font-bold' },
                    { label: 'Skipped Rows', val: summary.skipped, color: 'text-amber-400 font-bold' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-gray-50/35 border border-gray-200 p-4.5 rounded-2xl text-center select-none font-mono">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block font-sans">{item.label}</span>
                      <span className={`text-xl font-bold block mt-1 ${item.color}`}>{item.val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-semibold text-xs leading-normal">
                  <div className="bg-white/45 border border-gray-200 p-4 rounded-xl flex justify-between items-center text-left">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Write Failures</span>
                      <span className={`text-base font-bold font-mono block mt-1 ${summary.failed > 0 ? 'text-rose-600' : 'text-slate-405'}`}>
                        {summary.failed} rows failed
                      </span>
                    </div>
                    {summary.failed > 0 && (
                      <button
                        onClick={downloadErrorReport}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-teal-450 hover:text-primary font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FiDownload size={11} /> CSV Report
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50/45 border border-gray-200 p-4 rounded-xl flex justify-between items-center text-left">
                    <div>
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Validation errors</span>
                      <span className={`text-base font-bold font-mono block mt-1 ${summary.validationErrorsCount > 0 ? 'text-amber-405' : 'text-muted'}`}>
                        {summary.validationErrorsCount} rows rejected
                      </span>
                    </div>
                    {summary.validationErrorsCount > 0 && (
                      <button
                        onClick={downloadErrorReport}
                        className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-teal-450 hover:text-primary font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <FiDownload size={11} /> CSV Report
                      </button>
                    )}
                  </div>

                  <div className="bg-gray-50/45 border border-gray-200 p-4 rounded-xl flex justify-between items-center text-left">
                    <div>
                      <span className="text-[9px] text-gray-400 uppercase tracking-wider block">Import Audit Traces</span>
                      <span className="text-[10px] font-bold font-mono text-muted block mt-1 max-w-[130px] truncate">
                        IMP-{new Date().toISOString().slice(0, 10).replace(/-/g, '')}
                      </span>
                    </div>
                    <button
                      onClick={downloadImportLog}
                      className="px-2.5 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-teal-450 hover:text-primary font-bold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <FiFileText size={11} /> Session Log
                    </button>
                  </div>
                </div>

                {summary.failedRowsList && summary.failedRowsList.length > 0 && (
                  <div className="p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center justify-between text-left gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-rose-400 uppercase tracking-wide block flex items-center gap-1">
                        <FiAlertOctagon size={13} className="text-rose-600 animate-pulse" /> Catalog Import Warnings ({summary.failedRowsList.length} items failed)
                      </span>
                      <p className="text-[11px] text-gray-500 font-medium leading-normal">Download the detailed diagnostics spreadsheet, fix the errors, and reload the retry file to write them.</p>
                    </div>
                    <button
                      onClick={handleRetryFailedRows}
                      className="px-4.5 py-2.5 bg-primary hover:bg-teal-650 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg hover:shadow-teal-500/20 transition-all shrink-0 uppercase tracking-wider font-bold"
                    >
                      <FiPlay size={11} /> Load & Retry Failed Rows
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer Navigation controls */}
          <div className="px-8 py-4 bg-white/30 border-t border-gray-200/80 flex justify-between items-center select-none text-xs font-bold">
            <div>
              {step > 1 && step < 6 && (
                <button
                  onClick={prevStep}
                  className="px-4.5 py-2.5 border border-gray-200 hover:bg-gray-100 rounded-xl text-muted hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Back
                </button>
              )}
            </div>
            
            <div className="flex gap-2">
              {step === 1 && file && (
                <Button 
                  onClick={nextStep}
                  disabled={isLoadingFile}
                  variant="primary" 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
                >
                  Next: Map Columns <FiChevronRight />
                </Button>
              )}

              {step === 2 && (
                <Button 
                  onClick={proceedToPreview}
                  disabled={isValidating}
                  variant="primary" 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wide"
                >
                  {isValidating ? <FiRefreshCw className="animate-spin" /> : null} Next: Preview Data <FiChevronRight />
                </Button>
              )}

              {step === 3 && (
                <Button 
                  onClick={nextStep}
                  variant="primary" 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
                >
                  Next: Validation Checks <FiChevronRight />
                </Button>
              )}

              {step === 4 && (
                <Button 
                  onClick={nextStep}
                  variant="primary" 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5 cursor-pointer text-xs uppercase tracking-wide"
                >
                  Next: Summary Review <FiChevronRight />
                </Button>
              )}

              {step === 5 && (
                <Button 
                  onClick={executeImport}
                  disabled={totalRows === validationErrors.length}
                  variant="primary" 
                  className="px-6 py-2.5 font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 text-xs uppercase tracking-wide"
                >
                  Start Import <FiPlay size={12} className="ml-1" />
                </Button>
              )}

              {step === 7 && (
                <div className="flex items-center gap-2">
                  <Button 
                    onClick={() => {
                      resetState();
                    }}
                    variant="outline" 
                    className="px-5 py-2.5 font-bold flex items-center gap-1 text-xs cursor-pointer text-gray-600 border-gray-200 hover:bg-gray-100"
                  >
                    Import Another File
                  </Button>
                  <Button 
                    onClick={onClose}
                    variant="primary" 
                    className="px-5 py-2.5 font-bold flex items-center gap-1 text-xs cursor-pointer"
                  >
                    Finish
                  </Button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
};
