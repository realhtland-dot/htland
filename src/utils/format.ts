import * as XLSX from 'xlsx';
import type { CustomerItem } from '../types/crm.ts';

export function formatVndShort(amount?: number | null): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return 'Chưa rõ';
  if (amount >= 1_000_000_000) {
    const ty = amount / 1_000_000_000;
    return `${Number.isInteger(ty) ? ty : ty.toFixed(2).replace(/\.?0+$/, '')} tỷ`;
  }
  if (amount >= 1_000_000) {
    const tr = Math.round(amount / 1_000_000);
    return `${tr.toLocaleString('vi-VN')} triệu`;
  }
  return `${amount.toLocaleString('vi-VN')} đ`;
}

export function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Vừa xong';
  let date: Date;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    date = (ts as { toDate: () => Date }).toDate();
  } else if (typeof ts === 'string' || typeof ts === 'number') {
    date = new Date(ts);
  } else {
    return 'Vừa xong';
  }
  if (Number.isNaN(date.getTime())) return 'Vừa xong';
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function toDateObj(ts: unknown): Date {
  if (!ts) return new Date();
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    return (ts as { toDate: () => Date }).toDate();
  }
  if (typeof ts === 'string' || typeof ts === 'number') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  return new Date();
}

export function exportCustomersToExcel(customers: CustomerItem[]) {
  const rows = customers.map((c) => ({
    'Mã KH': c.id,
    'Họ tên': c.fullName,
    'Số điện thoại chính': c.primaryPhone || '',
    'Tất cả SĐT': (c.phones || []).join(', '),
    'Facebook ID': c.facebookId || '',
    'Fanpage nguồn': c.sourcePageName || '',
    'Nhu cầu': c.intent,
    'Loại BĐS': c.propertyType || '',
    'Tỉnh/TP': c.province || '',
    'Quận/Huyện': c.district || '',
    'Ngân sách tối đa (VND)': c.budgetMax ?? '',
    'Diện tích (m2)': c.areaMax ?? c.areaMin ?? '',
    'Điểm tiềm năng': c.leadScore ?? 0,
    'Mức ưu tiên': c.priority,
    'Trạng thái': c.status,
    'Nhân viên phụ trách': c.assignedToName || '',
    'Ghi chú': c.notesSummary || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'KhachHangCRM');
  XLSX.writeFile(workbook, `realty_crm_khach_hang_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export async function parseCustomersExcelFile(file: File): Promise<
  Array<{
    fullName: string;
    primaryPhone: string;
    province: string;
    district: string;
    notesSummary: string;
  }>
> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

  return rawRows
    .map((r) => ({
      fullName: String(r['Họ tên'] || r['fullName'] || r['Ten'] || '').trim(),
      primaryPhone: String(r['Số điện thoại chính'] || r['SĐT'] || r['phone'] || '').trim(),
      province: String(r['Tỉnh/TP'] || r['province'] || '').trim(),
      district: String(r['Quận/Huyện'] || r['district'] || '').trim(),
      notesSummary: String(r['Ghi chú'] || r['notes'] || '').trim(),
    }))
    .filter((item) => item.fullName.length > 0);
}
