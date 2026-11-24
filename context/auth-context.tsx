'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AuthUser, SystemAuthRole } from '@/types';
import { INITIAL_RESEARCHERS } from '@/data/initial-mock-data';

const AUTH_DEMO_ROLE_STORAGE_KEY = 'ehsan_auth_demo_role_v1';

const tarekProfile = INITIAL_RESEARCHERS.find((r) => r.id === 'res-03');

/**
 * بيانات الحسابات التجريبية المطابقة تماماً لبنية Supabase Auth + profiles
 * لاحقاً: يتم استبدال هذا المصدر باستدعاء supabase.auth.getSession() و profiles table
 */
export const DEMO_AUTH_USERS: Record<SystemAuthRole, AuthUser> = {
  admin: {
    id: 'auth-admin-01',
    email: 'ahmed.elgazzar@ehsan-initiative.org',
    name: 'أحمد الجزار',
    role: 'admin',
    title: 'مدير المنظومة',
    badgeLabel: 'مدير المنظومة',
    avatarInitial: 'أ',
    researcherId: null,
  },
  researcher: {
    id: 'auth-res-03',
    email: tarekProfile?.email || 'tarek.elmenshawy@ehsan-initiative.org',
    name: tarekProfile?.name || 'د. طارق المنشاوي',
    role: 'researcher',
    title: 'باحث ميداني',
    badgeLabel: 'باحث ميداني',
    avatarInitial: 'ط',
    researcherId: tarekProfile?.id || 'res-03',
    assignedDistricts: tarekProfile?.assignedDistricts || [
      'القليوبية (شبرا الخيمة)',
      'الجيزة (الوراق)',
      'فيصل',
    ],
  },
};

export interface AuthContextValue {
  user: AuthUser;
  role: SystemAuthRole;
  isLoading: boolean;
  isAuthReady: boolean;
  isDemoMode: boolean;
  demoUsers: Record<SystemAuthRole, AuthUser>;
  switchDemoUser: (nextRole: SystemAuthRole) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // قيمة مبدئية موحدة بين الخادم والعميل لمنع أي Hydration Mismatch
  const [role, setRole] = useState<SystemAuthRole>('admin');
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem(AUTH_DEMO_ROLE_STORAGE_KEY);
      if (savedRole === 'admin' || savedRole === 'researcher') {
        setRole(savedRole);
      }
    } catch (err) {
      console.warn('Failed to restore demo auth role:', err);
    } finally {
      setIsAuthReady(true);
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const switchDemoUser = useCallback((nextRole: SystemAuthRole) => {
    setRole(nextRole);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(AUTH_DEMO_ROLE_STORAGE_KEY, nextRole);
      }
    } catch (err) {
      console.warn('Failed to persist demo auth role:', err);
    }
  }, []);

  const user = DEMO_AUTH_USERS[role];

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role,
      isLoading: !isAuthReady,
      isAuthReady,
      isDemoMode: true,
      demoUsers: DEMO_AUTH_USERS,
      switchDemoUser,
    }),
    [user, role, isAuthReady, switchDemoUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
