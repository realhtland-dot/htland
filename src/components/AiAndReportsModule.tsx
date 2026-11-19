import React, { useMemo, useState } from 'react';
import { BarChart3, Cpu, Edit3, Save, Sparkles } from 'lucide-react';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import { saveAiAnalysisRecord, updateAiAnalysisRecord } from '../services/crmActions.ts';
import { INTENT_LABELS, type AiAnalysisItem, type LeadPriority, type RealEstateIntent } from '../types/crm.ts';
import { formatTimestamp, formatVndShort } from '../utils/format.ts';

export const AiAnalysisView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, getIdToken } = useAuth();
  const { pushToast } = useCrmStore();

  const [inputText, setInputText] = useState(
    'Tôi đang tìm mua đất ở Củ Chi, diện tích từ 100 đến 150m2, ngân sách khoảng 1 tỷ, có sổ riêng, liên hệ tôi qua số 0987654321.'
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [latestOutput, setLatestOutput] = useState<Record<string, unknown> | null>(null);
  const [editingItem, setEditingItem] = useState<AiAnalysisItem | null>(null);
  const [editForm, setEditForm] = useState({
    intent: 'BUY_LAND' as RealEstateIntent,
    district: '',
    budgetMax: '',
    leadScore: '85',
    priority: 'HIGH' as LeadPriority,
    summary: '',
  });

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !firebaseUser) return;
    setAnalyzing(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: inputText.trim() }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Lỗi AI phân tích.');

      setLatestOutput(result);
      await saveAiAnalysisRecord(
        {
          sourceText: inputText.trim(),
          customerName: result.customer_name || undefined,
          phone: result.phone,
          intent: result.intent,
          propertyType: result.property_type,
          province: result.province,
          district: result.district,
          budgetMin: result.budget_min,
          budgetMax: result.budget_max,
          areaMin: result.area_min,
          areaMax: result.area_max,
          legalRequirement: result.legal_requirement,
          leadScore: result.lead_score,
          priority: result.priority,
          summary: result.summary,
          nextAction: result.next_action,
          provider: result.provider,
        },
        firebaseUser.uid
      );
      pushToast({ title: 'Đã phân tích và lưu vào lịch sử AI CRM', variant: 'success' });
    } catch (err) {
      pushToast({
        title: 'Phân tích AI thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra cấu hình.',
        variant: 'error',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const startEdit = (item: AiAnalysisItem) => {
    setEditingItem(item);
    setEditForm({
      intent: item.intent,
      district: item.district || '',
      budgetMax: item.budgetMax ? String(item.budgetMax) : '',
      leadScore: String(item.leadScore),
      priority: item.priority,
      summary: item.summary,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    await updateAiAnalysisRecord(editingItem.id, {
      intent: editForm.intent,
      district: editForm.district || null,
      budgetMax: editForm.budgetMax ? Number(editForm.budgetMax) : null,
      leadScore: Number(editForm.leadScore) || 50,
      priority: editForm.priority,
      summary: editForm.summary,
    });
    setEditingItem(null);
    pushToast({ title: 'Đã hiệu chỉnh dữ liệu phân tích AI', variant: 'success' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">AI Phân tích khách hàng bất động sản</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Trích xuất tự động số điện thoại, 10 nhóm nhu cầu BĐS, khu vực, diện tích, ngân sách, pháp lý và điểm tiềm năng
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Kiểm tra phân tích đoạn hội thoại
          </h3>
          <form onSubmit={handleAnalyze} className="space-y-3">
            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Dán nội dung tin nhắn khách hàng Messenger tại đây..."
              className="w-full p-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
            />
            <button
              type="submit"
              disabled={analyzing}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              {analyzing ? 'Đang trích xuất JSON...' : 'Chạy AI phân tích nhu cầu'}
            </button>
          </form>
        </section>

        <section className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-bold">Kết quả JSON chuẩn Schema</h3>
          <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-72">
            {latestOutput
              ? JSON.stringify(latestOutput, null, 2)
              : 'Nhấn "Chạy AI phân tích nhu cầu" để xem kết quả JSON có cấu trúc từ máy chủ.'}
          </pre>
        </section>
      </div>

      {/* History Table with Human Override */}
      <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold">Lịch sử phân tích AI (Cho phép nhân viên hiệu chỉnh)</h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.aiAnalyses.map((item) => (
            <div key={item.id} className="p-5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold">
                  {item.customerName || 'Khách hàng'} · {INTENT_LABELS[item.intent]} · Điểm:{' '}
                  <span className="font-mono text-blue-600 dark:text-blue-400">{item.leadScore}/100</span>
                  {item.isEditedByHuman && ' · Đã hiệu chỉnh bởi nhân viên'}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span>{formatTimestamp(item.createdAt)}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-sans font-medium cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Hiệu chỉnh
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 italic">"{item.sourceText}"</p>
              <p className="text-xs text-slate-800 dark:text-slate-200">
                Tóm tắt: {item.summary} · Khu vực: {[item.district, item.province].filter(Boolean).join(', ') || 'Chưa rõ'} · Ngân sách: {formatVndShort(item.budgetMax)} · SĐT: <span className="font-mono">{item.phone || 'null'}</span>
              </p>

              {editingItem?.id === item.id && (
                <form
                  onSubmit={handleSaveEdit}
                  className="mt-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs"
                >
                  <select
                    value={editForm.intent}
                    onChange={(e) => setEditForm({ ...editForm, intent: e.target.value as RealEstateIntent })}
                    className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  >
                    {Object.entries(INTENT_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <input
                    value={editForm.district}
                    onChange={(e) => setEditForm({ ...editForm, district: e.target.value })}
                    placeholder="Quận/Huyện"
                    className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <input
                    type="number"
                    value={editForm.budgetMax}
                    onChange={(e) => setEditForm({ ...editForm, budgetMax: e.target.value })}
                    placeholder="Ngân sách (VND)"
                    className="px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                  />
                  <input
                    value={editForm.summary}
                    onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                    className="sm:col-span-2 px-2.5 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(null)}
                      className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600 text-white font-semibold cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Lưu
                    </button>
                  </div>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export const ReportsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const byIntent = useMemo(() => {
    const map = new Map<RealEstateIntent, number>();
    for (const c of data.customers) {
      map.set(c.intent, (map.get(c.intent) || 0) + 1);
    }
    return Array.from(map.entries());
  }, [data.customers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Báo cáo thống kê chuyển đổi</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Phân tích cơ cấu nhu cầu bất động sản, nguồn khách hàng và tỷ lệ thu thập số điện thoại
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500">Tỷ lệ thu thập SĐT</p>
          <p className="text-2xl font-display font-bold tabular-nums mt-1">
            {data.customers.length
              ? Math.round(
                  (data.customers.filter((c) => Boolean(c.primaryPhone)).length / data.customers.length) *
                    100
                )
              : 0}
            %
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500">Tổng giá trị giỏ hàng BĐS</p>
          <p className="text-2xl font-display font-bold tabular-nums mt-1 text-blue-600 dark:text-blue-400">
            {formatVndShort(data.properties.reduce((s, p) => s + p.priceVnd, 0))}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5">
          <p className="text-xs text-slate-500">Lịch hẹn đang hoạt động</p>
          <p className="text-2xl font-display font-bold tabular-nums mt-1">
            {data.appointments.filter((a) => a.status !== 'CANCELLED').length}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-600" />
          Phân bổ theo nhóm nhu cầu bất động sản
        </h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {byIntent.map(([intent, count]) => (
            <div key={intent} className="py-2.5 flex items-center justify-between">
              <span className="font-medium">{INTENT_LABELS[intent]}</span>
              <span className="font-mono tabular-nums font-bold">{count} khách hàng</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const StaffReportsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const rows = useMemo(() => {
    return data.staffDirectory.map((s) => {
      const assigned = data.customers.filter((c) => c.assignedToUid === s.uid);
      const withPhone = assigned.filter((c) => Boolean(c.primaryPhone)).length;
      const closed = assigned.filter((c) => c.status === 'Đã giao dịch').length;
      const appts = data.appointments.filter((a) => a.assignedToUid === s.uid).length;
      const convRate = assigned.length ? Math.round((closed / assigned.length) * 100) : 0;
      return {
        uid: s.uid,
        name: s.displayName,
        role: s.role,
        assignedCount: assigned.length,
        withPhone,
        appts,
        closed,
        convRate,
      };
    });
  }, [data.staffDirectory, data.customers, data.appointments]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Báo cáo hiệu suất nhân viên</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Theo dõi KPI số khách được phân công, tỷ lệ lấy SĐT, lịch hẹn dẫn khách và giao dịch chốt thành công
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
                <th className="py-3 px-4 font-semibold">Nhân viên</th>
                <th className="py-3 px-4 font-semibold">Vai trò</th>
                <th className="py-3 px-4 font-semibold text-right">Khách phụ trách</th>
                <th className="py-3 px-4 font-semibold text-right">Đã có SĐT</th>
                <th className="py-3 px-4 font-semibold text-right">Lịch hẹn</th>
                <th className="py-3 px-4 font-semibold text-right">Đã chốt</th>
                <th className="py-3 px-4 font-semibold text-right">Tỷ lệ chốt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.uid}>
                  <td className="py-3 px-4 font-semibold">{r.name}</td>
                  <td className="py-3 px-4 font-mono">{r.role}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{r.assignedCount}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                    {r.withPhone}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{r.appts}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400 font-bold">
                    {r.closed}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">{r.convRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
