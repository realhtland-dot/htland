import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Download,
  GitMerge,
  Plus,
  Search,
  Trash2,
  Upload,
  Edit3,
  Phone,
  X,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import {
  CUSTOMER_STATUSES,
  INTENT_LABELS,
  type CustomerActivityItem,
  type CustomerItem,
  type CustomerNoteItem,
  type LeadPriority,
  type RealEstateIntent,
} from '../types/crm.ts';
import {
  addCustomerNote,
  createCustomer,
  deleteCustomer,
  mergeDuplicateCustomers,
  updateCustomer,
} from '../services/crmActions.ts';
import {
  exportCustomersToExcel,
  formatTimestamp,
  formatVndShort,
  parseCustomersExcelFile,
  toDateObj,
} from '../utils/format.ts';

export const CustomersListView: React.FC<{
  data: CrmDataset;
  onlyHighPotential?: boolean;
}> = ({ data, onlyHighPotential = false }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { globalSearch, openCustomerDetail, pushToast } = useCrmStore();

  const [localSearch, setLocalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [intentFilter, setIntentFilter] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CustomerItem | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeSource, setMergeSource] = useState<CustomerItem | null>(null);

  const [formState, setFormState] = useState({
    fullName: '',
    primaryPhone: '',
    intent: 'BUY_LAND' as RealEstateIntent,
    propertyType: 'LAND',
    province: 'TP.HCM',
    district: '',
    budgetMax: '',
    areaMax: '',
    legalRequirement: '',
    priority: 'MEDIUM' as LeadPriority,
    status: 'Khách mới',
    notesSummary: '',
  });

  const filtered = useMemo(() => {
    const q = (localSearch || globalSearch).trim().toLowerCase();
    return data.customers.filter((c) => {
      if (onlyHighPotential && c.priority !== 'HIGH' && (c.leadScore || 0) < 75) return false;
      if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
      if (intentFilter !== 'ALL' && c.intent !== intentFilter) return false;
      if (q) {
        const matches =
          c.fullName.toLowerCase().includes(q) ||
          (c.primaryPhone || '').includes(q) ||
          (c.district || '').toLowerCase().includes(q) ||
          (c.province || '').toLowerCase().includes(q) ||
          (c.sourcePageName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [data.customers, onlyHighPotential, statusFilter, intentFilter, localSearch, globalSearch]);

  const openCreate = () => {
    setEditingCustomer(null);
    setFormState({
      fullName: '',
      primaryPhone: '',
      intent: 'BUY_LAND',
      propertyType: 'LAND',
      province: 'TP.HCM',
      district: '',
      budgetMax: '',
      areaMax: '',
      legalRequirement: '',
      priority: 'MEDIUM',
      status: 'Khách mới',
      notesSummary: '',
    });
    setShowCreateModal(true);
  };

  const openEdit = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFormState({
      fullName: c.fullName,
      primaryPhone: c.primaryPhone || '',
      intent: c.intent,
      propertyType: c.propertyType || 'LAND',
      province: c.province || '',
      district: c.district || '',
      budgetMax: c.budgetMax ? String(c.budgetMax) : '',
      areaMax: c.areaMax ? String(c.areaMax) : '',
      legalRequirement: c.legalRequirement || '',
      priority: c.priority,
      status: c.status,
      notesSummary: c.notesSummary || '',
    });
    setShowCreateModal(true);
  };

  const handleSubmitCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const phones = formState.primaryPhone.trim() ? [formState.primaryPhone.trim()] : [];
    const payload = {
      fullName: formState.fullName.trim(),
      primaryPhone: formState.primaryPhone.trim(),
      phones,
      sourceChannel: 'Nhập thủ công CRM',
      intent: formState.intent,
      propertyType: formState.propertyType,
      province: formState.province.trim(),
      district: formState.district.trim(),
      budgetMax: formState.budgetMax ? Number(formState.budgetMax) : null,
      areaMax: formState.areaMax ? Number(formState.areaMax) : null,
      legalRequirement: formState.legalRequirement.trim(),
      leadScore: formState.priority === 'HIGH' ? 85 : formState.priority === 'MEDIUM' ? 60 : 35,
      priority: formState.priority,
      status: formState.status,
      assignedToUid: firebaseUser.uid,
      assignedToName: crmUser?.displayName || 'Nhân viên',
      notesSummary: formState.notesSummary.trim(),
    };

    if (editingCustomer) {
      await updateCustomer(
        editingCustomer.id,
        payload,
        firebaseUser.uid,
        crmUser?.displayName || 'Nhân viên'
      );
      pushToast({ title: 'Đã cập nhật hồ sơ khách hàng', variant: 'success' });
    } else {
      await createCustomer(payload, firebaseUser.uid, crmUser?.displayName || 'Nhân viên');
      pushToast({ title: 'Đã tạo khách hàng mới', variant: 'success' });
    }
    setShowCreateModal(false);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser) return;
    try {
      const items = await parseCustomersExcelFile(file);
      for (const item of items) {
        await createCustomer(
          {
            fullName: item.fullName,
            primaryPhone: item.primaryPhone,
            phones: item.primaryPhone ? [item.primaryPhone] : [],
            sourceChannel: 'Import Excel',
            intent: 'UNCLEAR',
            province: item.province,
            district: item.district,
            priority: item.primaryPhone ? 'MEDIUM' : 'LOW',
            leadScore: item.primaryPhone ? 60 : 30,
            status: item.primaryPhone ? 'Đã có số điện thoại' : 'Khách mới',
            assignedToUid: firebaseUser.uid,
            assignedToName: crmUser?.displayName || 'Nhân viên',
            notesSummary: item.notesSummary,
          },
          firebaseUser.uid,
          crmUser?.displayName || 'Nhân viên'
        );
      }
      pushToast({ title: `Đã nhập ${items.length} khách hàng từ Excel`, variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'Lỗi nhập tệp Excel',
        description: err instanceof Error ? err.message : 'Định dạng không hợp lệ.',
        variant: 'error',
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
            {onlyHighPotential ? 'Khách hàng tiềm năng cao' : 'Quản lý khách hàng CRM'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {onlyHighPotential
              ? 'Danh sách khách hàng có điểm AI ≥ 75 hoặc mức ưu tiên cao cần chốt lịch hẹn'
              : 'Quản lý toàn bộ hồ sơ khách hàng, số điện thoại, nhu cầu BĐS và phân công chăm sóc'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            Nhập Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} className="hidden" />
          </label>
          <button
            type="button"
            onClick={() => exportCustomersToExcel(filtered)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Xuất Excel
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm khách hàng
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo tên, số điện thoại, khu vực..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>
        <select
          value={intentFilter}
          onChange={(e) => setIntentFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="ALL">Mọi nhu cầu</option>
          {Object.entries(INTENT_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="ALL">Mọi trạng thái</option>
          {CUSTOMER_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-950/40">
                <th className="py-3 px-4 font-semibold">Khách hàng</th>
                <th className="py-3 px-4 font-semibold">Số điện thoại</th>
                <th className="py-3 px-4 font-semibold">Nhu cầu &amp; Khu vực</th>
                <th className="py-3 px-4 font-semibold text-right">Ngân sách</th>
                <th className="py-3 px-4 font-semibold text-right">Điểm AI</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold">Phụ trách</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    Chưa có khách hàng nào khớp điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => openCustomerDetail(c.id)}
                        className="font-semibold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 text-left cursor-pointer"
                      >
                        {c.fullName}
                      </button>
                      <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                        {c.sourcePageName || c.sourceChannel || 'Messenger'}
                      </p>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      {c.primaryPhone || 'Chưa có'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {INTENT_LABELS[c.intent]}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {[c.district, c.province].filter(Boolean).join(', ') || 'Chưa rõ khu vực'}
                      </p>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {formatVndShort(c.budgetMax)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400">
                      {c.leadScore ?? 50}
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">{c.status}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {c.assignedToName || 'Chưa chia'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
                          title="Chỉnh sửa"
                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMergeSource(c);
                            setMergeTargetId('');
                          }}
                          title="Gộp khách trùng"
                          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDelete(c)}
                          title="Xóa"
                          className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingCustomer ? 'Cập nhật hồ sơ khách hàng' : 'Thêm khách hàng mới'}
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmitCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Họ tên *</label>
                <input
                  required
                  value={formState.fullName}
                  onChange={(e) => setFormState({ ...formState, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Số điện thoại</label>
                <input
                  value={formState.primaryPhone}
                  onChange={(e) => setFormState({ ...formState, primaryPhone: e.target.value })}
                  placeholder="0987654321"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Nhu cầu BĐS</label>
                <select
                  value={formState.intent}
                  onChange={(e) => setFormState({ ...formState, intent: e.target.value as RealEstateIntent })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {Object.entries(INTENT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Trạng thái chăm sóc</label>
                <select
                  value={formState.status}
                  onChange={(e) => setFormState({ ...formState, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {CUSTOMER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Tỉnh / Thành phố</label>
                <input
                  value={formState.province}
                  onChange={(e) => setFormState({ ...formState, province: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Quận / Huyện</label>
                <input
                  value={formState.district}
                  onChange={(e) => setFormState({ ...formState, district: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Ngân sách tối đa (VND)</label>
                <input
                  type="number"
                  value={formState.budgetMax}
                  onChange={(e) => setFormState({ ...formState, budgetMax: e.target.value })}
                  placeholder="1000000000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Diện tích mong muốn (m²)</label>
                <input
                  type="number"
                  value={formState.areaMax}
                  onChange={(e) => setFormState({ ...formState, areaMax: e.target.value })}
                  placeholder="120"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Yêu cầu pháp lý</label>
                <input
                  value={formState.legalRequirement}
                  onChange={(e) => setFormState({ ...formState, legalRequirement: e.target.value })}
                  placeholder="Sổ hồng riêng"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Mức độ ưu tiên</label>
                <select
                  value={formState.priority}
                  onChange={(e) => setFormState({ ...formState, priority: e.target.value as LeadPriority })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="HIGH">Cao (HIGH)</option>
                  <option value="MEDIUM">Trung bình (MEDIUM)</option>
                  <option value="LOW">Thấp (LOW)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-medium mb-1">Ghi chú tóm tắt</label>
                <textarea
                  rows={2}
                  value={formState.notesSummary}
                  onChange={(e) => setFormState({ ...formState, notesSummary: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Lưu hồ sơ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Merge Modal */}
      {mergeSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold">Gộp hồ sơ khách hàng trùng</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Chọn hồ sơ chính để gộp dữ liệu của <span className="font-semibold">{mergeSource.fullName}</span> vào:
            </p>
            <select
              value={mergeTargetId}
              onChange={(e) => setMergeTargetId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="">-- Chọn khách hàng đích --</option>
              {data.customers
                .filter((c) => c.id !== mergeSource.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.primaryPhone || 'Không có SĐT'})
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMergeSource(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={!mergeTargetId || !firebaseUser}
                onClick={async () => {
                  const target = data.customers.find((c) => c.id === mergeTargetId);
                  if (!target || !firebaseUser) return;
                  await mergeDuplicateCustomers(
                    target,
                    mergeSource,
                    firebaseUser.uid,
                    crmUser?.displayName || 'Nhân viên'
                  );
                  setMergeSource(null);
                  pushToast({ title: 'Đã gộp hồ sơ khách hàng thành công', variant: 'success' });
                }}
                className="px-4 py-2 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold cursor-pointer"
              >
                Xác nhận gộp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Xác nhận xóa khách hàng</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn xóa hồ sơ <span className="font-semibold">{confirmDelete.fullName}</span>? Hành động này sẽ được ghi vào nhật ký hệ thống.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!firebaseUser) return;
                  await deleteCustomer(
                    confirmDelete.id,
                    firebaseUser.uid,
                    crmUser?.displayName || 'Nhân viên'
                  );
                  setConfirmDelete(null);
                  pushToast({ title: 'Đã xóa khách hàng', variant: 'success' });
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const CustomerDetailView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { selectedCustomerId, setRoute, openConversation, pushToast } = useCrmStore();
  const [notes, setNotes] = useState<CustomerNoteItem[]>([]);
  const [activities, setActivities] = useState<CustomerActivityItem[]>([]);
  const [noteText, setNoteText] = useState('');
  const [confirmDeleteDetail, setConfirmDeleteDetail] = useState(false);

  const customer = useMemo(
    () => data.customers.find((c) => c.id === selectedCustomerId) || data.customers[0] || null,
    [data.customers, selectedCustomerId]
  );

  useEffect(() => {
    if (!customer || !firebaseUser) return;
    const uid = firebaseUser.uid;
    const isSuper = firebaseUser.email === 'real.htland@gmail.com';

    const nq = isSuper
      ? query(collection(db, 'customers', customer.id, 'notes'))
      : query(collection(db, 'customers', customer.id, 'notes'), where('viewerUids', 'array-contains', uid));

    const aq = isSuper
      ? query(collection(db, 'customers', customer.id, 'activities'))
      : query(collection(db, 'customers', customer.id, 'activities'), where('viewerUids', 'array-contains', uid));

    const unsub1 = onSnapshot(
      nq,
      (snap) => setNotes(snap.docs.map((d) => d.data() as CustomerNoteItem).sort((a, b) => toDateObj(b.createdAt).getTime() - toDateObj(a.createdAt).getTime())),
      (err) => handleFirestoreError(err, OperationType.LIST, `customers/${customer.id}/notes`)
    );
    const unsub2 = onSnapshot(
      aq,
      (snap) => setActivities(snap.docs.map((d) => d.data() as CustomerActivityItem).sort((a, b) => toDateObj(b.createdAt).getTime() - toDateObj(a.createdAt).getTime())),
      (err) => handleFirestoreError(err, OperationType.LIST, `customers/${customer.id}/activities`)
    );
    return () => {
      unsub1();
      unsub2();
    };
  }, [customer?.id, firebaseUser]);

  if (!customer) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
        <p className="text-sm text-slate-500">Không tìm thấy hồ sơ khách hàng.</p>
        <button
          type="button"
          onClick={() => setRoute('customers')}
          className="px-4 py-2 text-xs rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const linkedConv = data.conversations.find((c) => c.customerId === customer.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setRoute('customers')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Danh sách khách hàng
        </button>
        <div className="flex items-center gap-2">
          {linkedConv && (
            <button
              type="button"
              onClick={() => openConversation(linkedConv.id)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Mở hội thoại Messenger
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmDeleteDetail(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Xóa khách hàng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
              {customer.fullName}
            </h2>
            <p className="text-xs text-slate-500 font-mono">
              ID: {customer.id} · FB: {customer.facebookId || 'Chưa gắn'}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
            <p className="text-xs text-slate-500">Số điện thoại liên hệ</p>
            <p className="text-base font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              {customer.primaryPhone || 'Chưa thu thập SĐT'}
            </p>
            {customer.phones && customer.phones.length > 1 && (
              <p className="text-xs text-slate-500 font-mono">
                Danh sách SĐT: {customer.phones.join(', ')}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-slate-400">Nhu cầu</span>
              <p className="font-semibold mt-0.5">{INTENT_LABELS[customer.intent]}</p>
            </div>
            <div>
              <span className="text-slate-400">Trạng thái</span>
              <p className="font-semibold mt-0.5">{customer.status}</p>
            </div>
            <div>
              <span className="text-slate-400">Khu vực quan tâm</span>
              <p className="font-semibold mt-0.5">
                {[customer.district, customer.province].filter(Boolean).join(', ') || 'Chưa rõ'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Ngân sách</span>
              <p className="font-mono tabular-nums font-semibold mt-0.5">
                {formatVndShort(customer.budgetMax)}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Diện tích</span>
              <p className="font-mono tabular-nums font-semibold mt-0.5">
                {customer.areaMin || customer.areaMax
                  ? `${customer.areaMin || '?'} - ${customer.areaMax || '?'} m²`
                  : 'Chưa rõ'}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Pháp lý</span>
              <p className="font-semibold mt-0.5">{customer.legalRequirement || 'Chưa yêu cầu'}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <h3 className="text-sm font-bold">Ghi chú &amp; Lịch sử chăm sóc</h3>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!noteText.trim() || !firebaseUser) return;
              await addCustomerNote(
                customer.id,
                noteText.trim(),
                firebaseUser.uid,
                crmUser?.displayName || 'Nhân viên',
                customer.viewerUids
              );
              setNoteText('');
              pushToast({ title: 'Đã thêm ghi chú chăm sóc', variant: 'success' });
            }}
            className="flex gap-2"
          >
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ghi chú nội dung cuộc gọi, tư vấn..."
              className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            >
              Lưu ghi chú
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notes.length === 0 && activities.length === 0 ? (
              <p className="py-6 text-xs text-slate-500 text-center">Chưa có lịch sử ghi chú nào.</p>
            ) : (
              [...notes.map((n) => ({ ...n, kind: 'Ghi chú' })), ...activities.map((a) => ({ id: a.id, content: a.description, authorName: a.actorName, createdAt: a.createdAt, kind: a.actionType }))].map((item) => (
                <div key={item.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold">{item.authorName} · {item.kind}</span>
                    <span className="text-[11px] font-mono text-slate-400">{formatTimestamp(item.createdAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{item.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {confirmDeleteDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Xác nhận xóa khách hàng</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn xóa hồ sơ <span className="font-semibold">{customer.fullName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDetail(false)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!firebaseUser) return;
                  await deleteCustomer(
                    customer.id,
                    firebaseUser.uid,
                    crmUser?.displayName || 'Nhân viên'
                  );
                  setConfirmDeleteDetail(false);
                  pushToast({ title: 'Đã xóa khách hàng', variant: 'success' });
                  setRoute('customers');
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const DemandsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { openCustomerDetail } = useCrmStore();
  const [intentTab, setIntentTab] = useState<'ALL' | RealEstateIntent>('ALL');

  const items = useMemo(() => {
    return data.customers.filter((c) => (intentTab === 'ALL' ? true : c.intent === intentTab));
  }, [data.customers, intentTab]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Quản lý nhu cầu mua bán bất động sản</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tổng hợp nhu cầu mua đất, mua nhà, ký gửi bán, thuê và đầu tư được trích xuất từ khách hàng
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setIntentTab('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
            intentTab === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          Tất cả ({data.customers.length})
        </button>
        {(['BUY_LAND', 'BUY_HOUSE', 'SELL_HOUSE', 'INVEST', 'RENT'] as RealEstateIntent[]).map((intent) => (
          <button
            key={intent}
            type="button"
            onClick={() => setIntentTab(intent)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md cursor-pointer ${
              intentTab === intent ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {INTENT_LABELS[intent]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCustomerDetail(c.id)}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3 hover:border-blue-400 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">{c.fullName}</h3>
                <p className="text-xs text-slate-500">{INTENT_LABELS[c.intent]}</p>
              </div>
              <span className="font-mono tabular-nums text-xs font-bold text-blue-600 dark:text-blue-400">
                {c.leadScore ?? 50}đ
              </span>
            </div>
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p>Khu vực: {[c.district, c.province].filter(Boolean).join(', ') || 'Chưa rõ'}</p>
              <p className="font-mono tabular-nums">
                Ngân sách: {formatVndShort(c.budgetMax)} · Diện tích: {c.areaMax ? `${c.areaMax} m²` : 'Chưa rõ'}
              </p>
              <p>Pháp lý: {c.legalRequirement || 'Không yêu cầu cụ thể'}</p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {c.notesSummary || 'Chưa có tóm tắt nhu cầu.'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
