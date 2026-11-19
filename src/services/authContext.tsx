import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, googleAuthProvider } from '../lib/firebase.ts';
import type { CrmUser, UserRole } from '../types/crm.ts';
import { seedWorkspaceIfEmpty } from './seed.ts';

interface AuthContextValue {
  firebaseUser: User | null;
  crmUser: CrmUser | null;
  authReady: boolean;
  loginError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [crmUser, setCrmUser] = useState<CrmUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (!user) {
        setCrmUser(null);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);

        const defaultRole: UserRole =
          user.email === 'real.htland@gmail.com' ? 'SUPER_ADMIN' : 'SALE';

        if (!snap.exists()) {
          const newUserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || user.email?.split('@')[0] || 'Nhân viên CRM',
            role: defaultRole,
            teamId: 'team_tay_bac_sg',
            phone: '',
            status: 'ACTIVE' as const,
            avatarUrl: user.photoURL || '/src/assets/images/avatar_crm_consultant_1795074675308.jpg',
            assignedPageIds: [],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newUserProfile);

          await setDoc(doc(db, 'staff_directory', user.uid), {
            uid: user.uid,
            displayName: newUserProfile.displayName,
            role: newUserProfile.role,
            teamId: 'team_tay_bac_sg',
            status: 'ACTIVE',
            avatarUrl: newUserProfile.avatarUrl,
            viewerUids: [user.uid],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setCrmUser(newUserProfile);
          if (newUserProfile.role === 'SUPER_ADMIN') {
            await seedWorkspaceIfEmpty(user.uid, newUserProfile.displayName);
          }
        } else {
          const data = snap.data() as CrmUser;
          setCrmUser(data);
          if (data.role === 'SUPER_ADMIN' || data.role === 'ADMIN' || user.email === 'real.htland@gmail.com') {
            await seedWorkspaceIfEmpty(user.uid, data.displayName || 'Nhân viên CRM');
          }
        }
      } catch (err) {
        console.error('Failed to sync CRM user profile:', err);
        setLoginError(err instanceof Error ? err.message : 'Lỗi đồng bộ hồ sơ tài khoản.');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại.';
      setLoginError(msg);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        crmUser,
        authReady,
        loginError,
        signInWithGoogle,
        logout,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
