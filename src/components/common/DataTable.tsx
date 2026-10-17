'use client';

import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  searchPlaceholder?: string;
  searchFields?: (keyof T)[];
  defaultSortField?: string;
  defaultSortOrder?: 'asc' | 'desc';
  pageSize?: number;
  onRowClick?: (item: T) => void;
  actions?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  emptyTitle = 'No records found',
  emptyDescription = 'No data currently exists for this view.',
  searchPlaceholder = 'Search records...',
  searchFields,
  defaultSortField,
  defaultSortOrder = 'desc',
  pageSize = 10,
  onRowClick,
  actions,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string | undefined>(defaultSortField);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(defaultSortOrder);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(pageSize);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase().trim();

    return data.filter((item) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field];
          if (val === null || val === undefined) return false;
          return String(val).toLowerCase().includes(term);
        });
      }
      return Object.values(item).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') return false;
        return String(val).toLowerCase().includes(term);
      });
    });
  }, [data, searchTerm, searchFields]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const aDate = Date.parse(aVal);
        const bDate = Date.parse(bVal);
        if (!isNaN(aDate) && !isNaN(bDate)) {
          return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
        }
        return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedData.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, safePage, rowsPerPage]);

  const handleSort = (key: string) => {
    if (sortField === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(key);
      setSortOrder('asc');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[#D4621A]/15 shadow-2xs overflow-hidden flex flex-col">
      {/* Top Search & Actions */}
      <div className="p-3.5 sm:p-4 border-b border-[#D4621A]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8F3F0]">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#D4621A]/25 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#D4621A] focus:ring-1 focus:ring-[#D4621A] transition-colors shadow-2xs"
          />
        </div>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Table container */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-xs text-left">
          <thead className="bg-[#F8F3F0] text-slate-800 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-[#D4621A]/15">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`py-3 px-4 ${col.sortable !== false ? 'cursor-pointer hover:text-[#D4621A] select-none' : ''} ${
                    col.className || ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.header}</span>
                    {col.sortable !== false && (
                      <span className="text-slate-400">
                        {sortField === col.key ? (
                          sortOrder === 'asc' ? (
                            <ArrowUp className="w-3 h-3 text-[#D4621A]" />
                          ) : (
                            <ArrowDown className="w-3 h-3 text-[#D4621A]" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#D4621A]/10 text-slate-800">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center text-xs text-slate-400">
                  Loading records...
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              paginatedData.map((item, idx) => (
                <tr
                  key={item.id || idx}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-[#D4621A]/5' : 'hover:bg-[#F8F3F0]/60'
                  }`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 ${col.className || ''}`}>
                      {col.render ? col.render(item) : item[col.key] !== undefined && item[col.key] !== null ? String(item[col.key]) : '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!loading && sortedData.length > 0 && (
        <div className="p-3 border-t border-[#D4621A]/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 bg-[#F8F3F0]">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#D4621A]/25 rounded px-2 py-0.5 text-xs text-slate-900 focus:outline-none focus:border-[#D4621A] cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400 ml-2">
              Showing {(safePage - 1) * rowsPerPage + 1} to {Math.min(safePage * rowsPerPage, sortedData.length)} of {sortedData.length} records
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={safePage === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-2 py-0.5 font-mono text-xs font-semibold text-slate-900">
              Page {safePage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={safePage === totalPages}
              className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
