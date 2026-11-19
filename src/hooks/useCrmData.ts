import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import { useAuth } from '../services/authContext.tsx';
import type {
  AiAnalysisItem,
  AppointmentItem,
  AuditLogItem,
  ConversationItem,
  CrmUser,
  CustomerItem,
  CustomerSourceItem,
  FacebookPageItem,
  NotificationItem,
  PropertyItem,
  StaffDirectoryItem,
  SystemSettingItem,
  TagItem,
  TaskItem,
  TeamItem,
} from '../types/crm.ts';

export interface CrmDataset {
  customers: CustomerItem[];
  conversations: ConversationItem[];
  pages: FacebookPageItem[];
  properties: PropertyItem[];
  tasks: TaskItem[];
  appointments: AppointmentItem[];
  aiAnalyses: AiAnalysisItem[];
  tags: TagItem[];
  sources: CustomerSourceItem[];
  teams: TeamItem[];
  staffDirectory: StaffDirectoryItem[];
  users: CrmUser[];
  notifications: NotificationItem[];
  auditLogs: AuditLogItem[];
  systemSettings: SystemSettingItem | null;
  loading: boolean;
}

export function useCrmData(): CrmDataset {
  const { firebaseUser, crmUser, authReady } = useAuth();
  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [pages, setPages] = useState<FacebookPageItem[]>([]);
  const [properties, setProperties] = useState<PropertyItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [aiAnalyses, setAiAnalyses] = useState<AiAnalysisItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [sources, setSources] = useState<CustomerSourceItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [staffDirectory, setStaffDirectory] = useState<StaffDirectoryItem[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettingItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady || !firebaseUser) {
      setLoading(false);
      return;
    }

    const uid = firebaseUser.uid;
    const isSuperEmail = firebaseUser.email === 'real.htland@gmail.com';
    setLoading(true);

    const scoped = (col: string) =>
      isSuperEmail
        ? query(collection(db, col))
        : query(collection(db, col), where('viewerUids', 'array-contains', uid));

    const unsubs: Array<() => void> = [];

    unsubs.push(
      onSnapshot(
        scoped('customers'),
        (snap) => {
          setCustomers(snap.docs.map((d) => d.data() as CustomerItem));
          setLoading(false);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('conversations'),
        (snap) => setConversations(snap.docs.map((d) => d.data() as ConversationItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'conversations')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('facebook_pages'),
        (snap) => setPages(snap.docs.map((d) => d.data() as FacebookPageItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'facebook_pages')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('properties'),
        (snap) => setProperties(snap.docs.map((d) => d.data() as PropertyItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'properties')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('tasks'),
        (snap) => setTasks(snap.docs.map((d) => d.data() as TaskItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tasks')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('appointments'),
        (snap) => setAppointments(snap.docs.map((d) => d.data() as AppointmentItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'appointments')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('ai_analyses'),
        (snap) => setAiAnalyses(snap.docs.map((d) => d.data() as AiAnalysisItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'ai_analyses')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('tags'),
        (snap) => setTags(snap.docs.map((d) => d.data() as TagItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'tags')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('customer_sources'),
        (snap) => setSources(snap.docs.map((d) => d.data() as CustomerSourceItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'customer_sources')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('teams'),
        (snap) => setTeams(snap.docs.map((d) => d.data() as TeamItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'teams')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('staff_directory'),
        (snap) => setStaffDirectory(snap.docs.map((d) => d.data() as StaffDirectoryItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'staff_directory')
      )
    );

    const usersQuery = isSuperEmail
      ? query(collection(db, 'users'))
      : query(collection(db, 'users'), where('uid', '==', uid));
    unsubs.push(
      onSnapshot(
        usersQuery,
        (snap) => setUsers(snap.docs.map((d) => d.data() as CrmUser)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'users')
      )
    );

    const notifQuery = isSuperEmail
      ? query(collection(db, 'notifications'))
      : query(collection(db, 'notifications'), where('recipientUid', '==', uid));
    unsubs.push(
      onSnapshot(
        notifQuery,
        (snap) => setNotifications(snap.docs.map((d) => d.data() as NotificationItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'notifications')
      )
    );

    const auditQuery = isSuperEmail
      ? query(collection(db, 'audit_logs'))
      : query(collection(db, 'audit_logs'), where('actorUid', '==', uid));
    unsubs.push(
      onSnapshot(
        auditQuery,
        (snap) => setAuditLogs(snap.docs.map((d) => d.data() as AuditLogItem)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
      )
    );

    unsubs.push(
      onSnapshot(
        scoped('system_settings'),
        (snap) => {
          const first = snap.docs[0]?.data() as SystemSettingItem | undefined;
          setSystemSettings(first || null);
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'system_settings')
      )
    );

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }, [authReady, firebaseUser, crmUser?.role]);

  return {
    customers,
    conversations,
    pages,
    properties,
    tasks,
    appointments,
    aiAnalyses,
    tags,
    sources,
    teams,
    staffDirectory,
    users,
    notifications,
    auditLogs,
    systemSettings,
    loading,
  };
}
