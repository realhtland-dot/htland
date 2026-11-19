import React, { useState } from 'react';
import { Bell, Check, ExternalLink, Plus, Shield, Trash2 } from 'lucide-react';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import {
  deleteTag,
  markNotificationRead,
  saveCustomerSource,
  saveTag,
  saveTeam,
  updateSystemSettings,
  updateUserRole,
} from '../services/crmActions.ts';
import { ROLE_LABELS, type CrmRoute, type SystemSettingItem, type UserRole } from '../types/crm.ts';
import { formatTimestamp } from '../utils/format.ts';

export const StaffView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { crmUser } = useAuth();
  const { pushToast } = useCrmStore();
  const isAdmin = crmUser?.role === 'SUPER_ADMIN' || crmUser?.role === 'ADMIN';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Quản lý nhân viên</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Quản lý tài khoản nhân sự, vai trò RBAC và trạng thái hoạt động trong CRM
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
              <th className="py-3 px-4 font-semibold">Họ tên</th>
              <th className="py-3 px-4 font-semibold">UID</th>
              <th className="py-3 px-4 font-semibold">Vai trò</th>
              <th className="py-3 px-4 font-semibold">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.staffDirectory.map((s) => (
              <tr key={s.uid}>
                <td className="py-3 px-4 font-semibold">{s.displayName}</td>
                <td className="py-3 px-4 font-mono text-slate-500">{s.uid}</td>
                <td className="py-3 px-4">
                  <select
                    disabled={!isAdmin}
                    value={s.role}
                    onChange={async (e) => {
                      await updateUserRole(s.uid, e.target.value as UserRole, s.status);
                      pushToast({ title: 'Đã cập nhật vai trò nhân viên', variant: 'success' });
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-3 px-4">
                  <span
                    className={
                      s.status === 'ACTIVE'
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-slate-400'
                    }
                  >
                    {s.status === 'ACTIVE' ? 'Đang hoạt động' : 'Tạm khóa'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const TeamsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { pushToast } = useCrmStore();
  const [name, setName] = useState('');
  const [region, setRegion] = useState('');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Nhóm nhân viên kinh doanh</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Tổ chức nhóm Sale theo khu vực địa lý để tự động phân công khách hàng
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!firebaseUser || !name.trim()) return;
          await saveTeam(
            {
              name: name.trim(),
              region: region.trim() || 'TP.HCM',
              leaderUid: firebaseUser.uid,
              leaderName: crmUser?.displayName || 'Trưởng nhóm',
              memberUids: [firebaseUser.uid],
            },
            firebaseUser.uid
          );
          setName('');
          setRegion('');
          pushToast({ title: 'Đã tạo nhóm nhân viên mới', variant: 'success' });
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 text-xs"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên nhóm (VD: Nhóm Đất Nền Bình Chánh)..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />
        <input
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          placeholder="Khu vực phụ trách..."
          className="w-56 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Thêm nhóm
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.teams.map((t) => (
          <div
            key={t.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-2"
          >
            <h3 className="text-sm font-bold">{t.name}</h3>
            <p className="text-xs text-slate-500">Khu vực: {t.region}</p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Trưởng nhóm: {t.leaderName} · Thành viên: {t.memberUids?.length || 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export const PermissionsView: React.FC = () => {
  const matrix = [
    { feature: 'Quản lý cấu hình hệ thống & API Keys', superAdmin: true, admin: false, manager: false, sale: false },
    { feature: 'Kết nối & cấu hình Fanpage Facebook', superAdmin: true, admin: true, manager: true, sale: false },
    { feature: 'Phân quyền & quản lý tài khoản nhân viên', superAdmin: true, admin: true, manager: false, sale: false },
    { feature: 'Chia khách hàng cho nhân viên / nhóm', superAdmin: true, admin: true, manager: true, sale: false },
    { feature: 'Xem toàn bộ khách hàng & báo cáo tổng', superAdmin: true, admin: true, manager: true, sale: false },
    { feature: 'Trả lời Messenger & chăm sóc khách được giao', superAdmin: true, admin: true, manager: true, sale: true },
    { feature: 'Xóa hồ sơ khách hàng vĩnh viễn', superAdmin: true, admin: true, manager: false, sale: false },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-600" />
          Ma trận phân quyền nhân viên (RBAC)
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Kiểm soát truy cập được thực thi nghiêm ngặt tại Firestore Security Rules và API Backend
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
              <th className="py-3 px-4 font-semibold">Quyền hạn chức năng</th>
              <th className="py-3 px-4 font-semibold text-center">Super Admin</th>
              <th className="py-3 px-4 font-semibold text-center">Admin</th>
              <th className="py-3 px-4 font-semibold text-center">Manager</th>
              <th className="py-3 px-4 font-semibold text-center">Sale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {matrix.map((row) => (
              <tr key={row.feature}>
                <td className="py-3 px-4 font-medium">{row.feature}</td>
                {[row.superAdmin, row.admin, row.manager, row.sale].map((allowed, idx) => (
                  <td key={idx} className="py-3 px-4 text-center">
                    {allowed ? (
                      <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">—</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const SourcesView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser } = useAuth();
  const { pushToast } = useCrmStore();
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('Facebook');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Quản lý nguồn khách hàng</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Theo dõi các kênh tiếp nhận khách hàng bất động sản
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!firebaseUser || !name.trim()) return;
          await saveCustomerSource({ name: name.trim(), channel, isActive: true }, firebaseUser.uid);
          setName('');
          pushToast({ title: 'Đã thêm nguồn khách hàng', variant: 'success' });
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 text-xs"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên nguồn (VD: Facebook Lead Ads Củ Chi)..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
        >
          <option value="Facebook">Facebook</option>
          <option value="Zalo">Zalo</option>
          <option value="Website">Website</option>
          <option value="Referral">Giới thiệu</option>
        </select>
        <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer">
          Thêm nguồn
        </button>
      </form>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {data.sources.map((s) => (
          <div key={s.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="text-slate-500">Kênh: {s.channel}</p>
            </div>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {s.isActive ? 'Đang kích hoạt' : 'Tạm ngưng'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TagsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser } = useAuth();
  const { pushToast } = useCrmStore();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Khu vực');

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Quản lý thẻ và phân loại khách hàng</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Chuẩn hóa nhãn gắn cho hội thoại Messenger và hồ sơ khách hàng CRM
        </p>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!firebaseUser || !name.trim()) return;
          await saveTag({ name: name.trim(), color: 'blue', category }, firebaseUser.uid);
          setName('');
          pushToast({ title: 'Đã tạo thẻ phân loại mới', variant: 'success' });
        }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 text-xs"
      >
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Tên thẻ (VD: Ngân sách 2-3 tỷ)..."
          className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Nhóm phân loại..."
          className="w-48 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold cursor-pointer">
          Tạo thẻ
        </button>
      </form>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {data.tags.map((t) => (
          <div key={t.id} className="p-4 flex items-center justify-between text-xs">
            <div>
              <p className="font-semibold">{t.name}</p>
              <p className="text-slate-500">Nhóm: {t.category || 'Chung'}</p>
            </div>
            <button
              type="button"
              onClick={() => deleteTag(t.id)}
              className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NotificationsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { setRoute } = useCrmStore();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600" />
          Quản lý thông báo thời gian thực
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Thông báo tin nhắn mới, trích xuất số điện thoại và phân công khách hàng
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {data.notifications.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">Không có thông báo nào.</p>
        ) : (
          data.notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 flex items-start justify-between gap-4 ${
                !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
              }`}
            >
              <div className="space-y-1">
                <p className="text-xs font-bold">{n.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{n.body}</p>
                <p className="text-[11px] font-mono text-slate-400">{formatTimestamp(n.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {n.linkTarget && (
                  <button
                    type="button"
                    onClick={() => setRoute(n.linkTarget as CrmRoute)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Mở mục
                  </button>
                )}
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="px-2.5 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    Đã đọc
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const AuditLogsView: React.FC<{ data: CrmDataset }> = ({ data }) => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-display font-bold">Nhật ký hoạt động &amp; Bảo mật</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Ghi nhận mọi thao tác tạo, sửa, xóa và gộp hồ sơ khách hàng theo chuẩn kiểm toán dữ liệu
      </p>
    </div>
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <table className="w-full text-xs text-left">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
            <th className="py-3 px-4 font-semibold">Thời gian</th>
            <th className="py-3 px-4 font-semibold">Người thực hiện</th>
            <th className="py-3 px-4 font-semibold">Hành động</th>
            <th className="py-3 px-4 font-semibold">Chi tiết</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.auditLogs.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-slate-500">
                Chưa có nhật ký hoạt động nào.
              </td>
            </tr>
          ) : (
            data.auditLogs.map((log) => (
              <tr key={log.id}>
                <td className="py-3 px-4 font-mono tabular-nums text-slate-500">
                  {formatTimestamp(log.createdAt)}
                </td>
                <td className="py-3 px-4 font-medium">{log.actorName}</td>
                <td className="py-3 px-4 font-mono text-blue-600 dark:text-blue-400">{log.action}</td>
                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{log.details}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export const IntegrationsView: React.FC = () => (
  <div className="space-y-5">
    <div>
      <h2 className="text-xl font-display font-bold">Cài đặt tích hợp API &amp; Tài liệu Swagger</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Thông số endpoint Meta Webhook, tài liệu REST API OpenAPI 3.0 và cấu hình AI Service trên máy chủ
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-bold">REST API &amp; Swagger OpenAPI</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300">
          Xem toàn bộ đặc tả các nhóm API Authentication, Facebook, Webhooks, Conversations, Customers, AI và Reports.
        </p>
        <div className="flex items-center gap-3 pt-1">
          <a
            href="/api/docs"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold"
          >
            Mở Swagger UI <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a
            href="/api/openapi.json"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline"
          >
            /api/openapi.json
          </a>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-3">
        <h3 className="text-sm font-bold">Bảo mật khóa tích hợp phía máy chủ</h3>
        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          Các khóa bí mật <span className="font-mono">GEMINI_API_KEY</span>, <span className="font-mono">OPENAI_API_KEY</span>, <span className="font-mono">META_APP_SECRET</span> và Page Access Token được lưu trữ và mã hóa hoàn toàn phía máy chủ (Server-side environment &amp; AES-256-GCM vault), không bao giờ gửi xuống trình duyệt.
        </p>
      </div>
    </div>
  </div>
);

export const SettingsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser } = useAuth();
  const { pushToast } = useCrmStore();
  const current = data.systemSettings;

  const [companyName, setCompanyName] = useState(current?.companyName || 'Realty Messenger CRM');
  const [autoAssignMethod, setAutoAssignMethod] = useState<SystemSettingItem['autoAssignMethod']>(
    current?.autoAssignMethod || 'ROUND_ROBIN'
  );
  const [preventDuplicateAssignment, setPreventDuplicateAssignment] = useState(
    current?.preventDuplicateAssignment ?? true
  );
  const [aiAutoAnalyze, setAiAutoAnalyze] = useState(current?.aiAutoAnalyze ?? true);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>(current?.aiProvider || 'gemini');
  const [dataRetentionDays, setDataRetentionDays] = useState(String(current?.dataRetentionDays || 365));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    await updateSystemSettings(
      {
        companyName: companyName.trim(),
        autoAssignMethod,
        preventDuplicateAssignment,
        aiAutoAnalyze,
        aiProvider,
        dataRetentionDays: Number(dataRetentionDays) || 365,
      },
      firebaseUser.uid
    );
    pushToast({ title: 'Đã lưu cấu hình hệ thống CRM', variant: 'success' });
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-xl font-display font-bold">Cài đặt hệ thống &amp; Phân công tự động</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Cấu hình quy tắc chia khách tự động, nhà cung cấp AI và chính sách lưu trữ dữ liệu cá nhân
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4 text-xs"
      >
        <div>
          <label className="block font-semibold mb-1">Tên tổ chức / Sàn giao dịch BĐS</label>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">Phương thức chia khách tự động</label>
            <select
              value={autoAssignMethod}
              onChange={(e) =>
                setAutoAssignMethod(e.target.value as SystemSettingItem['autoAssignMethod'])
              }
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ROUND_ROBIN">Chia khách luân phiên (Round Robin)</option>
              <option value="BY_PAGE">Chia khách theo Fanpage</option>
              <option value="BY_REGION">Chia khách theo khu vực</option>
              <option value="BY_TEAM">Chia khách theo nhóm nhân viên</option>
              <option value="MANUAL">Phân công thủ công</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Nhà cung cấp AI mặc định</label>
            <select
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value as 'gemini' | 'openai')}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="gemini">Google Gemini (gemini-4-hydrogen)</option>
              <option value="openai">OpenAI (qua biến môi trường máy chủ)</option>
            </select>
          </div>
        </div>

        <div className="space-y-2.5 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={preventDuplicateAssignment}
              onChange={(e) => setPreventDuplicateAssignment(e.target.checked)}
            />
            <span>Không phân công khách trùng số điện thoại cho nhiều nhân viên khác nhau</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={aiAutoAnalyze}
              onChange={(e) => setAiAutoAnalyze(e.target.checked)}
            />
            <span>Tự động kích hoạt AI phân tích nhu cầu khi có tin nhắn Messenger mới</span>
          </label>
        </div>

        <div>
          <label className="block font-semibold mb-1">Thời hạn lưu trữ dữ liệu cá nhân (ngày)</label>
          <input
            type="number"
            min={30}
            value={dataRetentionDays}
            onChange={(e) => setDataRetentionDays(e.target.value)}
            className="w-44 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
          >
            Lưu cấu hình
          </button>
        </div>
      </form>
    </div>
  );
};
