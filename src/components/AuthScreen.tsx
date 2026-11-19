import React, { useState } from 'react';
import { ArrowLeft, Building2, KeyRound, Mail, MessageSquare, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../services/authContext.tsx';
import { useCrmStore } from '../store/useCrmStore.ts';

export const AuthScreen: React.FC = () => {
  const { signInWithGoogle, loginError } = useAuth();
  const { theme, toggleTheme } = useCrmStore();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySubmitted, setRecoverySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryEmail.trim()) return;
    setRecoverySubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between p-6 lg:p-10">
      <div className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Realty Messenger CRM
          </span>
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? 'Giao diện Sáng' : 'Giao diện Tối'}
        </button>
      </div>

      <main className="max-w-6xl w-full mx-auto my-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 pr-0 lg:pr-8">
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
            Nền tảng quản trị hội thoại Messenger đa Fanpage cho doanh nghiệp Bất động sản
          </p>
          <h1 className="text-3xl lg:text-4xl font-display font-bold text-slate-900 dark:text-slate-50 leading-tight text-balance">
            Tập trung tin nhắn Fanpage, tự động trích xuất số điện thoại và phân tích nhu cầu khách hàng bằng AI
          </h1>
          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
            Kết nối trực tiếp Meta Messenger Platform, đồng bộ hội thoại theo thời gian thực, phân công khách hàng tự động cho đội ngũ Sale và lưu trữ dữ liệu bảo mật theo phân quyền RBAC.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Hộp thư 3 cột đa Page
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Quản lý tập trung mọi Fanpage, lọc SĐT và phân công nhân viên tức thì.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                AI Bất động sản
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Chuẩn hóa khu vực, ngân sách, diện tích, pháp lý và điểm tiềm năng.
              </p>
            </div>
            <div className="pt-4 space-y-1.5">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-sm">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Bảo mật phân quyền
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Kiểm soát truy cập 4 cấp vai trò và nhật ký thao tác chi tiết.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 flex items-center">
          <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 space-y-6">
            {mode === 'login' ? (
              <>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50">
                    Đăng nhập hệ thống CRM
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Xác thực tài khoản Google Workspace hoặc quản trị viên để truy cập dữ liệu.
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                    {loginError}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81Z" />
                  </svg>
                  {submitting ? 'Đang xác thực...' : 'Đăng nhập với tài khoản Google'}
                </button>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Gặp sự cố truy cập tài khoản?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setRecoverySubmitted(false);
                    }}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    Quên mật khẩu / Khôi phục
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-2 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Quay lại đăng nhập
                  </button>
                  <h2 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Khôi phục quyền truy cập
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Nhập email công việc đã đăng ký để nhận hướng dẫn đặt lại mật khẩu Google hoặc liên hệ Super Admin.
                  </p>
                </div>

                {recoverySubmitted ? (
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                    <p className="font-semibold">Đã ghi nhận yêu cầu khôi phục</p>
                    <p>
                      Vì hệ thống sử dụng xác thực Google OAuth bảo mật 2 lớp, vui lòng truy cập{' '}
                      <span className="font-mono">accounts.google.com/signin/recovery</span> cho email{' '}
                      <span className="font-semibold">{recoveryEmail}</span> hoặc yêu cầu Super Admin cấp lại quyền truy cập.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                        Email tài khoản CRM
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          required
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          placeholder="nhanvien@congtybds.vn"
                          className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors cursor-pointer"
                    >
                      Gửi yêu cầu khôi phục
                    </button>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 dark:border-slate-800 pt-4">
        <span>Realty Messenger CRM · Quản lý tin nhắn đa Fanpage &amp; Khách hàng Bất động sản</span>
        <span>Tuân thủ chính sách Meta Messenger Platform &amp; Bảo mật dữ liệu cá nhân</span>
      </footer>
    </div>
  );
};
