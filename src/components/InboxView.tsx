import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Cpu,
  Image as ImageIcon,
  MessageSquare,
  Paperclip,
  Phone,
  Search,
  Send,
  Star,
  UserPlus,
  AlertCircle,
} from 'lucide-react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase.ts';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import {
  CUSTOMER_STATUSES,
  INTENT_LABELS,
  type CustomerNoteItem,
  type MessageItem,
} from '../types/crm.ts';
import {
  addCustomerNote,
  saveAiAnalysisRecord,
  sendConversationReply,
  updateConversationFields,
  updateCustomer,
} from '../services/crmActions.ts';
import { formatTimestamp, formatVndShort, toDateObj } from '../utils/format.ts';

export const InboxView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser, getIdToken } = useAuth();
  const { selectedConversationId, openConversation, openCustomerDetail, pushToast } = useCrmStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [messageSearch, setMessageSearch] = useState('');
  const [pageFilter, setPageFilter] = useState('ALL');
  const [staffFilter, setStaffFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [phoneOnly, setPhoneOnly] = useState(false);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [notes, setNotes] = useState<CustomerNoteItem[]>([]);
  const [replyText, setReplyText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [showAttachmentInput, setShowAttachmentInput] = useState(false);
  const [noteInput, setNoteInput] = useState('');
  const [sending, setSending] = useState(false);
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [sendViaMetaApi, setSendViaMetaApi] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const filteredConversations = useMemo(() => {
    return data.conversations
      .filter((c) => {
        if (pageFilter !== 'ALL' && c.pageId !== pageFilter) return false;
        if (staffFilter !== 'ALL' && c.assignedToUid !== staffFilter) return false;
        if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
        if (phoneOnly && !c.hasPhone) return false;
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          if (
            !c.customerName.toLowerCase().includes(q) &&
            !c.lastMessage.toLowerCase().includes(q) &&
            !c.pageName.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => toDateObj(b.updatedAt).getTime() - toDateObj(a.updatedAt).getTime());
  }, [data.conversations, pageFilter, staffFilter, statusFilter, phoneOnly, searchTerm]);

  const activeConversation = useMemo(() => {
    if (selectedConversationId) {
      const found = data.conversations.find((c) => c.id === selectedConversationId);
      if (found) return found;
    }
    return filteredConversations[0] || null;
  }, [selectedConversationId, data.conversations, filteredConversations]);

  const activeCustomer = useMemo(() => {
    if (!activeConversation) return null;
    return data.customers.find((c) => c.id === activeConversation.customerId) || null;
  }, [activeConversation, data.customers]);

  useEffect(() => {
    if (!activeConversation || !firebaseUser) {
      setMessages([]);
      return;
    }

    const uid = firebaseUser.uid;
    const isSuper = firebaseUser.email === 'real.htland@gmail.com';
    const msgQuery = isSuper
      ? query(collection(db, 'conversations', activeConversation.id, 'messages'))
      : query(
          collection(db, 'conversations', activeConversation.id, 'messages'),
          where('viewerUids', 'array-contains', uid)
        );

    const unsub = onSnapshot(
      msgQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as MessageItem);
        list.sort((a, b) => toDateObj(a.createdAt).getTime() - toDateObj(b.createdAt).getTime());
        setMessages(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `conversations/${activeConversation.id}/messages`)
    );

    if (activeConversation.unreadCount > 0) {
      updateConversationFields(activeConversation.id, { unreadCount: 0 }).catch(() => {});
    }

    return () => unsub();
  }, [activeConversation?.id, firebaseUser]);

  useEffect(() => {
    if (!activeCustomer || !firebaseUser) {
      setNotes([]);
      return;
    }
    const uid = firebaseUser.uid;
    const isSuper = firebaseUser.email === 'real.htland@gmail.com';
    const notesQuery = isSuper
      ? query(collection(db, 'customers', activeCustomer.id, 'notes'))
      : query(
          collection(db, 'customers', activeCustomer.id, 'notes'),
          where('viewerUids', 'array-contains', uid)
        );

    const unsub = onSnapshot(
      notesQuery,
      (snap) => {
        const list = snap.docs.map((d) => d.data() as CustomerNoteItem);
        list.sort((a, b) => toDateObj(b.createdAt).getTime() - toDateObj(a.createdAt).getTime());
        setNotes(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `customers/${activeCustomer.id}/notes`)
    );
    return () => unsub();
  }, [activeCustomer?.id, firebaseUser]);

  const displayedMessages = useMemo(() => {
    if (!messageSearch.trim()) return messages;
    const q = messageSearch.toLowerCase();
    return messages.filter((m) => m.text.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !firebaseUser) return;
    if (!replyText.trim() && !attachmentUrl.trim()) return;

    setSending(true);
    try {
      const token = await getIdToken();
      await sendConversationReply(
        activeConversation,
        replyText.trim(),
        firebaseUser.uid,
        crmUser?.displayName || 'Nhân viên CRM',
        token,
        sendViaMetaApi,
        attachmentUrl.trim() || undefined,
        attachmentUrl.trim() ? 'image' : undefined
      );
      setReplyText('');
      setAttachmentUrl('');
      setShowAttachmentInput(false);
    } catch (err) {
      pushToast({
        title: 'Gửi tin nhắn thất bại',
        description: err instanceof Error ? err.message : 'Vui lòng kiểm tra kết nối Fanpage.',
        variant: 'error',
      });
    } finally {
      setSending(false);
    }
  };

  const handleRunAiOnConversation = async () => {
    if (!activeConversation || !firebaseUser || messages.length === 0) return;
    setAnalyzingAi(true);
    try {
      const token = await getIdToken();
      const combinedText = messages
        .filter((m) => m.senderType === 'CUSTOMER')
        .map((m) => m.text)
        .join('\n');

      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: combinedText || activeConversation.lastMessage }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'AI phân tích thất bại.');

      await saveAiAnalysisRecord(
        {
          sourceText: combinedText || activeConversation.lastMessage,
          customerName: activeCustomer?.fullName || activeConversation.customerName,
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

      if (activeCustomer) {
        await updateCustomer(
          activeCustomer.id,
          {
            intent: result.intent,
            propertyType: result.property_type || activeCustomer.propertyType || '',
            province: result.province || activeCustomer.province || '',
            district: result.district || activeCustomer.district || '',
            budgetMax: result.budget_max ?? activeCustomer.budgetMax ?? null,
            areaMin: result.area_min ?? activeCustomer.areaMin ?? null,
            areaMax: result.area_max ?? activeCustomer.areaMax ?? null,
            legalRequirement: result.legal_requirement || activeCustomer.legalRequirement || '',
            leadScore: result.lead_score,
            priority: result.priority,
            notesSummary: result.summary,
            primaryPhone: activeCustomer.primaryPhone || result.phone || '',
            phones: Array.from(new Set([...(activeCustomer.phones || []), ...(result.phones || [])])),
          },
          firebaseUser.uid,
          crmUser?.displayName || 'Nhân viên'
        );
      }

      pushToast({
        title: 'AI đã phân tích xong hội thoại',
        description: `Điểm tiềm năng: ${result.lead_score}/100 · ${result.summary}`,
        variant: 'success',
      });
    } catch (err) {
      pushToast({
        title: 'Lỗi AI phân tích',
        description: err instanceof Error ? err.message : 'Không thể phân tích lúc này.',
        variant: 'error',
      });
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !firebaseUser || !noteInput.trim()) return;
    await addCustomerNote(
      activeCustomer.id,
      noteInput.trim(),
      firebaseUser.uid,
      crmUser?.displayName || 'Nhân viên',
      activeCustomer.viewerUids
    );
    setNoteInput('');
    pushToast({ title: 'Đã lưu ghi chú nội bộ', variant: 'success' });
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConversation || !newTagInput.trim()) return;
    const tag = newTagInput.trim();
    const updatedTags = Array.from(new Set([...(activeConversation.tags || []), tag])).slice(0, 10);
    await updateConversationFields(activeConversation.id, { tags: updatedTags });
    if (activeCustomer && firebaseUser) {
      await updateCustomer(
        activeCustomer.id,
        { tags: updatedTags },
        firebaseUser.uid,
        crmUser?.displayName || 'Nhân viên'
      );
    }
    setNewTagInput('');
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[760px] lg:h-[calc(100vh-130px)]">
      {/* Column 1: Conversation List & Filters */}
      <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm tên khách, tin nhắn..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <select
              value={pageFilter}
              onChange={(e) => setPageFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Tất cả Fanpage</option>
              {data.pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="OPEN">Chờ xử lý</option>
              <option value="IN_PROGRESS">Đang tư vấn</option>
              <option value="RESOLVED">Đã xử lý</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-2">
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="flex-1 text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
            >
              <option value="ALL">Mọi nhân viên</option>
              {data.staffDirectory.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.displayName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPhoneOnly((v) => !v)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                phoneOnly
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Có SĐT
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              Không có hội thoại phù hợp bộ lọc.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const selected = activeConversation?.id === conv.id;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => openConversation(conv.id)}
                  className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors cursor-pointer ${
                    selected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <img
                    src={conv.customerAvatar || '/src/assets/images/avatar_crm_consultant_1795074675308.jpg'}
                    alt={conv.customerName}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover shrink-0 bg-slate-200 dark:bg-slate-700"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {conv.customerName}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                        {formatTimestamp(conv.updatedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1 mt-0.5">
                      {conv.lastMessage}
                    </p>
                    <div className="flex items-center justify-between gap-2 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                      <span className="truncate">
                        {conv.pageName} · {conv.assignedToName || 'Chưa chia'}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400 shrink-0">
                          {conv.unreadCount} mới
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Column 2: Message Thread & Reply Box */}
      <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
        {!activeConversation ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Chọn một hội thoại bên trái để bắt đầu tư vấn
            </p>
          </div>
        ) : (
          <>
            {/* Thread Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {activeConversation.customerName}
                  </h3>
                  <button
                    type="button"
                    onClick={() =>
                      updateConversationFields(activeConversation.id, {
                        isImportant: !activeConversation.isImportant,
                      })
                    }
                    title="Đánh dấu quan trọng"
                    className="cursor-pointer"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        activeConversation.isImportant
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {activeConversation.pageName} · ID: {activeConversation.facebookUserId || 'Messenger'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Tìm trong tin nhắn..."
                  className="w-40 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="button"
                  onClick={handleRunAiOnConversation}
                  disabled={analyzingAi}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  {analyzingAi ? 'Đang phân tích...' : 'Phân tích AI'}
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
              {displayedMessages.map((msg) => {
                const isAgent = msg.senderType === 'AGENT';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[78%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isAgent
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {msg.attachmentUrl && (
                        <img
                          src={msg.attachmentUrl}
                          alt="Đính kèm"
                          referrerPolicy="no-referrer"
                          className="rounded-lg max-h-48 object-cover mb-2"
                        />
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      {msg.extractedPhones && msg.extractedPhones.length > 0 && (
                        <p className="mt-1.5 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          Nhận diện SĐT: {msg.extractedPhones.join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                      <span>{msg.senderName}</span>
                      <span>·</span>
                      <span>{formatTimestamp(msg.createdAt)}</span>
                      {isAgent && (
                        <>
                          <span>·</span>
                          <span
                            className={`inline-flex items-center gap-0.5 ${
                              msg.deliveryStatus === 'FAILED'
                                ? 'text-red-500'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {msg.deliveryStatus === 'FAILED' ? (
                              <>
                                <AlertCircle className="w-3 h-3" /> Lỗi gửi
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3" /> {msg.deliveryStatus}
                              </>
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Composer */}
            <form
              onSubmit={handleSendReply}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
            >
              {showAttachmentInput && (
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="url"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    placeholder="Nhập URL ảnh/tệp đính kèm gửi cho khách..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              )}

              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAttachmentInput((v) => !v)}
                  title="Đính kèm ảnh hoặc tệp"
                  className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <textarea
                  rows={2}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                  placeholder="Nhập tin nhắn trả lời khách hàng (Enter để gửi)..."
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 resize-none focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  disabled={sending || (!replyText.trim() && !attachmentUrl.trim())}
                  className="px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'Đang gửi' : 'Gửi'}
                </button>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendViaMetaApi}
                    onChange={(e) => setSendViaMetaApi(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Gửi trực tiếp qua Meta Graph API (yêu cầu Fanpage đã kết nối OAuth)
                </label>
                <span>Nhấn Shift + Enter để xuống dòng</span>
              </div>
            </form>
          </>
        )}
      </div>

      {/* Column 3: Customer CRM Profile, Assignment, Tags & Notes */}
      <div className="lg:col-span-3 flex flex-col min-h-0 overflow-y-auto p-4 space-y-5">
        {!activeCustomer ? (
          <p className="text-xs text-slate-500">Chưa liên kết hồ sơ khách hàng.</p>
        ) : (
          <>
            <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                    {activeCustomer.fullName}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    FB ID: {activeCustomer.facebookId || 'Chưa rõ'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCustomerDetail(activeCustomer.id)}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer shrink-0"
                >
                  Hồ sơ 360°
                </button>
              </div>

              <div className="flex items-center gap-2 text-sm font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                <Phone className="w-3.5 h-3.5" />
                {activeCustomer.primaryPhone || 'Chưa có số điện thoại'}
              </div>
              {activeCustomer.phones && activeCustomer.phones.length > 1 && (
                <p className="text-xs text-slate-500 font-mono">
                  SĐT phụ: {activeCustomer.phones.slice(1).join(', ')}
                </p>
              )}
            </div>

            {/* Demand Summary */}
            <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800 text-xs">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Nhu cầu Bất động sản
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 text-slate-600 dark:text-slate-300">
                <span className="text-slate-400">Phân loại:</span>
                <span className="font-medium text-right">{INTENT_LABELS[activeCustomer.intent]}</span>
                <span className="text-slate-400">Khu vực:</span>
                <span className="font-medium text-right">
                  {[activeCustomer.district, activeCustomer.province].filter(Boolean).join(', ') || 'Chưa rõ'}
                </span>
                <span className="text-slate-400">Ngân sách:</span>
                <span className="font-mono tabular-nums font-medium text-right">
                  {formatVndShort(activeCustomer.budgetMax)}
                </span>
                <span className="text-slate-400">Diện tích:</span>
                <span className="font-mono tabular-nums font-medium text-right">
                  {activeCustomer.areaMin || activeCustomer.areaMax
                    ? `${activeCustomer.areaMin || '?'} - ${activeCustomer.areaMax || '?'} m²`
                    : 'Chưa rõ'}
                </span>
                <span className="text-slate-400">Điểm tiềm năng:</span>
                <span className="font-mono tabular-nums font-bold text-blue-600 dark:text-blue-400 text-right">
                  {activeCustomer.leadScore ?? 50}/100
                </span>
              </div>
            </div>

            {/* Assignment & Care Status */}
            <div className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Trạng thái chăm sóc
                </label>
                <select
                  value={activeCustomer.status}
                  onChange={(e) => {
                    if (!firebaseUser) return;
                    updateCustomer(
                      activeCustomer.id,
                      { status: e.target.value },
                      firebaseUser.uid,
                      crmUser?.displayName || 'Nhân viên'
                    );
                  }}
                  className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {CUSTOMER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                  Nhân viên phụ trách
                </label>
                <div className="flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <select
                    value={activeCustomer.assignedToUid || ''}
                    onChange={(e) => {
                      if (!firebaseUser) return;
                      const staff = data.staffDirectory.find((s) => s.uid === e.target.value);
                      const viewerUids = Array.from(
                        new Set([...(activeCustomer.viewerUids || []), e.target.value].filter(Boolean))
                      );
                      updateCustomer(
                        activeCustomer.id,
                        {
                          assignedToUid: e.target.value,
                          assignedToName: staff?.displayName || 'Nhân viên',
                          viewerUids,
                        },
                        firebaseUser.uid,
                        crmUser?.displayName || 'Nhân viên'
                      );
                      if (activeConversation) {
                        updateConversationFields(activeConversation.id, {
                          assignedToUid: e.target.value,
                          assignedToName: staff?.displayName || 'Nhân viên',
                          viewerUids,
                        });
                      }
                      pushToast({ title: 'Đã chuyển phân công khách hàng', variant: 'success' });
                    }}
                    className="flex-1 text-xs px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="">-- Chưa phân công --</option>
                    {data.staffDirectory.map((s) => (
                      <option key={s.uid} value={s.uid}>
                        {s.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2 pb-4 border-b border-slate-200 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Thẻ phân loại</p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {(activeCustomer.tags && activeCustomer.tags.length > 0
                  ? activeCustomer.tags.join(' · ')
                  : 'Chưa gắn thẻ')}
              </p>
              <form onSubmit={handleAddTag} className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Gắn thẻ mới..."
                  className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950"
                />
                <button
                  type="submit"
                  className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Thêm
                </button>
              </form>
            </div>

            {/* Internal Notes */}
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Ghi chú nội bộ</p>
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  rows={2}
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Thêm ghi chú chăm sóc khách..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 resize-none"
                />
                <button
                  type="submit"
                  disabled={!noteInput.trim()}
                  className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                >
                  Lưu ghi chú
                </button>
              </form>

              <div className="space-y-2 pt-1">
                {notes.map((n) => (
                  <div
                    key={n.id}
                    className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1"
                  >
                    <p className="text-xs text-slate-800 dark:text-slate-200">{n.content}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {n.authorName} · {formatTimestamp(n.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
