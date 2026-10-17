import React from 'react';
import { Download } from 'lucide-react';
import { exportToCSV } from '../../utils/formatters';

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[];
  filename: string;
  columns?: { key: keyof T; label: string }[];
  label?: string;
  disabled?: boolean;
}

export const ExportButton = <T extends Record<string, any>>({
  data,
  filename,
  columns,
  label = 'Export CSV',
  disabled = false,
}: ExportButtonProps<T>) => {
  const handleExport = () => {
    exportToCSV(data, filename, columns);
  };

  return (
    <button
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      title={data.length === 0 ? 'No records to export' : `Export ${data.length} real record(s) to CSV`}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-300 bg-white text-slate-700 shadow-2xs transition-all cursor-pointer ${
        disabled || data.length === 0
          ? 'opacity-40 cursor-not-allowed'
          : 'hover:border-[#D4621A] hover:bg-[#D4621A] hover:text-white'
      }`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label}</span>
      {data.length > 0 && (
        <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
          {data.length}
        </span>
      )}
    </button>
  );
};
