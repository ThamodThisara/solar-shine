
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getCurrentUser, AuthUser, loginAdmin, logoutAdmin, registerAdmin } from '@/services/authService';
import { toast } from 'sonner';
import { ENGINEER_ROLES, LOGIN_ALLOWED_ROLES } from '@/config/roles';

interface UserProfile extends AuthUser {
  role: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** The authenticated user's role, or null when signed out. */
  role: string | null;
  isAdmin: boolean;
  isEngineer: boolean;
  /** Returns true when the current user's role is one of `roles`. */
  hasRole: (roles: string[]) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({ ...currentUser, role: currentUser.role ?? 'user' });
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { user: authUser, error } = await loginAdmin({ email, password });
      
      if (error || !authUser) {
        toast.error(error || 'Login failed');
        return false;
      }

      if (!authUser.role || !LOGIN_ALLOWED_ROLES.includes(authUser.role)) {
        await logoutAdmin();
        setUser(null);
        toast.error('You do not have permission to access this portal');
        return false;
      }

      setUser({ ...authUser, role: authUser.role });
      toast.success('Login successful');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { user: authUser, error } = await registerAdmin({ name, email, password });
      
      if (error || !authUser) {
        toast.error(error || 'Registration failed');
        return false;
      }
      
      setUser({ ...authUser, role: authUser.role ?? 'user' });
      toast.success('Registration successful');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const { error } = await logoutAdmin();
      
      if (error) {
        toast.error(error);
      }
      
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role,
        isAdmin: role === 'admin',
        isEngineer: !!role && ENGINEER_ROLES.includes(role),
        hasRole: (roles: string[]) => !!role && roles.includes(role),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
