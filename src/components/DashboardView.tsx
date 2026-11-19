import React, { useMemo, useState } from 'react';
import { ArrowUpRight, Facebook, MessageSquare, Phone, UserCheck, Users } from 'lucide-react';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { INTENT_LABELS } from '../types/crm.ts';
import { useCrmStore } from '../store/useCrmStore.ts';
import { toDateObj } from '../utils/format.ts';

type DatePeriod = 'day' | 'week' | 'month' | 'year';

export const DashboardView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const [period, setPeriod] = useState<DatePeriod>('month');
  const { setRoute, openCustomerDetail } = useCrmStore();

  const filteredCustomers = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    if (period === 'day') cutoff.setHours(0, 0, 0, 0);
    else if (period === 'week') cutoff.setDate(now.getDate() - 7);
    else if (period === 'month') cutoff.setMonth(now.getMonth() - 1);
    else cutoff.setFullYear(now.getFullYear() - 1);

    return data.customers.filter((c) => toDateObj(c.createdAt) >= cutoff);
  }, [data.customers, period]);

  const metrics = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const connectedPages = data.pages.filter((p) => p.connectionStatus === 'CONNECTED').length;
    const totalMessagesToday = data.pages.reduce((sum, p) => sum + (p.totalMessages || 0), 0) + data.conversations.length;
    const unreadConversations = data.conversations.filter((c) => (c.unreadCount || 0) > 0).length;
    const totalCustomers = filteredCustomers.length;
    const newCustomersToday = data.customers.filter((c) => toDateObj(c.createdAt) >= todayStart).length;
    const phonesCollected = filteredCustomers.filter((c) => Boolean(c.primaryPhone || (c.phones && c.phones.length > 0))).length;
    const highPotential = filteredCustomers.filter((c) => c.priority === 'HIGH' || (c.leadScore || 0) >= 75 || c.status === 'Khách tiềm năng').length;
    const assignedCount = filteredCustomers.filter((c) => Boolean(c.assignedToUid)).length;
    const unassignedCount = filteredCustomers.filter((c) => !c.assignedToUid).length;
    const closedDeals = filteredCustomers.filter((c) => c.status === 'Đã giao dịch').length;

    return {
      connectedPages,
      totalMessagesToday,
      unreadConversations,
      totalCustomers,
      newCustomersToday,
      phonesCollected,
      highPotential,
      assignedCount,
      unassignedCount,
      closedDeals,
    };
  }, [data.pages, data.conversations, data.customers, filteredCustomers]);

  // Chart 1: Khách hàng mới theo ngày (7 ngày gần nhất)
  const dailyLeadsSeries = useMemo(() => {
    const days: Array<{ label: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      const count = data.customers.filter((c) => {
        const cd = toDateObj(c.createdAt);
        return cd.getDate() === d.getDate() && cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear();
      }).length;
      days.push({ label, count });
    }
    return days;
  }, [data.customers]);

  // Chart 2: Tin nhắn theo Fanpage
  const messagesByPage = useMemo(() => {
    return data.pages.map((p) => ({
      name: p.name,
      count: p.totalMessages || data.conversations.filter((c) => c.pageId === p.id || c.pageId === p.pageId).length,
    }));
  }, [data.pages, data.conversations]);

  // Chart 3: Khách hàng theo nguồn
  const customersBySource = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredCustomers) {
      const src = c.sourcePageName || c.sourceChannel || 'Trực tiếp';
      map.set(src, (map.get(src) || 0) + 1);
    }
    return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
  }, [filteredCustomers]);

  // Chart 4: Khách hàng theo trạng thái
  const customersByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredCustomers) {
      map.set(c.status, (map.get(c.status) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCustomers]);

  // Chart 5: Hiệu suất nhân viên
  const staffPerformance = useMemo(() => {
    const map = new Map<string, { name: string; total: number; withPhone: number; closed: number }>();
    for (const c of filteredCustomers) {
      const key = c.assignedToName || 'Chưa phân công';
      const entry = map.get(key) || { name: key, total: 0, withPhone: 0, closed: 0 };
      entry.total += 1;
      if (c.primaryPhone || (c.phones && c.phones.length > 0)) entry.withPhone += 1;
      if (c.status === 'Đã giao dịch') entry.closed += 1;
      map.set(key, entry);
    }
    return Array.from(map.values());
  }, [filteredCustomers]);

  // Chart 6: Tỷ lệ chuyển đổi
  const conversionFunnel = useMemo(() => {
    const total = Math.max(1, filteredCustomers.length);
    const hasPhone = filteredCustomers.filter((c) => c.primaryPhone || (c.phones?.length || 0) > 0).length;
    const potential = filteredCustomers.filter((c) => c.priority === 'HIGH' || (c.leadScore || 0) >= 75).length;
    const appointed = filteredCustomers.filter((c) => ['Đã hẹn gặp', 'Đã đi xem bất động sản', 'Đang thương lượng', 'Đã giao dịch'].includes(c.status)).length;
    const closed = filteredCustomers.filter((c) => c.status === 'Đã giao dịch').length;
    return [
      { stage: 'Tổng khách hàng', count: filteredCustomers.length, pct: 100 },
      { stage: 'Thu thập được SĐT', count: hasPhone, pct: Math.round((hasPhone / total) * 100) },
      { stage: 'Khách tiềm năng cao', count: potential, pct: Math.round((potential / total) * 100) },
      { stage: 'Đã hẹn / Xem BĐS', count: appointed, pct: Math.round((appointed / total) * 100) },
      { stage: 'Đã chốt giao dịch', count: closed, pct: Math.round((closed / total) * 100) },
    ];
  }, [filteredCustomers]);

  // Chart 7: Nhu cầu mua bán theo khu vực
  const demandByDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of filteredCustomers) {
      const region = [c.district, c.province].filter(Boolean).join(', ') || 'Chưa xác định khu vực';
      map.set(region, (map.get(region) || 0) + 1);
    }
    return Array.from(map.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCustomers]);

  if (data.loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div key={idx} className="h-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const kpiCards = [
    { label: 'Fanpage đang kết nối', value: metrics.connectedPages, sub: `Tổng ${data.pages.length} trang`, action: () => setRoute('pages') },
    { label: 'Tin nhắn hôm nay', value: metrics.totalMessagesToday, sub: 'Đa Fanpage', action: () => setRoute('inbox') },
    { label: 'Hội thoại chưa đọc', value: metrics.unreadConversations, sub: 'Cần phản hồi', action: () => setRoute('inbox') },
    { label: 'Tổng số khách hàng', value: metrics.totalCustomers, sub: 'Hồ sơ CRM', action: () => setRoute('customers') },
    { label: 'Khách hàng mới hôm nay', value: metrics.newCustomersToday, sub: 'Cập nhật realtime', action: () => setRoute('customers') },
    { label: 'Số điện thoại thu thập', value: metrics.phonesCollected, sub: 'Chuẩn hóa +84/0', action: () => setRoute('customers') },
    { label: 'Khách hàng tiềm năng', value: metrics.highPotential, sub: 'Điểm AI ≥ 75', action: () => setRoute('leads') },
    { label: 'Đã phân công Sale', value: metrics.assignedCount, sub: 'Đang chăm sóc', action: () => setRoute('customers') },
    { label: 'Chưa có nhân viên', value: metrics.unassignedCount, sub: 'Chờ chia khách', action: () => setRoute('customers') },
    { label: 'Đã chốt giao dịch', value: metrics.closedDeals, sub: 'Hoàn tất hợp đồng', action: () => setRoute('reports') },
  ];

  const maxDaily = Math.max(1, ...dailyLeadsSeries.map((d) => d.count));
  const maxPageMsg = Math.max(1, ...messagesByPage.map((p) => p.count));
  const maxDistrict = Math.max(1, ...demandByDistrict.map((d) => d.count));

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
            Tổng quan vận hành CRM Bất động sản
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Theo dõi hiệu suất tiếp nhận Messenger, trích xuất số điện thoại và chuyển đổi giao dịch
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
          {([
            { id: 'day', label: 'Hôm nay' },
            { id: 'week', label: 'Tuần' },
            { id: 'month', label: 'Tháng' },
            { id: 'year', label: 'Năm' },
          ] as Array<{ id: DatePeriod; label: string }>).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                period === item.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 10 Core KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <button
            key={kpi.label}
            type="button"
            onClick={kpi.action}
            className="text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                {kpi.label}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
            </div>
            <div className="mt-2 text-2xl font-display font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {kpi.value.toLocaleString('vi-VN')}
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kpi.sub}</p>
          </button>
        ))}
      </div>

      {/* Charts Row 1: Daily Leads + Conversion Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Khách hàng mới theo ngày (7 ngày gần nhất)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Số lượng hồ sơ khách hàng được tạo từ Messenger và nhập liệu CRM
              </p>
            </div>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="h-52 flex items-end gap-3 pt-4">
            {dailyLeadsSeries.map((day) => {
              const heightPct = Math.max(8, Math.round((day.count / maxDaily) * 100));
              return (
                <div key={day.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-mono tabular-nums font-medium text-slate-700 dark:text-slate-300">
                    {day.count}
                  </span>
                  <div className="w-full max-w-[44px] bg-slate-100 dark:bg-slate-800 rounded-t-md h-36 flex items-end overflow-hidden">
                    <div
                      className="w-full bg-blue-600 dark:bg-blue-500 rounded-t-md transition-all duration-300"
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Tỷ lệ chuyển đổi khách hàng
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phễu từ tiếp nhận Messenger đến giao dịch thành công
              </p>
            </div>
            <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="space-y-3 pt-1">
            {conversionFunnel.map((f) => (
              <div key={f.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">{f.stage}</span>
                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {f.count} ({f.pct}%)
                  </span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    style={{ width: `${Math.max(4, f.pct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Charts Row 2: Messages by Fanpage + Sources + Region Demand */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Tin nhắn theo Fanpage
            </h3>
            <Facebook className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-3">
            {messagesByPage.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có dữ liệu Fanpage.</p>
            ) : (
              messagesByPage.map((p) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{p.name}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                      {p.count}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${Math.round((p.count / maxPageMsg) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Khách hàng theo nguồn
            </h3>
            <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {customersBySource.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có dữ liệu nguồn khách hàng.</p>
            ) : (
              customersBySource.map((s) => (
                <div key={s.name} className="py-2.5 flex items-center justify-between text-xs gap-3">
                  <span className="text-slate-700 dark:text-slate-300 truncate">{s.name}</span>
                  <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                    {s.count} KH
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Nhu cầu mua bán theo khu vực
            </h3>
            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="space-y-3">
            {demandByDistrict.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có dữ liệu khu vực.</p>
            ) : (
              demandByDistrict.slice(0, 5).map((r) => (
                <div key={r.region} className="space-y-1">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{r.region}</span>
                    <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                      {r.count}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"
                      style={{ width: `${Math.round((r.count / maxDistrict) * 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Charts Row 3: Status Distribution + Staff Performance + Recent Leads */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Khách hàng theo trạng thái chăm sóc
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {customersByStatus.map((item) => (
              <div key={item.status} className="py-2 flex items-center justify-between text-xs">
                <span className="text-slate-700 dark:text-slate-300">{item.status}</span>
                <span className="font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Hiệu suất nhân viên &amp; Khách hàng mới gần đây
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2 font-medium">Nhân viên</th>
                  <th className="py-2 font-medium text-right">Tổng khách</th>
                  <th className="py-2 font-medium text-right">Đã có SĐT</th>
                  <th className="py-2 font-medium text-right">Đã giao dịch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {staffPerformance.map((sp) => (
                  <tr key={sp.name}>
                    <td className="py-2.5 font-medium text-slate-900 dark:text-slate-100">{sp.name}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{sp.total}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                      {sp.withPhone}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-blue-600 dark:text-blue-400">
                      {sp.closed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Khách hàng mới nhất
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.customers.slice(0, 4).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => openCustomerDetail(c.id)}
                  className="w-full py-2 flex items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 px-1 rounded transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {c.fullName}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {INTENT_LABELS[c.intent]} · {[c.district, c.province].filter(Boolean).join(', ') || 'Chưa rõ khu vực'}
                    </p>
                  </div>
                  <span className="text-xs font-mono tabular-nums text-blue-600 dark:text-blue-400 shrink-0">
                    {c.primaryPhone || 'Chưa có SĐT'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
