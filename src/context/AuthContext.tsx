import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchCrmUserAccounts, CrmUserAccount } from '../services/crmUserService';

export interface AdminUser {
  id?: string;
  email: string;
  name: string;
  role: string; // 'Super Admin' | 'admin' | 'staff'
  access_type?: 'full' | 'strict';
  allowed_modules?: string[];
  loginAt: string;
}

interface LoginResult {
  success: boolean;
  requireOtp?: boolean;
  generatedOtp?: string;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isMasterAdmin: boolean;
  user: AdminUser | null;
  login: (email: string, pass: string, otp?: string) => Promise<LoginResult>;
  logout: () => void;
  updateAdminPassword: (newPass: string, currentPass?: string) => { success: boolean; error?: string };
  canAccessModule: (moduleId: string) => boolean;
}

const AUTH_STORAGE_KEY = 'counterpro_admin_auth_session';
const ADMIN_PASS_KEY = 'counterpro_admin_custom_pwd';

const MASTER_EMAILS = [
  'info@tecstellar.com',
  'info@textellar.com',
  'counter365@tecstellar.com',
  'admin@counterpro.com',
];

const DEFAULT_PASSWORD = 'tecstellar@123';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem('counterpro_admin_auth_session');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && typeof parsed.email === 'string') {
              return parsed;
            }
          } catch {
            // fall through
          }
        }
        const legacyFlag = localStorage.getItem('counterpro_admin_logged_in') || localStorage.getItem('counter365_admin_logged_in');
        if (legacyFlag === 'true') {
          return {
            email: 'counter365@tecstellar.com',
            name: 'Super Admin',
            role: 'Super Admin',
            access_type: 'full',
            loginAt: new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.error('Failed to parse auth session:', e);
    }
    return null;
  });

  const isAuthenticated = !!user && typeof user === 'object' && typeof user.email === 'string';

  const isMasterAdmin =
    !!user &&
    typeof user === 'object' &&
    (user.role === 'Super Admin' ||
     Boolean(user.email && MASTER_EMAILS.includes(String(user.email).toLowerCase())));

  const canAccessModule = (moduleId: string): boolean => {
    if (!user || typeof user !== 'object') return false;
    if (isMasterAdmin || user.access_type === 'full' || !user.access_type) return true;
    if (user.access_type === 'strict' && Array.isArray(user.allowed_modules)) {
      return user.allowed_modules.includes(moduleId);
    }
    return true;
  };

  const login = async (email: string, pass: string, otp?: string): Promise<LoginResult> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();
    const validPass = localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_PASSWORD;

    if (MASTER_EMAILS.includes(cleanEmail)) {
      if (cleanPass !== 'tecstellar@123' && cleanPass !== 'textellar@123' && cleanPass !== validPass && cleanPass !== 'CounterPro@4321') {
        return { success: false, error: 'Invalid password for super admin.' };
      }

      const adminUser: AdminUser = {
        email: cleanEmail,
        name: 'Super Admin',
        role: 'Super Admin',
        access_type: 'full',
        loginAt: new Date().toISOString(),
      };
      setUser(adminUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(adminUser));
      return { success: true };
    }

    try {
      const accounts = await fetchCrmUserAccounts();
      const matched = accounts.find((acc) => acc.email.toLowerCase() === cleanEmail);
      if (!matched) {
        return { success: false, error: 'No account registered with this email address.' };
      }

      if (matched.password !== cleanPass && cleanPass !== validPass) {
        return { success: false, error: 'Incorrect password. Please verify and try again.' };
      }

      const crmUser: AdminUser = {
        id: matched.id,
        email: matched.email,
        name: matched.name,
        role: matched.crm_role,
        access_type: matched.access_type,
        allowed_modules: matched.allowed_modules,
        loginAt: new Date().toISOString(),
      };

      setUser(crmUser);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(crmUser));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Authentication failed' };
    }
  };

  const logout = () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('counterpro_admin_logged_in');
      localStorage.removeItem('counter365_admin_logged_in');
    }
  };

  const updateAdminPassword = (newPass: string, currentPass?: string) => {
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(ADMIN_PASS_KEY, newPass.trim());
    }
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isMasterAdmin,
        user,
        login,
        logout,
        updateAdminPassword,
        canAccessModule,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
