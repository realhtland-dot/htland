import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Facebook,
  FileBarChart,
  FolderKanban,
  Home,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Search,
  Settings,
  Share2,
  Shield,
  Sun,
  Tag,
  Target,
  UserCheck,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import { ROLE_LABELS, type CrmRoute, type NotificationItem } from '../types/crm.ts';
import { markNotificationRead } from '../services/crmActions.ts';

interface LayoutProps {
  children: React.ReactNode;
  unreadMessagesCount: number;
  notifications: NotificationItem[];
}

interface NavGroup {
  label: string;
  items: Array<{ id: CrmRoute; label: string; icon: React.FC<{ className?: string }>; badge?: number }>;
}

export const Layout: React.FC<LayoutProps> = ({ children, unreadMessagesCount, notifications }) => {
  const { crmUser, logout } = useAuth();
  const {
    activeRoute,
    setRoute,
    globalSearch,
    setGlobalSearch,
    theme,
    toggleTheme,
    sidebarCollapsed,
    toggleSidebar,
    mobileMenuOpen,
    setMobileMenuOpen,
    wsConnected,
    toasts,
    dismissToast,
  } = useCrmStore();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);

  const unreadNotifications = notifications.filter((n) => !n.isRead).length;

  const navGroups: NavGroup[] = [
    {
      label: 'Vận hành chính',
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'inbox', label: 'Hộp thư Messenger', icon: Inbox, badge: unreadMessagesCount },
        { id: 'conversations', label: 'Quản lý hội thoại', icon: MessageSquare },
      ],
    },
    {
      label: 'Khách hàng CRM',
      items: [
        { id: 'customers', label: 'Khách hàng', icon: Users },
        { id: 'leads', label: 'Khách hàng tiềm năng', icon: Target },
        { id: 'demands', label: 'Nhu cầu mua bán', icon: FolderKanban },
        { id: 'tasks', label: 'Lịch chăm sóc', icon: CheckSquare },
        { id: 'appointments', label: 'Lịch hẹn', icon: Calendar },
        { id: 'properties', label: 'Bất động sản', icon: Home },
      ],
    },
    {
      label: 'Kênh & Trí tuệ nhân tạo',
      items: [
        { id: 'pages', label: 'Fanpage', icon: Facebook },
        { id: 'facebook-connect', label: 'Kết nối Facebook', icon: Share2 },
        { id: 'ai-analysis', label: 'AI phân tích', icon: Cpu },
        { id: 'sources', label: 'Nguồn khách hàng', icon: UserCheck },
        { id: 'tags', label: 'Thẻ phân loại', icon: Tag },
      ],
    },
    {
      label: 'Đội ngũ & Báo cáo',
      items: [
        { id: 'staff', label: 'Nhân viên', icon: UsersRound },
        { id: 'teams', label: 'Nhóm nhân viên', icon: Building2 },
        { id: 'permissions', label: 'Phân quyền', icon: Shield },
        { id: 'reports', label: 'Báo cáo thống kê', icon: BarChart3 },
        { id: 'staff-reports', label: 'Báo cáo nhân viên', icon: FileBarChart },
      ],
    },
    {
      label: 'Hệ thống',
      items: [
        { id: 'notifications', label: 'Thông báo', icon: Bell, badge: unreadNotifications },
        { id: 'audit-logs', label: 'Nhật ký hoạt động', icon: Activity },
        { id: 'integrations', label: 'Tích hợp API', icon: KeyRound },
        { id: 'settings', label: 'Cài đặt', icon: Settings },
      ],
    },
  ];

  const allNavItems = navGroups.flatMap((g) => g.items);
  const currentTitle =
    activeRoute === 'customer-detail'
      ? 'Chi tiết khách hàng'
      : allNavItems.find((i) => i.id === activeRoute)?.label || 'Tổng quan';

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shrink-0">
        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={() => setRoute('dashboard')}
            className="flex items-center gap-2.5 text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
              Realty Messenger
            </span>
          </button>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          title={sidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!sidebarCollapsed && (
              <p className="px-2.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeRoute === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setRoute(item.id)}
                    title={sidebarCollapsed ? item.label : undefined}
                    className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/70'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </span>
                    {!sidebarCollapsed && typeof item.badge === 'number' && item.badge > 0 && (
                      <span className="text-xs font-mono tabular-nums font-semibold text-blue-600 dark:text-blue-400">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-200 dark:border-slate-800 shrink-0">
        {!sidebarCollapsed ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={crmUser?.avatarUrl || '/src/assets/images/avatar_crm_consultant_1795074675308.jpg'}
                alt={crmUser?.displayName || 'Nhân viên'}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-lg object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {crmUser?.displayName}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {crmUser?.role ? ROLE_LABELS[crmUser.role] : 'Sale'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Đăng xuất"
              className="p-1.5 rounded-md text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={logout}
            title="Đăng xuất"
            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-150 ${
          sidebarCollapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
      >
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full border-r border-slate-200 dark:border-slate-800 z-10">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 px-4 lg:px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="text-slate-400 dark:text-slate-500 hidden sm:inline whitespace-nowrap">CRM</span>
              <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
              <h1 className="font-display font-semibold text-slate-900 dark:text-slate-50 truncate">
                {currentTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Global Search */}
            <div className="relative hidden md:block w-64 lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Tìm khách hàng, SĐT, Fanpage..."
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>

            {/* Real-time WebSocket connection indicator (strictly real connection telemetry) */}
            <div
              className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 px-2 py-1"
              title={wsConnected ? 'WebSocket thời gian thực đang kết nối' : 'Đang kết nối lại WebSocket'}
            >
              <span
                className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-amber-500'}`}
              />
              <span className="whitespace-nowrap">{wsConnected ? 'Live' : 'Syncing'}</span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifDropdownOpen((v) => !v)}
                className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Thông báo"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-mono font-semibold flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg z-40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-sm font-semibold">Thông báo mới</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNotifDropdownOpen(false);
                        setRoute('notifications');
                      }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Xem tất cả
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-xs text-slate-500">Chưa có thông báo nào.</p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            if (!n.isRead) markNotificationRead(n.id);
                            setNotifDropdownOpen(false);
                            if (n.linkTarget) setRoute(n.linkTarget as CrmRoute);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                            !n.isRead ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Chuyển sang Light Mode' : 'Chuyển sang Dark Mode'}
              aria-label="Chuyển đổi giao diện Sáng/Tối"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={() => setRoute('facebook-connect')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Facebook className="w-3.5 h-3.5" />
              Kết nối Fanpage
            </button>
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>

      {/* Toast Stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="pointer-events-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3.5 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <p
                  className={`text-xs font-semibold ${
                    t.variant === 'error'
                      ? 'text-red-600 dark:text-red-400'
                      : t.variant === 'success'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {t.title}
                </p>
                {t.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 break-words">{t.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
