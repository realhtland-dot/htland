import React, { useState } from 'react';
import { Calendar, CheckCircle2, Home, MapPin, Plus, Trash2, X } from 'lucide-react';
import type { CrmDataset } from '../hooks/useCrmData.ts';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';
import {
  deleteProperty,
  saveAppointment,
  saveProperty,
  saveTask,
  updateAppointmentStatus,
  updateTaskStatus,
} from '../services/crmActions.ts';
import type { AppointmentItem, LeadPriority, PropertyItem, TaskItem } from '../types/crm.ts';
import { formatVndShort } from '../utils/format.ts';

export const TasksView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { pushToast, openCustomerDetail } = useCrmStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customerId: data.customers[0]?.id || '',
    title: '',
    taskType: 'CALL' as TaskItem['taskType'],
    dueDate: '2026-11-20 09:00',
    priority: 'HIGH' as LeadPriority,
    notes: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const cust = data.customers.find((c) => c.id === form.customerId);
    await saveTask(
      {
        customerId: form.customerId,
        customerName: cust?.fullName || 'Khách hàng',
        title: form.title.trim(),
        taskType: form.taskType,
        dueDate: form.dueDate,
        priority: form.priority,
        status: 'PENDING',
        assignedToUid: firebaseUser.uid,
        assignedToName: crmUser?.displayName || 'Nhân viên',
        notes: form.notes.trim(),
      },
      firebaseUser.uid
    );
    setShowModal(false);
    setForm({ ...form, title: '', notes: '' });
    pushToast({ title: 'Đã tạo công việc chăm sóc mới', variant: 'success' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Quản lý công việc chăm sóc</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Nhắc lịch gọi điện, nhắn tin Messenger và theo dõi tiến độ tư vấn khách hàng
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Tạo lịch chăm sóc
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
        {data.tasks.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">Chưa có công việc chăm sóc nào.</p>
        ) : (
          data.tasks.map((task) => (
            <div key={task.id} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={task.status === 'COMPLETED'}
                    onClick={() => updateTaskStatus(task.id, 'COMPLETED')}
                    className={`cursor-pointer ${
                      task.status === 'COMPLETED'
                        ? 'text-emerald-600'
                        : 'text-slate-300 hover:text-blue-600'
                    }`}
                    title="Đánh dấu hoàn thành"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <p
                    className={`text-sm font-semibold ${
                      task.status === 'COMPLETED' ? 'line-through text-slate-400' : ''
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                <p className="text-xs text-slate-500 pl-7">
                  Khách hàng:{' '}
                  <button
                    type="button"
                    onClick={() => openCustomerDetail(task.customerId)}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    {task.customerName}
                  </button>{' '}
                  · Loại: {task.taskType} · Hạn: <span className="font-mono">{task.dueDate}</span> · Phụ trách: {task.assignedToName}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span
                  className={
                    task.priority === 'HIGH'
                      ? 'text-red-600 dark:text-red-400 font-semibold'
                      : 'text-slate-500'
                  }
                >
                  {task.priority}
                </span>
                <span
                  className={
                    task.status === 'COMPLETED'
                      ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-amber-600 dark:text-amber-400 font-semibold'
                  }
                >
                  {task.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Thêm công việc chăm sóc</h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Khách hàng</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName} ({c.primaryPhone || 'Chưa có SĐT'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Nội dung công việc *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Gọi điện tư vấn lô Củ Chi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1">Loại tác vụ</label>
                  <select
                    value={form.taskType}
                    onChange={(e) => setForm({ ...form, taskType: e.target.value as TaskItem['taskType'] })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                  >
                    <option value="CALL">Gọi điện</option>
                    <option value="MESSAGE">Nhắn tin</option>
                    <option value="FOLLOW_UP">Theo dõi</option>
                    <option value="SEND_INFO">Gửi sổ / Bảng giá</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1">Thời gian nhắc</label>
                  <input
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Lưu công việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const AppointmentsView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser, crmUser } = useAuth();
  const { pushToast } = useCrmStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    customerId: data.customers[0]?.id || '',
    propertyId: data.properties[0]?.id || '',
    location: '',
    scheduledAt: '2026-11-22 09:30',
    notes: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    const cust = data.customers.find((c) => c.id === form.customerId);
    const prop = data.properties.find((p) => p.id === form.propertyId);
    await saveAppointment(
      {
        customerId: form.customerId,
        customerName: cust?.fullName || 'Khách hàng',
        propertyId: prop?.id || '',
        propertyTitle: prop?.title || '',
        location: form.location.trim(),
        scheduledAt: form.scheduledAt,
        status: 'SCHEDULED',
        assignedToUid: firebaseUser.uid,
        assignedToName: crmUser?.displayName || 'Nhân viên',
        notes: form.notes.trim(),
      },
      firebaseUser.uid
    );
    setShowModal(false);
    setForm({ ...form, location: '', notes: '' });
    pushToast({ title: 'Đã đặt lịch hẹn dẫn khách xem BĐS', variant: 'success' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Lịch hẹn khách hàng</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Quản lý lịch gặp mặt và dẫn khách đi xem thực tế sản phẩm bất động sản
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Đặt lịch hẹn mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.appointments.map((appt) => (
          <div
            key={appt.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                  {appt.customerName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-mono tabular-nums">{appt.scheduledAt}</span>
                </p>
              </div>
              <select
                value={appt.status}
                disabled={appt.status === 'COMPLETED' || appt.status === 'CANCELLED'}
                onChange={(e) =>
                  updateAppointmentStatus(appt.id, e.target.value as AppointmentItem['status'])
                }
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
              >
                <option value="SCHEDULED">Đã lên lịch</option>
                <option value="CONFIRMED">Đã xác nhận</option>
                <option value="COMPLETED">Hoàn thành</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            {appt.propertyTitle && (
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                Sản phẩm: {appt.propertyTitle}
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              {appt.location}
            </p>
            {appt.notes && <p className="text-xs text-slate-500">{appt.notes}</p>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Đặt lịch hẹn xem BĐS</h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Khách hàng</label>
                <select
                  required
                  value={form.customerId}
                  onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  {data.customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Sản phẩm bất động sản</label>
                <select
                  value={form.propertyId}
                  onChange={(e) => setForm({ ...form, propertyId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="">-- Không chọn cụ thể --</option>
                  {data.properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium mb-1">Địa điểm hẹn *</label>
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Ngã tư Tân Thông Hội, Củ Chi..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Thời gian hẹn</label>
                <input
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Lưu lịch hẹn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export const PropertiesView: React.FC<{ data: CrmDataset }> = ({ data }) => {
  const { firebaseUser } = useAuth();
  const { pushToast } = useCrmStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    code: '',
    title: '',
    propertyType: 'LAND' as PropertyItem['propertyType'],
    transactionType: 'SELL' as PropertyItem['transactionType'],
    province: 'TP.HCM',
    district: 'Củ Chi',
    areaSqm: '100',
    priceVnd: '1000000000',
    legalStatus: 'Sổ hồng riêng',
    description: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;
    await saveProperty(
      {
        code: form.code.trim() || `BDS-${Date.now().toString().slice(-4)}`,
        title: form.title.trim(),
        propertyType: form.propertyType,
        transactionType: form.transactionType,
        province: form.province.trim(),
        district: form.district.trim(),
        areaSqm: Number(form.areaSqm) || 100,
        priceVnd: Number(form.priceVnd) || 0,
        legalStatus: form.legalStatus.trim(),
        status: 'AVAILABLE',
        imageUrl: '/src/assets/images/property_land_cuchi_1795074676243.jpg',
        description: form.description.trim(),
      },
      firebaseUser.uid
    );
    setShowModal(false);
    setForm({ ...form, code: '', title: '', description: '' });
    pushToast({ title: 'Đã thêm sản phẩm bất động sản mới', variant: 'success' });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold">Quản lý sản phẩm bất động sản</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Kho hàng đất nền, nhà phố, căn hộ để nhân viên đối chiếu nhu cầu khách hàng từ Messenger
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Thêm bất động sản
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {data.properties.map((prop) => (
          <div
            key={prop.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col"
          >
            <div className="relative h-44 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
              {prop.imageUrl ? (
                <img
                  src={prop.imageUrl}
                  alt={prop.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Home className="w-8 h-8 text-slate-400" />
              )}
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                  <span>{prop.code}</span>
                  <span
                    className={
                      prop.status === 'AVAILABLE'
                        ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                        : 'text-amber-600 dark:text-amber-400 font-semibold'
                    }
                  >
                    {prop.status === 'AVAILABLE' ? 'Đang mở bán' : prop.status === 'RESERVED' ? 'Đang giữ chỗ' : 'Đã bán'}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 line-clamp-2">
                  {prop.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {prop.district}, {prop.province} · {prop.areaSqm} m² · {prop.legalStatus}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-base font-display font-bold tabular-nums text-blue-600 dark:text-blue-400">
                  {formatVndShort(prop.priceVnd)}
                </span>
                <button
                  type="button"
                  onClick={() => deleteProperty(prop.id)}
                  title="Xóa sản phẩm"
                  className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Thêm sản phẩm bất động sản</h3>
              <button type="button" onClick={() => setShowModal(false)} className="cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Mã sản phẩm</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="BDS-CC-108"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Loại hình</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => setForm({ ...form, propertyType: e.target.value as PropertyItem['propertyType'] })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                >
                  <option value="LAND">Đất nền</option>
                  <option value="HOUSE">Nhà phố</option>
                  <option value="APARTMENT">Căn hộ</option>
                  <option value="VILLA">Biệt thự</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block font-medium mb-1">Tiêu đề sản phẩm *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Tỉnh / TP</label>
                <input
                  required
                  value={form.province}
                  onChange={(e) => setForm({ ...form, province: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Quận / Huyện</label>
                <input
                  required
                  value={form.district}
                  onChange={(e) => setForm({ ...form, district: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Diện tích (m²)</label>
                <input
                  type="number"
                  required
                  value={form.areaSqm}
                  onChange={(e) => setForm({ ...form, areaSqm: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Giá bán (VND)</label>
                <input
                  type="number"
                  required
                  value={form.priceVnd}
                  onChange={(e) => setForm({ ...form, priceVnd: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
                >
                  Lưu bất động sản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
