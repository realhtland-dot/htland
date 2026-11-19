import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Facebook,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Unlink,
} from 'lucide-react';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import { deleteConversation, deleteFacebookPage, saveFacebookPage, updateFacebookPage } from '../services/crmActions.ts';
import type { ConversationItem, FacebookPageItem } from '../types/crm.ts';
import { formatTimestamp } from '../utils/format.ts';

interface MetaConfigStatus {
  isConfigured: boolean;
  oauthRedirectUri: string;
  webhookCallbackUrl: string;
  verifyToken: string;
  graphVersion: string;
}

export const PagesView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser, getIdToken } = useAuth();
  const { setRoute, pushToast } = useCrmStore();
  const [confirmDeletePage, setConfirmDeletePage] = useState<FacebookPageItem | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

  const isAdminUser =
    firebaseUser?.email === 'real.htland@gmail.com' ||
    crmUser?.role === 'SUPER_ADMIN' ||
    crmUser?.role === 'ADMIN';

  const canDeletePage = (page: FacebookPageItem) =>
    isAdminUser || (crmUser?.role === 'MANAGER' && page.connectedByUid === firebaseUser?.uid);

  const handleToggleWebhook = async (pageIdDoc: string, pageId: string, currentlySubscribed: boolean) => {
    if (!currentlySubscribed) {
      try {
        const token = await getIdToken();
        const res = await fetch(`/api/facebook/pages/${encodeURIComponent(pageId)}/subscribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Chưa có Page Access Token');
        await updateFacebookPage(pageIdDoc, {
          webhookSubscribed: true,
          connectionStatus: 'CONNECTED',
          lastError: '',
        });
        pushToast({ title: 'Đã đăng ký Webhook cho Fanpage', variant: 'success' });
      } catch (err) {
        pushToast({
          title: 'Không thể đăng ký Webhook',
          description: err instanceof Error ? err.message : 'Vui lòng kết nối lại Fanpage qua Facebook Login.',
          variant: 'error',
        });
      }
    } else {
      await updateFacebookPage(pageIdDoc, { webhookSubscribed: false });
      pushToast({ title: 'Đã tắt nhận Webhook cho Fanpage', variant: 'info' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Quản lý Fanpage Facebook</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Theo dõi trạng thái kết nối, Webhook Messenger, bật/tắt AI tự động và phân công theo từng Fanpage
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRoute('facebook-connect')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          <Facebook className="w-4 h-4" />
          Kết nối thêm Fanpage
        </button>
      </div>

      {data.pages.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-10 text-center space-y-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Chưa có Fanpage nào được kết nối trong hệ thống.
          </p>
          <button
            type="button"
            onClick={() => setRoute('facebook-connect')}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            <Facebook className="w-4 h-4" />
            Kết nối Fanpage ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {data.pages.map((page) => {
            const allowDelete = canDeletePage(page);
            return (
              <div
                key={page.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={page.avatarUrl || '/src/assets/images/property_land_cuchi_1795074676243.jpg'}
                      alt={page.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 bg-slate-200 dark:bg-slate-800"
                    />
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 truncate">
                        {page.name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">
                        Page ID: {page.pageId}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {page.connectionStatus === 'CONNECTED' ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đang kết nối
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {page.connectionStatus}
                          </span>
                        )}{' '}
                        · Webhook: {page.webhookSubscribed ? 'Đã đăng ký' : 'Chưa kích hoạt'}
                      </p>
                    </div>
                  </div>
                </div>

                {page.lastError && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200">
                    {page.lastError}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 py-3 border-y border-slate-100 dark:border-slate-800 text-center">
                  <div>
                    <p className="text-lg font-display font-bold tabular-nums">{page.totalConversations ?? 0}</p>
                    <p className="text-[11px] text-slate-500">Hội thoại</p>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold tabular-nums">{page.totalCustomers ?? 0}</p>
                    <p className="text-[11px] text-slate-500">Khách hàng</p>
                  </div>
                  <div>
                    <p className="text-lg font-display font-bold tabular-nums">{page.totalMessages ?? 0}</p>
                    <p className="text-[11px] text-slate-500">Tin nhắn</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer">
                    <span>AI phân tích tự động</span>
                    <input
                      type="checkbox"
                      checked={page.aiEnabled}
                      onChange={(e) => updateFacebookPage(page.id, { aiEnabled: e.target.checked })}
                    />
                  </label>
                  <select
                    value={page.autoAssignRule}
                    onChange={(e) =>
                      updateFacebookPage(page.id, {
                        autoAssignRule: e.target.value as 'ROUND_ROBIN' | 'REGION' | 'TEAM' | 'MANUAL',
                      })
                    }
                    className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="ROUND_ROBIN">Chia luân phiên</option>
                    <option value="REGION">Theo khu vực</option>
                    <option value="TEAM">Theo nhóm Sale</option>
                    <option value="MANUAL">Phân công thủ công</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleWebhook(page.id, page.pageId, page.webhookSubscribed)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {page.webhookSubscribed ? 'Tắt Webhook' : 'Đăng ký Webhook'}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        updateFacebookPage(page.id, {
                          connectionStatus: 'DISCONNECTED',
                          webhookSubscribed: false,
                          lastError: 'Đã ngắt kết nối bởi quản trị viên.',
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      Ngắt kết nối
                    </button>
                    <button
                      type="button"
                      disabled={!allowDelete}
                      title={
                        allowDelete
                          ? 'Xóa Fanpage khỏi hệ thống'
                          : 'Chỉ Quản trị viên hoặc Quản lý đã kết nối mới được xóa Fanpage'
                      }
                      onClick={() => setConfirmDeletePage(page)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Xóa Fanpage
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmDeletePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Xác nhận xóa Fanpage</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn xóa Fanpage{' '}
              <span className="font-semibold">{confirmDeletePage.name}</span> (Page ID:{' '}
              <span className="font-mono">{confirmDeletePage.pageId}</span>) khỏi hệ thống? Token kết nối trên máy chủ
              cũng sẽ bị gỡ bỏ.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingPage}
                onClick={() => setConfirmDeletePage(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={deletingPage}
                onClick={async () => {
                  if (!firebaseUser) return;
                  setDeletingPage(true);
                  try {
                    const token = await getIdToken();
                    await deleteFacebookPage(
                      confirmDeletePage.id,
                      confirmDeletePage.pageId,
                      confirmDeletePage.name,
                      firebaseUser.uid,
                      crmUser?.displayName || 'Quản trị viên',
                      token
                    );
                    setConfirmDeletePage(null);
                    pushToast({ title: 'Đã xóa Fanpage khỏi hệ thống', variant: 'success' });
                  } catch (err) {
                    pushToast({
                      title: 'Không thể xóa Fanpage',
                      description: err instanceof Error ? err.message : 'Bạn không có quyền thực hiện thao tác này.',
                      variant: 'error',
                    });
                  } finally {
                    setDeletingPage(false);
                  }
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold cursor-pointer"
              >
                {deletingPage ? 'Đang xóa...' : 'Xóa Fanpage'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FacebookConnectView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, getIdToken } = useAuth();
  const { pushToast, setRoute } = useCrmStore();

  const [config, setConfig] = useState<MetaConfigStatus | null>(null);
  const [discoveredPages, setDiscoveredPages] = useState<
    Array<{ pageId: string; name: string; category: string; avatarUrl: string }>
  >([]);
  const [selectedPageIds, setSelectedPageIds] = useState<Set<string>>(new Set());
  const [connecting, setConnecting] = useState(false);

  // Sandbox Webhook Test Simulator
  const [simPageId, setSimPageId] = useState(data.pages[0]?.pageId || '104829301120001');
  const [simSenderName, setSimSenderName] = useState('Nguyễn Văn Hùng');
  const [simMessage, setSimMessage] = useState(
    'Tôi muốn mua đất Củ Chi diện tích 120m2, ngân sách khoảng 1 tỷ, sổ riêng. Gọi số 0987.654.321 giúp tôi.'
  );
  const [simRunning, setSimRunning] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/facebook/config-status', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setConfig(await res.json());
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('.run.app') && !event.origin.includes('localhost')) return;
      if (event.data?.type === 'META_OAUTH_SUCCESS' && Array.isArray(event.data.pages)) {
        setDiscoveredPages(event.data.pages);
        setSelectedPageIds(new Set(event.data.pages.map((p: { pageId: string }) => p.pageId)));
        pushToast({
          title: 'Đăng nhập Facebook thành công',
          description: `Tìm thấy ${event.data.pages.length} Fanpage có quyền quản lý.`,
          variant: 'success',
        });
      } else if (event.data?.type === 'META_OAUTH_ERROR') {
        pushToast({
          title: 'Lỗi kết nối Facebook',
          description: event.data.error,
          variant: 'error',
        });
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [pushToast]);

  const handleOpenMetaOAuth = async () => {
    setConnecting(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/facebook/oauth', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Chưa cấu hình META_APP_ID / META_APP_SECRET.');
      }
      const popup = window.open(body.url, 'meta_oauth_popup', 'width=640,height=720');
      if (!popup) {
        pushToast({
          title: 'Trình duyệt đã chặn cửa sổ popup',
          description: 'Vui lòng cho phép mở popup để hoàn tất đăng nhập Facebook.',
          variant: 'error',
        });
      }
    } catch (err) {
      pushToast({
        title: 'Chưa thể mở Facebook Login',
        description: err instanceof Error ? err.message : 'Vui lòng cấu hình Meta Developer App.',
        variant: 'error',
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleSaveDiscoveredPages = async () => {
    if (!firebaseUser) return;
    const token = await getIdToken();
    for (const p of discoveredPages) {
      if (!selectedPageIds.has(p.pageId)) continue;
      let subscribed = false;
      try {
        const subRes = await fetch(`/api/facebook/pages/${encodeURIComponent(p.pageId)}/subscribe`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        subscribed = subRes.ok;
      } catch {
        subscribed = false;
      }
      await saveFacebookPage(
        {
          pageId: p.pageId,
          name: p.name,
          category: p.category,
          avatarUrl: p.avatarUrl,
          connectionStatus: 'CONNECTED',
          webhookSubscribed: subscribed,
          aiEnabled: true,
          autoAssignRule: 'ROUND_ROBIN',
          totalConversations: 0,
          totalCustomers: 0,
          totalMessages: 0,
          lastError: subscribed ? '' : 'Chưa đăng ký Webhook tự động.',
        },
        firebaseUser.uid
      );
    }
    pushToast({ title: 'Đã lưu danh sách Fanpage kết nối', variant: 'success' });
    setRoute('pages');
  };

  const handleRunSandboxWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimRunning(true);
    try {
      const token = await getIdToken();
      const pageObj = data.pages.find((p) => p.pageId === simPageId);
      const res = await fetch('/api/sandbox/simulate-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          pageId: pageObj?.id || simPageId,
          pageName: pageObj?.name || 'Fanpage Sandbox',
          senderName: simSenderName,
          text: simMessage,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Lỗi chạy Sandbox Webhook');
      pushToast({
        title: 'Đã xử lý sự kiện Sandbox Webhook',
        description: body.primaryPhone
          ? `Đã tự động trích xuất SĐT ${body.primaryPhone} & phân tích AI.`
          : 'Đã lưu hội thoại và chạy phân tích AI.',
        variant: 'success',
      });
      setRoute('inbox');
    } catch (err) {
      pushToast({
        title: 'Lỗi Sandbox Simulator',
        description: err instanceof Error ? err.message : 'Vui lòng thử lại.',
        variant: 'error',
      });
    } finally {
      setSimRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold">Kết nối nhiều Fanpage Facebook (Meta OAuth &amp; Webhooks)</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sử dụng Meta Graph API chính thức để cấp quyền Fanpage, mã hóa Page Access Token trên máy chủ và nhận tin nhắn qua Webhook
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Production Meta OAuth Flow */}
        <section className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Kết nối Production qua Meta Graph API
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Cấp quyền <span className="font-mono">pages_show_list, pages_messaging, pages_manage_metadata</span>. Token được mã hóa AES-256-GCM tại máy chủ.
              </p>
            </div>
            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">
              {config?.isConfigured ? 'Sẵn sàng OAuth' : 'Chưa cấu hình META_APP_ID'}
            </span>
          </div>

          {config && (
            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-500">Valid OAuth Redirect URI (cài trong Meta Developer):</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 break-all mt-0.5">
                  {config.oauthRedirectUri}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Webhook Callback URL:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 break-all mt-0.5">
                  {config.webhookCallbackUrl}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Verify Token:</span>
                <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">{config.verifyToken}</p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleOpenMetaOAuth}
              disabled={connecting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer"
            >
              <Facebook className="w-4 h-4" />
              {connecting ? 'Đang kết nối...' : 'Đăng nhập Facebook & Chọn Fanpage'}
            </button>
            <a
              href="https://developers.facebook.com/docs/messenger-platform/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Tài liệu Meta Messenger Platform <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {discoveredPages.length > 0 && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <p className="text-xs font-semibold">Chọn Fanpage muốn kết nối vào CRM:</p>
              <div className="space-y-2">
                {discoveredPages.map((p) => (
                  <label
                    key={p.pageId}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={selectedPageIds.has(p.pageId)}
                        onChange={(e) => {
                          const next = new Set(selectedPageIds);
                          if (e.target.checked) next.add(p.pageId);
                          else next.delete(p.pageId);
                          setSelectedPageIds(next);
                        }}
                      />
                      <div>
                        <p className="text-xs font-semibold">{p.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{p.pageId} · {p.category}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <button
                type="button"
                onClick={handleSaveDiscoveredPages}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
              >
                Lưu &amp; Đăng ký Webhook cho {selectedPageIds.size} Fanpage
              </button>
            </div>
          )}
        </section>

        {/* Development / Sandbox Webhook Simulator */}
        <section className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold">Kiểm thử luồng Webhook (Chế độ Sandbox)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dành cho môi trường Development để kiểm thử nhận tin nhắn, tự động tách số điện thoại Việt Nam, phân tích AI và đẩy thông báo WebSocket thời gian thực.
            </p>
          </div>

          <form onSubmit={handleRunSandboxWebhook} className="space-y-3 text-xs">
            <div>
              <label className="block font-medium mb-1">Chọn Fanpage tiếp nhận</label>
              <select
                value={simPageId}
                onChange={(e) => setSimPageId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                {data.pages.map((p) => (
                  <option key={p.id} value={p.pageId}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium mb-1">Tên Facebook khách hàng</label>
              <input
                value={simSenderName}
                onChange={(e) => setSimSenderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Nội dung tin nhắn Messenger</label>
              <textarea
                rows={4}
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              />
            </div>
            <button
              type="submit"
              disabled={simRunning}
              className="w-full py-2.5 px-4 rounded-lg bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              {simRunning ? 'Đang chạy luồng Webhook & AI...' : 'Gửi sự kiện Sandbox Webhook'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export const ConversationsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { openConversation, pushToast } = useCrmStore();
  const [confirmDeleteConv, setConfirmDeleteConv] = useState<ConversationItem | null>(null);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold">Quản lý hội thoại đa Fanpage</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Danh sách tổng hợp toàn bộ luồng hội thoại Messenger, trạng thái đọc và nhân viên phụ trách
        </p>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-slate-500">
                <th className="py-3 px-4 font-semibold">Khách hàng</th>
                <th className="py-3 px-4 font-semibold">Fanpage</th>
                <th className="py-3 px-4 font-semibold">Tin nhắn gần nhất</th>
                <th className="py-3 px-4 font-semibold">Phụ trách</th>
                <th className="py-3 px-4 font-semibold">Trạng thái</th>
                <th className="py-3 px-4 font-semibold text-right">Cập nhật</th>
                <th className="py-3 px-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {data.conversations.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-semibold">
                    <button
                      type="button"
                      onClick={() => openConversation(c.id)}
                      className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {c.customerName}
                    </button>
                  </td>
                  <td className="py-3 px-4">{c.pageName}</td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600 dark:text-slate-300">
                    {c.lastMessage}
                  </td>
                  <td className="py-3 px-4">{c.assignedToName || 'Chưa chia'}</td>
                  <td className="py-3 px-4">{c.status}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500">
                    {formatTimestamp(c.updatedAt)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteConv(c)}
                      title="Xóa hội thoại"
                      className="p-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {confirmDeleteConv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-sm w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-red-600 dark:text-red-400">Xác nhận xóa hội thoại</h3>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Bạn có chắc chắn muốn xóa hội thoại của <span className="font-semibold">{confirmDeleteConv.customerName}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteConv(null)}
                className="px-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!firebaseUser) return;
                  await deleteConversation(
                    confirmDeleteConv.id,
                    firebaseUser.uid,
                    crmUser?.displayName || 'Nhân viên',
                    firebaseUser.email === 'real.htland@gmail.com'
                  );
                  setConfirmDeleteConv(null);
                  pushToast({ title: 'Đã xóa hội thoại', variant: 'success' });
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Xóa hội thoại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
