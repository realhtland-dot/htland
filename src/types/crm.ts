export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'SALE';

export type RealEstateIntent =
  | 'BUY_LAND'
  | 'BUY_HOUSE'
  | 'SELL_LAND'
  | 'SELL_HOUSE'
  | 'RENT'
  | 'LEASE'
  | 'INVEST'
  | 'PROJECT_INFO'
  | 'BROKER'
  | 'UNCLEAR';

export type LeadPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export const CUSTOMER_STATUSES = [
  'Khách mới',
  'Chưa có số điện thoại',
  'Đã có số điện thoại',
  'Chưa liên hệ',
  'Đã gọi điện',
  'Đang tư vấn',
  'Khách tiềm năng',
  'Đã hẹn gặp',
  'Đã đi xem bất động sản',
  'Đang thương lượng',
  'Đã giao dịch',
  'Không có nhu cầu',
] as const;

export type CustomerStatus = (typeof CUSTOMER_STATUSES)[number] | string;

export const INTENT_LABELS: Record<RealEstateIntent, string> = {
  BUY_LAND: 'Mua đất',
  BUY_HOUSE: 'Mua nhà / Căn hộ',
  SELL_LAND: 'Ký gửi bán đất',
  SELL_HOUSE: 'Ký gửi bán nhà',
  RENT: 'Tìm thuê BĐS',
  LEASE: 'Cho thuê BĐS',
  INVEST: 'Đầu tư BĐS',
  PROJECT_INFO: 'Hỏi thông tin dự án',
  BROKER: 'Môi giới / CTV',
  UNCLEAR: 'Chưa rõ nhu cầu',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Trưởng nhóm',
  SALE: 'Nhân viên Sale',
};

export interface CrmUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  phone?: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
  assignedPageIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface StaffDirectoryItem {
  uid: string;
  displayName: string;
  role: UserRole;
  teamId?: string;
  status: 'ACTIVE' | 'INACTIVE';
  avatarUrl?: string;
  viewerUids: string[];
}

export interface TeamItem {
  id: string;
  name: string;
  leaderUid: string;
  leaderName?: string;
  region: string;
  memberUids?: string[];
  viewerUids: string[];
  createdByUid: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface FacebookPageItem {
  id: string;
  pageId: string;
  name: string;
  category?: string;
  avatarUrl?: string;
  connectionStatus: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED';
  webhookSubscribed: boolean;
  aiEnabled: boolean;
  autoAssignRule: 'ROUND_ROBIN' | 'REGION' | 'TEAM' | 'MANUAL';
  totalConversations?: number;
  totalCustomers?: number;
  totalMessages?: number;
  connectedByUid: string;
  lastError?: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerItem {
  id: string;
  fullName: string;
  primaryPhone?: string;
  phones: string[];
  facebookId?: string;
  facebookName?: string;
  avatarUrl?: string;
  sourcePageId?: string;
  sourcePageName?: string;
  sourceChannel?: string;
  intent: RealEstateIntent;
  propertyType?: string;
  province?: string;
  district?: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  legalRequirement?: string;
  leadScore?: number;
  priority: LeadPriority;
  status: CustomerStatus;
  assignedToUid?: string;
  assignedToName?: string;
  tags?: string[];
  notesSummary?: string;
  createdByUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerNoteItem {
  id: string;
  customerId: string;
  authorUid: string;
  authorName: string;
  content: string;
  viewerUids: string[];
  createdAt?: unknown;
}

export interface CustomerActivityItem {
  id: string;
  customerId: string;
  actorUid: string;
  actorName: string;
  actionType: string;
  description: string;
  viewerUids: string[];
  createdAt?: unknown;
}

export interface ConversationItem {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  pageId: string;
  pageName: string;
  facebookUserId?: string;
  lastMessage: string;
  unreadCount: number;
  isImportant?: boolean;
  hasPhone?: boolean;
  assignedToUid?: string;
  assignedToName?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
  tags?: string[];
  createdByUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  senderUid: string;
  senderName: string;
  text: string;
  attachmentUrl?: string;
  attachmentType?: string;
  deliveryStatus: 'RECEIVED' | 'SENT' | 'DELIVERED' | 'FAILED';
  extractedPhones?: string[];
  viewerUids: string[];
  createdAt?: unknown;
}

export interface PropertyItem {
  id: string;
  code: string;
  title: string;
  propertyType: 'LAND' | 'HOUSE' | 'APARTMENT' | 'VILLA' | 'COMMERCIAL';
  transactionType: 'BUY' | 'SELL' | 'RENT';
  province: string;
  district: string;
  areaSqm: number;
  priceVnd: number;
  legalStatus?: string;
  status: 'AVAILABLE' | 'RESERVED' | 'SOLD';
  imageUrl?: string;
  description?: string;
  ownerUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TaskItem {
  id: string;
  customerId: string;
  customerName: string;
  title: string;
  taskType: 'CALL' | 'MESSAGE' | 'FOLLOW_UP' | 'SEND_INFO';
  dueDate: string;
  priority: LeadPriority;
  status: 'PENDING' | 'COMPLETED' | 'OVERDUE';
  assignedToUid: string;
  assignedToName?: string;
  notes?: string;
  createdByUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AppointmentItem {
  id: string;
  customerId: string;
  customerName: string;
  propertyId?: string;
  propertyTitle?: string;
  location: string;
  scheduledAt: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  assignedToUid: string;
  assignedToName?: string;
  notes?: string;
  createdByUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiAnalysisItem {
  id: string;
  conversationId?: string;
  customerId?: string;
  customerName?: string;
  sourceText: string;
  phone?: string | null;
  intent: RealEstateIntent;
  propertyType?: string | null;
  province?: string | null;
  district?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  areaMin?: number | null;
  areaMax?: number | null;
  legalRequirement?: string | null;
  leadScore: number;
  priority: LeadPriority;
  summary: string;
  nextAction?: string | null;
  provider?: string;
  isEditedByHuman?: boolean;
  createdByUid: string;
  viewerUids: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
  category?: string;
  createdByUid: string;
  viewerUids: string[];
}

export interface CustomerSourceItem {
  id: string;
  name: string;
  channel: string;
  isActive: boolean;
  createdByUid: string;
  viewerUids: string[];
}

export interface NotificationItem {
  id: string;
  recipientUid: string;
  title: string;
  body: string;
  type: 'MESSAGE' | 'PHONE_EXTRACTED' | 'ASSIGNMENT' | 'APPOINTMENT' | 'SYSTEM';
  isRead: boolean;
  linkTarget?: string;
  createdAt?: unknown;
}

export interface AuditLogItem {
  id: string;
  actorUid: string;
  actorName: string;
  action: string;
  resource: string;
  details: string;
  createdAt?: unknown;
}

export interface SystemSettingItem {
  id: string;
  companyName: string;
  autoAssignMethod: 'ROUND_ROBIN' | 'BY_PAGE' | 'BY_REGION' | 'BY_TEAM' | 'MANUAL';
  preventDuplicateAssignment: boolean;
  aiAutoAnalyze: boolean;
  aiProvider: 'gemini' | 'openai';
  dataRetentionDays?: number;
  updatedByUid: string;
  viewerUids: string[];
  updatedAt?: unknown;
}

export type CrmRoute =
  | 'dashboard'
  | 'inbox'
  | 'customers'
  | 'customer-detail'
  | 'leads'
  | 'demands'
  | 'pages'
  | 'facebook-connect'
  | 'conversations'
  | 'staff'
  | 'permissions'
  | 'teams'
  | 'tasks'
  | 'appointments'
  | 'properties'
  | 'sources'
  | 'tags'
  | 'ai-analysis'
  | 'reports'
  | 'staff-reports'
  | 'notifications'
  | 'audit-logs'
  | 'integrations'
  | 'settings';
