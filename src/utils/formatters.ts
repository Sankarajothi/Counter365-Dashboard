/**
 * Format currency to INR (₹)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format numbers with Indian numbering grouping (lakhs, crores)
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return '0';
  return new Intl.NumberFormat('en-IN').format(val);
}

/**
 * Format phone number
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

/**
 * Export data array to CSV file
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
): void {
  if (!data || data.length === 0) {
    alert('No records available to export.');
    return;
  }

  const headers = columns
    ? columns.map((c) => `"${String(c.label).replace(/"/g, '""')}"`)
    : Object.keys(data[0]).map((k) => `"${String(k).replace(/"/g, '""')}"`);

  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  const rows = data.map((item) =>
    keys
      .map((k) => {
        const val = item[k];
        if (val === null || val === undefined) return '""';
        if (typeof val === 'number') {
          return Number.isFinite(val) ? String(val) : '""';
        }
        if (typeof val === 'boolean') {
          return val ? 'TRUE' : 'FALSE';
        }
        if (typeof val === 'object') {
          return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
        }
        const cleanStr = String(val).replace(/\r?\n|\r/g, ' ').trim();
        return `"${cleanStr.replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const cleanBaseName = filename.toLowerCase().endsWith('.csv') ? filename.slice(0, -4) : filename;
  link.setAttribute('download', `${cleanBaseName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
