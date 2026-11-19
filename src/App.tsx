import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AuthScreen } from './components/AuthScreen.tsx';
import { Layout } from './components/Layout.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { InboxView } from './components/InboxView.tsx';
import {
  CustomerDetailView,
  CustomersListView,
  DemandsView,
} from './components/CustomersModule.tsx';
import {
  ConversationsView,
  FacebookConnectView,
  PagesView,
} from './components/FacebookModule.tsx';
import {
  AppointmentsView,
  PropertiesView,
  TasksView,
} from './components/OperationsModule.tsx';
import {
  AiAnalysisView,
  ReportsView,
  StaffReportsView,
} from './components/AiAndReportsModule.tsx';
import {
  AuditLogsView,
  IntegrationsView,
  NotificationsView,
  PermissionsView,
  SettingsView,
  SourcesView,
  StaffView,
  TagsView,
  TeamsView,
} from './components/AdminModule.tsx';
import { AuthProvider, useAuth } from './services/authContext.tsx';
import { useCrmData } from './hooks/useCrmData.ts';
import { useWebSocket } from './hooks/useWebSocket.ts';
import { useCrmStore } from './store/useCrmStore.ts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const AuthenticatedWorkspace: React.FC = () => {
  useWebSocket();
  const data = useCrmData();
  const { activeRoute } = useCrmStore();

  const unreadMessagesCount = data.conversations.filter(
    (c) => (c.unreadCount || 0) > 0
  ).length;

  const renderPage = () => {
    switch (activeRoute) {
      case 'dashboard':
        return <DashboardView data={data} />;
      case 'inbox':
        return <InboxView data={data} />;
      case 'conversations':
        return <ConversationsView data={data} />;
      case 'customers':
        return <CustomersListView data={data} />;
      case 'leads':
        return <CustomersListView data={data} onlyHighPotential />;
      case 'customer-detail':
        return <CustomerDetailView data={data} />;
      case 'demands':
        return <DemandsView data={data} />;
      case 'tasks':
        return <TasksView data={data} />;
      case 'appointments':
        return <AppointmentsView data={data} />;
      case 'properties':
        return <PropertiesView data={data} />;
      case 'pages':
        return <PagesView data={data} />;
      case 'facebook-connect':
        return <FacebookConnectView data={data} />;
      case 'ai-analysis':
        return <AiAnalysisView data={data} />;
      case 'sources':
        return <SourcesView data={data} />;
      case 'tags':
        return <TagsView data={data} />;
      case 'staff':
        return <StaffView data={data} />;
      case 'teams':
        return <TeamsView data={data} />;
      case 'permissions':
        return <PermissionsView />;
      case 'reports':
        return <ReportsView data={data} />;
      case 'staff-reports':
        return <StaffReportsView data={data} />;
      case 'notifications':
        return <NotificationsView data={data} />;
      case 'audit-logs':
        return <AuditLogsView data={data} />;
      case 'integrations':
        return <IntegrationsView />;
      case 'settings':
        return <SettingsView data={data} />;
      default:
        return <DashboardView data={data} />;
    }
  };

  return (
    <Layout
      unreadMessagesCount={unreadMessagesCount}
      notifications={data.notifications}
    >
      {data.loading ? (
        <div className="space-y-4 py-6">
          <div className="h-8 w-56 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-28 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse"
              />
            ))}
          </div>
        </div>
      ) : (
        renderPage()
      )}
    </Layout>
  );
};

const CrmShell: React.FC = () => {
  const { firebaseUser, authReady } = useAuth();
  const theme = useCrmStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Đang khởi tạo phiên làm việc CRM...
          </p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return <AuthScreen />;
  }

  return <AuthenticatedWorkspace />;
};

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CrmShell />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
