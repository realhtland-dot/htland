import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type {
  AppointmentItem,
  ConversationItem,
  CustomerItem,
  CustomerSourceItem,
  FacebookPageItem,
  LeadPriority,
  PropertyItem,
  RealEstateIntent,
  SystemSettingItem,
  TagItem,
  TaskItem,
  TeamItem,
  UserRole,
} from '../types/crm.ts';

export interface IncomingWebhookPayload {
  eventId: string;
  pageId: string;
  pageName?: string;
  senderName?: string;
  senderPsid: string;
  text: string;
  extractedPhones?: string[];
  primaryPhone?: string | null;
  aiAnalysis?: {
    customer_name: string | null;
    phone: string | null;
    phones: string[];
    intent: RealEstateIntent;
    property_type: string | null;
    province: string | null;
    district: string | null;
    budget_min: number | null;
    budget_max: number | null;
    area_min: number | null;
    area_max: number | null;
    legal_requirement: string | null;
    lead_score: number;
    priority: LeadPriority;
    summary: string;
    next_action: string;
    provider: string;
  } | null;
}

export function makeSafeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function recordAuditLog(
  actorUid: string,
  actorName: string,
  action: string,
  resource: string,
  details: string
) {
  const id = makeSafeId('log');
  try {
    await setDoc(doc(db, 'audit_logs', id), {
      id,
      actorUid,
      actorName,
      action,
      resource,
      details: details.slice(0, 990),
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('Audit log write warning:', err);
  }
}

export async function ingestIncomingMessengerEvent(
  payload: IncomingWebhookPayload,
  uid: string,
  agentName: string
) {
  const safePsid = payload.senderPsid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const convId = `conv_${payload.pageId}_${safePsid}`.slice(0, 120);
  const customerId = `cust_${safePsid}`.slice(0, 120);

  try {
    // Check if customer already exists by primaryPhone or facebookId
    let targetCustomerId = customerId;
    const viewerUids = [uid];

    if (payload.primaryPhone) {
      const phoneSnap = await getDocs(
        query(
          collection(db, 'customers'),
          where('viewerUids', 'array-contains', uid),
          where('primaryPhone', '==', payload.primaryPhone)
        )
      );
      if (!phoneSnap.empty) {
        targetCustomerId = phoneSnap.docs[0].id;
      }
    }

    const ai = payload.aiAnalysis;
    const customerSnap = await getDocs(
      query(collection(db, 'customers'), where('viewerUids', 'array-contains', uid), where('id', '==', targetCustomerId))
    );

    const batch = writeBatch(db);
    const hasPhone = Boolean(payload.primaryPhone);

    if (customerSnap.empty) {
      batch.set(doc(db, 'customers', targetCustomerId), {
        id: targetCustomerId,
        fullName: ai?.customer_name || payload.senderName || `Khách Messenger ${safePsid.slice(-4)}`,
        primaryPhone: payload.primaryPhone || '',
        phones: payload.extractedPhones || [],
        facebookId: payload.senderPsid,
        facebookName: payload.senderName || `Facebook User ${safePsid.slice(-4)}`,
        avatarUrl: '',
        sourcePageId: payload.pageId,
        sourcePageName: payload.pageName || 'Fanpage Messenger',
        sourceChannel: 'Facebook Messenger',
        intent: ai?.intent || 'UNCLEAR',
        propertyType: ai?.property_type || '',
        province: ai?.province || '',
        district: ai?.district || '',
        budgetMin: ai?.budget_min ?? null,
        budgetMax: ai?.budget_max ?? null,
        areaMin: ai?.area_min ?? null,
        areaMax: ai?.area_max ?? null,
        legalRequirement: ai?.legal_requirement || '',
        leadScore: ai?.lead_score ?? (hasPhone ? 80 : 40),
        priority: ai?.priority || (hasPhone ? 'HIGH' : 'MEDIUM'),
        status: hasPhone ? 'Đã có số điện thoại' : 'Khách mới',
        assignedToUid: uid,
        assignedToName: agentName,
        tags: hasPhone ? ['Đã có SĐT'] : ['Khách mới'],
        notesSummary: ai?.summary || payload.text.slice(0, 300),
        createdByUid: uid,
        viewerUids,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existing = customerSnap.docs[0].data() as CustomerItem;
      const mergedPhones = Array.from(new Set([...(existing.phones || []), ...(payload.extractedPhones || [])])).slice(0, 10);
      batch.update(doc(db, 'customers', targetCustomerId), {
        primaryPhone: existing.primaryPhone || payload.primaryPhone || '',
        phones: mergedPhones,
        intent: ai?.intent && ai.intent !== 'UNCLEAR' ? ai.intent : existing.intent,
        province: ai?.province || existing.province || '',
        district: ai?.district || existing.district || '',
        budgetMax: ai?.budget_max ?? existing.budgetMax ?? null,
        areaMin: ai?.area_min ?? existing.areaMin ?? null,
        areaMax: ai?.area_max ?? existing.areaMax ?? null,
        leadScore: ai?.lead_score ?? existing.leadScore ?? 50,
        priority: ai?.priority || existing.priority,
        status: hasPhone && existing.status === 'Chưa có số điện thoại' ? 'Đã có số điện thoại' : existing.status,
        notesSummary: ai?.summary || existing.notesSummary || '',
        updatedAt: serverTimestamp(),
      });
    }

    // Upsert Conversation
    const convSnap = await getDocs(
      query(collection(db, 'conversations'), where('viewerUids', 'array-contains', uid), where('id', '==', convId))
    );
    if (convSnap.empty) {
      batch.set(doc(db, 'conversations', convId), {
        id: convId,
        customerId: targetCustomerId,
        customerName: payload.senderName || `Khách Messenger ${safePsid.slice(-4)}`,
        customerAvatar: '',
        pageId: payload.pageId,
        pageName: payload.pageName || 'Fanpage Messenger',
        facebookUserId: payload.senderPsid,
        lastMessage: payload.text.slice(0, 950),
        unreadCount: 1,
        isImportant: hasPhone,
        hasPhone,
        assignedToUid: uid,
        assignedToName: agentName,
        status: 'OPEN',
        tags: hasPhone ? ['Đã có SĐT'] : [],
        createdByUid: uid,
        viewerUids,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingConv = convSnap.docs[0].data() as ConversationItem;
      batch.update(doc(db, 'conversations', convId), {
        lastMessage: payload.text.slice(0, 950),
        unreadCount: (existingConv.unreadCount || 0) + 1,
        hasPhone: Boolean(existingConv.hasPhone || hasPhone),
        updatedAt: serverTimestamp(),
      });
    }

    // Save Message
    const msgId = makeSafeId('msg');
    batch.set(doc(db, 'conversations', convId, 'messages', msgId), {
      id: msgId,
      conversationId: convId,
      senderType: 'CUSTOMER',
      senderUid: uid,
      senderName: payload.senderName || 'Khách hàng',
      text: payload.text,
      deliveryStatus: 'RECEIVED',
      extractedPhones: (payload.extractedPhones || []).slice(0, 5),
      viewerUids,
      createdAt: serverTimestamp(),
    });

    // Save AI Analysis record if available
    if (ai) {
      const aiId = makeSafeId('ai');
      batch.set(doc(db, 'ai_analyses', aiId), {
        id: aiId,
        conversationId: convId,
        customerId: targetCustomerId,
        customerName: ai.customer_name || payload.senderName || 'Khách hàng',
        sourceText: payload.text.slice(0, 3900),
        phone: payload.primaryPhone || null,
        intent: ai.intent,
        propertyType: ai.property_type || null,
        province: ai.province || null,
        district: ai.district || null,
        budgetMin: ai.budget_min ?? null,
        budgetMax: ai.budget_max ?? null,
        areaMin: ai.area_min ?? null,
        areaMax: ai.area_max ?? null,
        legalRequirement: ai.legal_requirement || null,
        leadScore: ai.lead_score,
        priority: ai.priority,
        summary: ai.summary,
        nextAction: ai.next_action || null,
        provider: ai.provider || 'gemini',
        isEditedByHuman: false,
        createdByUid: uid,
        viewerUids,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    // Notification
    const notifId = makeSafeId('notif');
    batch.set(doc(db, 'notifications', notifId), {
      id: notifId,
      recipientUid: uid,
      title: hasPhone
        ? `Trích xuất SĐT mới: ${payload.primaryPhone}`
        : `Tin nhắn mới từ ${payload.senderName || 'Khách hàng'}`,
      body: payload.text.slice(0, 300),
      type: hasPhone ? 'PHONE_EXTRACTED' : 'MESSAGE',
      isRead: false,
      linkTarget: 'inbox',
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'ingestIncomingMessengerEvent');
  }
}

export async function createCustomer(
  data: Omit<CustomerItem, 'id' | 'createdByUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string,
  actorName: string
) {
  const id = makeSafeId('cust');
  try {
    await setDoc(doc(db, 'customers', id), {
      ...data,
      id,
      createdByUid: uid,
      viewerUids: Array.from(new Set([uid, ...(data.assignedToUid ? [data.assignedToUid] : [])])),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(uid, actorName, 'CREATE_CUSTOMER', `customers/${id}`, `Tạo hồ sơ khách hàng ${data.fullName}`);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `customers/${id}`);
  }
}

export async function updateCustomer(
  customerId: string,
  patch: Partial<CustomerItem>,
  uid: string,
  actorName: string
) {
  try {
    await updateDoc(doc(db, 'customers', customerId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    await recordAuditLog(uid, actorName, 'UPDATE_CUSTOMER', `customers/${customerId}`, `Cập nhật thông tin khách hàng`);
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
  }
}

export async function deleteCustomer(customerId: string, uid: string, actorName: string) {
  try {
    await deleteDoc(doc(db, 'customers', customerId));
    await recordAuditLog(uid, actorName, 'DELETE_CUSTOMER', `customers/${customerId}`, `Xóa hồ sơ khách hàng`);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
  }
}

export async function addCustomerNote(
  customerId: string,
  content: string,
  uid: string,
  authorName: string,
  viewerUids: string[]
) {
  const noteId = makeSafeId('note');
  const actId = makeSafeId('act');
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'customers', customerId, 'notes', noteId), {
      id: noteId,
      customerId,
      authorUid: uid,
      authorName,
      content,
      viewerUids,
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'customers', customerId, 'activities', actId), {
      id: actId,
      customerId,
      actorUid: uid,
      actorName: authorName,
      actionType: 'NOTE_ADDED',
      description: content.slice(0, 500),
      viewerUids,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `customers/${customerId}/notes`);
  }
}

export async function sendConversationReply(
  conversation: ConversationItem,
  text: string,
  uid: string,
  senderName: string,
  idToken: string | null,
  sendViaMetaApi: boolean,
  attachmentUrl?: string,
  attachmentType?: 'image' | 'file'
) {
  let deliveryStatus: 'SENT' | 'DELIVERED' | 'FAILED' = 'SENT';

  if (sendViaMetaApi && idToken && conversation.facebookUserId) {
    const res = await fetch(`/api/facebook/pages/${encodeURIComponent(conversation.pageId)}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        recipientPsid: conversation.facebookUserId,
        text,
        attachmentUrl,
        attachmentType,
      }),
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({ error: 'Meta Send API error' }));
      deliveryStatus = 'FAILED';
      // Still store message with FAILED status so agent sees exact error
      const failedId = makeSafeId('msg');
      await setDoc(doc(db, 'conversations', conversation.id, 'messages', failedId), {
        id: failedId,
        conversationId: conversation.id,
        senderType: 'AGENT',
        senderUid: uid,
        senderName,
        text: text || (attachmentUrl ? `[Tệp đính kèm] ${attachmentUrl}` : ''),
        attachmentUrl: attachmentUrl || '',
        attachmentType: attachmentType || '',
        deliveryStatus: 'FAILED',
        extractedPhones: [],
        viewerUids: conversation.viewerUids,
        createdAt: serverTimestamp(),
      });
      throw new Error(errBody.error || 'Gửi qua Messenger thất bại.');
    }
    deliveryStatus = 'DELIVERED';
  }

  const msgId = makeSafeId('msg');
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'conversations', conversation.id, 'messages', msgId), {
      id: msgId,
      conversationId: conversation.id,
      senderType: 'AGENT',
      senderUid: uid,
      senderName,
      text: text || (attachmentUrl ? `[Tệp đính kèm] ${attachmentUrl}` : ''),
      attachmentUrl: attachmentUrl || '',
      attachmentType: attachmentType || '',
      deliveryStatus,
      extractedPhones: [],
      viewerUids: conversation.viewerUids,
      createdAt: serverTimestamp(),
    });
    batch.update(doc(db, 'conversations', conversation.id), {
      lastMessage: text || '[Đã gửi tệp đính kèm]',
      unreadCount: 0,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `conversations/${conversation.id}/messages`);
  }
}

export async function updateConversationFields(
  conversationId: string,
  patch: Partial<ConversationItem>
) {
  try {
    await updateDoc(doc(db, 'conversations', conversationId), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `conversations/${conversationId}`);
  }
}

export async function saveProperty(
  property: Omit<PropertyItem, 'id' | 'ownerUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string,
  existingId?: string
) {
  const id = existingId || makeSafeId('prop');
  try {
    if (existingId) {
      await updateDoc(doc(db, 'properties', id), {
        ...property,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'properties', id), {
        ...property,
        id,
        ownerUid: uid,
        viewerUids: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `properties/${id}`);
  }
}

export async function deleteProperty(propertyId: string) {
  try {
    await deleteDoc(doc(db, 'properties', propertyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `properties/${propertyId}`);
  }
}

export async function saveTask(
  task: Omit<TaskItem, 'id' | 'createdByUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string
) {
  const id = makeSafeId('task');
  try {
    await setDoc(doc(db, 'tasks', id), {
      ...task,
      id,
      createdByUid: uid,
      viewerUids: Array.from(new Set([uid, task.assignedToUid])),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tasks/${id}`);
  }
}

export async function updateTaskStatus(taskId: string, status: TaskItem['status']) {
  try {
    await updateDoc(doc(db, 'tasks', taskId), { status, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `tasks/${taskId}`);
  }
}

export async function saveAppointment(
  appt: Omit<AppointmentItem, 'id' | 'createdByUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string
) {
  const id = makeSafeId('appt');
  try {
    await setDoc(doc(db, 'appointments', id), {
      ...appt,
      id,
      createdByUid: uid,
      viewerUids: Array.from(new Set([uid, appt.assignedToUid])),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `appointments/${id}`);
  }
}

export async function updateAppointmentStatus(apptId: string, status: AppointmentItem['status']) {
  try {
    await updateDoc(doc(db, 'appointments', apptId), { status, updatedAt: serverTimestamp() });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `appointments/${apptId}`);
  }
}

export async function saveFacebookPage(
  page: Omit<FacebookPageItem, 'id' | 'connectedByUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string
) {
  const id = `page_${page.pageId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  try {
    await setDoc(
      doc(db, 'facebook_pages', id),
      {
        ...page,
        id,
        connectedByUid: uid,
        viewerUids: [uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `facebook_pages/${id}`);
  }
}

export async function updateFacebookPage(pageIdDoc: string, patch: Partial<FacebookPageItem>) {
  try {
    await updateDoc(doc(db, 'facebook_pages', pageIdDoc), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `facebook_pages/${pageIdDoc}`);
  }
}

export async function saveTag(tag: Omit<TagItem, 'id' | 'createdByUid' | 'viewerUids'>, uid: string) {
  const id = makeSafeId('tag');
  try {
    await setDoc(doc(db, 'tags', id), {
      ...tag,
      id,
      createdByUid: uid,
      viewerUids: [uid],
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `tags/${id}`);
  }
}

export async function deleteTag(tagId: string) {
  try {
    await deleteDoc(doc(db, 'tags', tagId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `tags/${tagId}`);
  }
}

export async function saveCustomerSource(
  source: Omit<CustomerSourceItem, 'id' | 'createdByUid' | 'viewerUids'>,
  uid: string
) {
  const id = makeSafeId('src');
  try {
    await setDoc(doc(db, 'customer_sources', id), {
      ...source,
      id,
      createdByUid: uid,
      viewerUids: [uid],
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `customer_sources/${id}`);
  }
}

export async function saveTeam(
  team: Omit<TeamItem, 'id' | 'createdByUid' | 'viewerUids' | 'createdAt' | 'updatedAt'>,
  uid: string
) {
  const id = makeSafeId('team');
  try {
    await setDoc(doc(db, 'teams', id), {
      ...team,
      id,
      createdByUid: uid,
      viewerUids: [uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `teams/${id}`);
  }
}

export async function updateUserRole(targetUid: string, role: UserRole, status: 'ACTIVE' | 'INACTIVE') {
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', targetUid), { role, status, updatedAt: serverTimestamp() });
    batch.update(doc(db, 'staff_directory', targetUid), { role, status, updatedAt: serverTimestamp() });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
  }
}

export async function updateSystemSettings(
  settings: Omit<SystemSettingItem, 'id' | 'updatedByUid' | 'viewerUids' | 'updatedAt'>,
  uid: string
) {
  try {
    await setDoc(doc(db, 'system_settings', 'default_settings'), {
      ...settings,
      id: 'default_settings',
      updatedByUid: uid,
      viewerUids: [uid],
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'system_settings/default_settings');
  }
}

export async function markNotificationRead(notifId: string) {
  try {
    await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `notifications/${notifId}`);
  }
}

export async function saveAiAnalysisRecord(
  analysis: {
    sourceText: string;
    customerName?: string;
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
  },
  uid: string
) {
  const id = makeSafeId('ai');
  try {
    await setDoc(doc(db, 'ai_analyses', id), {
      sourceText: analysis.sourceText,
      customerName: analysis.customerName || '',
      phone: analysis.phone ?? null,
      intent: analysis.intent,
      propertyType: analysis.propertyType ?? null,
      province: analysis.province ?? null,
      district: analysis.district ?? null,
      budgetMin: analysis.budgetMin ?? null,
      budgetMax: analysis.budgetMax ?? null,
      areaMin: analysis.areaMin ?? null,
      areaMax: analysis.areaMax ?? null,
      legalRequirement: analysis.legalRequirement ?? null,
      leadScore: analysis.leadScore,
      priority: analysis.priority,
      summary: analysis.summary,
      nextAction: analysis.nextAction ?? null,
      provider: analysis.provider || 'gemini',
      id,
      isEditedByHuman: false,
      createdByUid: uid,
      viewerUids: [uid],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `ai_analyses/${id}`);
  }
}

export async function updateAiAnalysisRecord(
  analysisId: string,
  patch: Partial<{
    intent: RealEstateIntent;
    propertyType: string | null;
    province: string | null;
    district: string | null;
    budgetMax: number | null;
    areaMin: number | null;
    areaMax: number | null;
    legalRequirement: string | null;
    leadScore: number;
    priority: LeadPriority;
    summary: string;
    nextAction: string | null;
  }>
) {
  try {
    await updateDoc(doc(db, 'ai_analyses', analysisId), {
      ...patch,
      isEditedByHuman: true,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `ai_analyses/${analysisId}`);
  }
}

export async function mergeDuplicateCustomers(
  primaryCustomer: CustomerItem,
  duplicateCustomer: CustomerItem,
  uid: string,
  actorName: string
) {
  try {
    const mergedPhones = Array.from(
      new Set([...(primaryCustomer.phones || []), ...(duplicateCustomer.phones || [])])
    ).slice(0, 10);
    const mergedTags = Array.from(
      new Set([...(primaryCustomer.tags || []), ...(duplicateCustomer.tags || [])])
    ).slice(0, 10);

    const batch = writeBatch(db);
    batch.update(doc(db, 'customers', primaryCustomer.id), {
      phones: mergedPhones,
      primaryPhone: primaryCustomer.primaryPhone || duplicateCustomer.primaryPhone || '',
      tags: mergedTags,
      notesSummary: [primaryCustomer.notesSummary, duplicateCustomer.notesSummary]
        .filter(Boolean)
        .join(' | ')
        .slice(0, 990),
      updatedAt: serverTimestamp(),
    });
    batch.delete(doc(db, 'customers', duplicateCustomer.id));
    await batch.commit();
    await recordAuditLog(
      uid,
      actorName,
      'MERGE_CUSTOMERS',
      `customers/${primaryCustomer.id}`,
      `Gộp hồ sơ trùng ${duplicateCustomer.fullName} vào ${primaryCustomer.fullName}`
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `customers/${primaryCustomer.id}/merge`);
  }
}
