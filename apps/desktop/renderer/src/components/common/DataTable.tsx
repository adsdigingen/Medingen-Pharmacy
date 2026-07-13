import React, { useState, useMemo } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';
import { Button } from './Button';

export interface Column<T> {
  header: string;
  accessor: (row: T) => React.ReactNode;
  className?: string;
  sortKey?: string; // key of row data to sort on (optional)
  exportValue?: (row: T) => string; // string value for CSV/Excel export
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  errorMessage?: string;
  
  // Custom configurations
  enableSelection?: boolean;
  onSelectionChange?: (selectedRows: T[]) => void;
  stickyHeader?: boolean;
  pinnedFirstColumn?: boolean;
  itemsPerPage?: number;
  tableName?: string;

  // Server-side / external pagination & search overrides
  serverSide?: boolean;
  totalItems?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  onSearchChange?: (term: string) => void;
  searchTerm?: string;
  itemsPerPageOptions?: number[];
  onItemsPerPageChange?: (limit: number) => void;
}

export function DataTable<T>({
  data = [],
  columns,
  loading = false,
  onRowClick,
  emptyMessage = "No records found.",
  errorMessage,
  enableSelection = false,
  onSelectionChange,
  stickyHeader = true,
  pinnedFirstColumn = true,
  itemsPerPage = 10,
  tableName = "export_data",
  serverSide = false,
  totalItems = 0,
  currentPage: currentPageProp = 1,
  onPageChange,
  onSearchChange,
  searchTerm: searchTermProp = '',
  itemsPerPageOptions = [25, 50, 100, 250, 500],
  onItemsPerPageChange,
}: DataTableProps<T>) {
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  
  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map(c => c.header)
  );
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Column Resizer states
  const [columnWidths, setColumnWidths] = useState<Record<number, number>>({});

  const startResize = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const th = (e.target as HTMLElement).parentElement;
    if (!th) return;
    const startWidth = th.getBoundingClientRect().width;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const width = startWidth + (moveEvent.clientX - startX);
      setColumnWidths(prev => ({
        ...prev,
        [index]: Math.max(80, width)
      }));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const getRowKey = (row: T, idx: number): string => {
    return (row as any).id !== undefined ? String((row as any).id) : String(idx);
  };

  const isServerSide = !!serverSide;
  const currentSearch = isServerSide ? searchTermProp : searchTerm;
  const activePage = isServerSide ? currentPageProp : currentPage;

  // Handle Sort
  const handleSort = (key: string | undefined) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Visibility toggle
  const toggleColumnVisibility = (header: string) => {
    setVisibleColumns(prev => 
      prev.includes(header)
        ? prev.filter(h => h !== header)
        : [...prev, header]
    );
  };

  // Filter, sort, paginate
  const processedData = useMemo(() => {
    if (isServerSide) return data;
    let result = [...data];

    // Local Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(row => {
        return Object.values(row as any).some(val => 
          String(val).toLowerCase().includes(lower)
        );
      });
    }

    // Local Sorting
    if (sortKey) {
      result.sort((a: any, b: any) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === undefined || valB === undefined) return 0;
        
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortDirection === 'asc' ? -1 : 1;
        if (strA > strB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortKey, sortDirection, isServerSide]);

  // Paginated data slice
  const paginatedData = useMemo(() => {
    if (isServerSide) return data;
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage, itemsPerPage, isServerSide, data]);

  const totalItemsCount = isServerSide ? totalItems : processedData.length;
  const activeLimit = isServerSide ? itemsPerPage : itemsPerPage;
  const calculatedTotalPages = isServerSide 
    ? Math.max(1, Math.ceil(totalItemsCount / activeLimit)) 
    : Math.ceil(totalItemsCount / activeLimit) || 1;

  // Handle selection toggles
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const activeDataList = isServerSide ? data : paginatedData;
      const newSelected = new Set<string>(activeDataList.map((row, idx) => getRowKey(row, idx)));
      setSelectedIds(newSelected);
      if (onSelectionChange) {
        onSelectionChange(activeDataList);
      }
    } else {
      setSelectedIds(new Set());
      if (onSelectionChange) {
        onSelectionChange([]);
      }
    }
  };

  const handleSelectRow = (idx: number, row: T, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = getRowKey(row, idx);
    const newSelected = new Set(selectedIds);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedIds(newSelected);

    if (onSelectionChange) {
      const activeDataList = isServerSide ? data : paginatedData;
      const selectedRows = activeDataList.filter((r, i) => newSelected.has(getRowKey(r, i)));
      onSelectionChange(selectedRows);
    }
  };

  // CSV Exporter
  const exportCSV = () => {
    const headers = columns.filter(c => visibleColumns.includes(c.header)).map(c => c.header).join(',');
    const rows = processedData.map(row => 
      columns
        .filter(c => visibleColumns.includes(c.header))
        .map(c => {
          const val = c.exportValue ? c.exportValue(row) : c.accessor(row);
          // If accessor returned ReactNode, stringify row properties or raw value
          const textVal = typeof val === 'string' || typeof val === 'number' 
            ? String(val) 
            : '';
          return `"${textVal.replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Print function
  const printTable = () => {
    const printWin = window.open('', '', 'width=900,height=600');
    if (!printWin) return;
    
    let html = `
      <html>
        <head>
          <title>${tableName.replace(/_/g, ' ').toUpperCase()}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #111; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 12px; }
            th { background-color: #f2f2f2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${tableName.replace(/_/g, ' ').toUpperCase()}</h2>
          <p>Generated on ${new Date().toLocaleString()}</p>
          <table>
            <thead>
              <tr>
    `;
    
    columns.filter(c => visibleColumns.includes(c.header)).forEach(c => {
      html += `<th>${c.header}</th>`;
    });
    
    html += `
              </tr>
            </thead>
            <tbody>
    `;

    processedData.forEach(row => {
      html += '<tr>';
      columns.filter(c => visibleColumns.includes(c.header)).forEach(c => {
        const val = c.exportValue ? c.exportValue(row) : c.accessor(row);
        const textVal = typeof val === 'string' || typeof val === 'number' ? String(val) : '';
        html += `<td>${textVal}</td>`;
      });
      html += '</tr>';
    });

    html += `
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    printWin.print();
    printWin.close();
  };

  // Columns to display
  const activeColumns = useMemo(() => {
    return columns.filter(col => visibleColumns.includes(col.header));
  }, [columns, visibleColumns]);

  return (
    <div className="space-y-3.5 w-full">
      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50 p-3.5 border border-gray-200 rounded-2xl text-xs">
        
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <input
            type="text"
            value={currentSearch}
            onChange={(e) => {
              if (isServerSide) {
                onSearchChange?.(e.target.value);
              } else {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }
            }}
            placeholder={isServerSide ? "Search all products..." : "Search within this page..."}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-800"
          />
          <svg className="absolute left-2.5 top-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Visibility & Exporters */}
        <div className="flex items-center gap-2 self-end sm:self-auto relative">
          
          {/* Column Visibility Selector */}
          <div className="relative">
            <button 
              onClick={() => setShowVisibilityDropdown(!showVisibilityDropdown)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 flex items-center gap-1.5 cursor-pointer"
            >
              Columns
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showVisibilityDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowVisibilityDropdown(false)}></div>
                <div className="absolute right-0 mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 p-2 space-y-1.5">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block px-2 pb-1 border-b border-gray-100">Toggle Columns</span>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {columns.map((c, i) => (
                      <label key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer text-gray-700">
                        <input
                          type="checkbox"
                          checked={visibleColumns.includes(c.header)}
                          onChange={() => toggleColumnVisibility(c.header)}
                          className="rounded border-gray-300 text-primary focus:ring-0 focus:ring-offset-0"
                        />
                        <span className="truncate">{c.header}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Exporters */}
          <button onClick={exportCSV} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 cursor-pointer">CSV</button>
          <button onClick={exportCSV} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 cursor-pointer">Excel</button>
          <button onClick={printTable} className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-800 cursor-pointer">Print</button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="overflow-hidden border border-gray-200 rounded-2xl bg-white shadow-sm">
        <div className="overflow-x-auto w-full max-h-[500px]">
          <table className="min-w-full divide-y divide-gray-200 text-xs table-fixed">
            <thead className={`${stickyHeader ? 'sticky top-0 z-20' : ''} bg-gray-50`}>
              <tr className="border-b border-gray-200">
                {enableSelection && (
                  <th scope="col" className="w-12 px-6 py-3 text-left bg-gray-50 sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                      className="rounded border-gray-300 text-primary focus:ring-0 focus:ring-offset-0"
                    />
                  </th>
                )}
                {activeColumns.map((col, idx) => {
                  const isPinned = pinnedFirstColumn && idx === 0;
                  const pinnedClass = isPinned 
                    ? `sticky ${enableSelection ? 'left-12' : 'left-0'} z-30 bg-gray-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] border-r border-gray-200` 
                    : '';
                  return (
                    <th
                      key={idx}
                      scope="col"
                      onClick={() => handleSort(col.sortKey)}
                      style={{ width: columnWidths[idx] ? `${columnWidths[idx]}px` : undefined }}
                      className={`relative px-6 py-3 text-left font-bold text-gray-500 tracking-wider uppercase text-[10px] select-none ${
                        col.sortKey ? 'cursor-pointer hover:text-gray-800' : ''
                      } ${pinnedClass} ${col.className || ''}`}
                    >
                      <div className="flex items-center gap-1">
                        {col.header}
                        {col.sortKey && sortKey === col.sortKey && (
                          <span className="text-primary">
                            {sortDirection === 'asc' ? '▲' : '▼'}
                          </span>
                        )}
                      </div>
                      {/* Column Drag Resizer Handle */}
                      <div 
                        onMouseDown={(e) => startResize(idx, e)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary z-40"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {errorMessage ? (
                <tr>
                  <td colSpan={activeColumns.length + (enableSelection ? 1 : 0)} className="px-6 py-12 text-center text-rose-600 font-bold">
                    Error loading data: {errorMessage}
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={activeColumns.length + (enableSelection ? 1 : 0)} className="px-6 py-12">
                    <LoadingSkeleton rows={5} />
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={activeColumns.length + (enableSelection ? 1 : 0)} className="px-6 py-12">
                    <EmptyState title="No records found" description={emptyMessage} />
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rowIdx) => {
                  const isSelected = selectedIds.has(getRowKey(row, rowIdx));
                  return (
                    <tr
                      key={rowIdx}
                      onClick={() => onRowClick?.(row)}
                      className={`hover:bg-gray-50/80 transition-colors group ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-primary-light' : ''}`}
                    >
                      {enableSelection && (
                        <td className="px-6 py-3 bg-white sticky left-0 z-10 border-r border-gray-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] group-hover:bg-gray-50/80" onClick={(e) => handleSelectRow(rowIdx, row, e)}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="rounded border-gray-300 text-primary focus:ring-0 focus:ring-offset-0"
                          />
                        </td>
                      )}
                      {activeColumns.map((col, colIdx) => {
                        const isPinned = pinnedFirstColumn && colIdx === 0;
                        const cellPinnedClass = isPinned 
                          ? `sticky ${enableSelection ? 'left-12' : 'left-0'} z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] ${
                              isSelected ? 'bg-[#f4f2fd]' : 'bg-white group-hover:bg-gray-50/80'
                            }` 
                          : '';
                        return (
                          <td key={colIdx} className={`px-6 py-3 text-gray-700 leading-normal ${cellPinnedClass} ${col.className || ''}`}>
                            {col.accessor(row)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {((isServerSide && totalItemsCount > 0) || (!isServerSide && processedData.length > itemsPerPage)) && !loading && !errorMessage && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3.5 bg-gray-50 border-t border-gray-200 gap-4">
            <div className="flex items-center gap-4 text-gray-500">
              <span>
                Showing{' '}
                <span className="font-semibold text-gray-800">
                  {totalItemsCount === 0 ? 0 : (activePage - 1) * activeLimit + 1}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-gray-800">
                  {Math.min(totalItemsCount, activePage * activeLimit)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-gray-800">{totalItemsCount.toLocaleString()}</span> records
              </span>
              
              {isServerSide && onItemsPerPageChange && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-gray-500 font-medium">Rows Per Page:</span>
                  <select
                    value={activeLimit}
                    onChange={(e) => onItemsPerPageChange(parseInt(e.target.value, 10))}
                    className="bg-white border border-gray-200 px-2 py-1 rounded text-gray-800 font-bold focus:outline-none"
                  >
                    {itemsPerPageOptions.map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isServerSide) {
                    onPageChange?.(1);
                  } else {
                    setCurrentPage(1);
                  }
                }}
                disabled={activePage === 1}
              >
                &laquo; First
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isServerSide) {
                    onPageChange?.(Math.max(1, activePage - 1));
                  } else {
                    setCurrentPage(p => Math.max(1, p - 1));
                  }
                }}
                disabled={activePage === 1}
              >
                Prev
              </Button>
              <span className="px-3.5 py-1.5 font-bold font-mono text-gray-700 bg-white rounded-lg flex items-center border border-gray-200">
                Page {activePage} of {calculatedTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isServerSide) {
                    onPageChange?.(Math.min(calculatedTotalPages, activePage + 1));
                  } else {
                    setCurrentPage(p => Math.min(calculatedTotalPages, p + 1));
                  }
                }}
                disabled={activePage === calculatedTotalPages}
              >
                Next
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isServerSide) {
                    onPageChange?.(calculatedTotalPages);
                  } else {
                    setCurrentPage(calculatedTotalPages);
                  }
                }}
                disabled={activePage === calculatedTotalPages}
              >
                Last &raquo;
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
