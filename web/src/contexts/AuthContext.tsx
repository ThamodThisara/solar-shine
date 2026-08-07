import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { getCurrentUser, AuthUser, loginAdmin, logoutAdmin, registerAdmin } from '@/services/authService';
import { toast } from 'sonner';
import { ENGINEER_ROLES } from '@/config/roles';
import { fetchRoles, fetchDepartments } from '@/services/roleService';
import { client, DATABASE_ID } from '@/lib/appwrite';

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
  permissions: string[];
  departmentName: string | null;
  /**
   * Slug of the department the user's role belongs to (e.g. "engineering"), used
   * to resolve department-scoped folder access. Null when the role is not mapped
   * to a department.
   */
  departmentSlug: string | null;
  /** Returns true when the current user's role is one of `roles`. */
  hasRole: (roles: string[]) => boolean;
  /** Returns true when the current user has the specified permission. */
  hasPermission: (permission: string) => boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const [departmentSlug, setDepartmentSlug] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applyDepartment = (dept: { name: string; slug: string } | null | undefined) => {
    setDepartmentName(dept ? dept.name : null);
    setDepartmentSlug(dept ? dept.slug : null);
  };

  // Helper to load permissions for a role
  const loadPermissionsForRole = async (userRole: string) => {
    try {
      const [roles, depts] = await Promise.all([fetchRoles(), fetchDepartments()]);
      const matchedRole = roles.find((r) => r.slug === userRole);
      if (matchedRole) {
        setPermissions(matchedRole.permissions);
        const matchedDept = depts.find(
          (d) =>
            d.$id === matchedRole.department_id ||
            d.slug === matchedRole.department_id ||
            `dept_${d.slug}` === matchedRole.department_id
        );
        applyDepartment(matchedDept);
      } else {
        setPermissions([]);
        applyDepartment(null);
      }
    } catch (error) {
      console.warn('Failed to fetch dynamic roles or departments:', error);
      setPermissions([]);
      applyDepartment(null);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userRole = currentUser.role ?? 'user';
          setUser({ ...currentUser, role: userRole });
          await loadPermissionsForRole(userRole);
        } else {
          setUser(null);
          setPermissions([]);
          applyDepartment(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        setPermissions([]);
        applyDepartment(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Set up Appwrite Realtime Subscription for dynamic permissions updates
  useEffect(() => {
    if (!user?.role) return;

    // Realtime channel for roles collection
    const channel = `databases.${DATABASE_ID}.collections.roles.documents`;
    
    const unsubscribe = client.subscribe(channel, async (response) => {
      const roleDoc = response.payload as any;
      
      // If the updated role is the logged-in user's role, update their permissions in real-time
      if (roleDoc.slug === user.role) {
        if (response.events.some((ev) => ev.includes('.update'))) {
          setPermissions(roleDoc.permissions || []);
          try {
            const depts = await fetchDepartments();
            const matchedDept = depts.find(
              (d) =>
                d.$id === roleDoc.department_id ||
                d.slug === roleDoc.department_id ||
                `dept_${d.slug}` === roleDoc.department_id
            );
            applyDepartment(matchedDept);
          } catch (e) {
            console.warn('Failed to fetch departments on realtime update:', e);
          }
          toast.info('Permissions updated', {
            description: 'Your permissions have been updated in real-time by an administrator.',
          });
        }
      }
    });

    return () => unsubscribe();
  }, [user?.role]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const { user: authUser, error } = await loginAdmin({ email, password });
      
      if (error || !authUser) {
        toast.error(error || 'Login failed');
        return false;
      }

      const userRole = authUser.role ?? 'user';
      setUser({ ...authUser, role: userRole });
      await loadPermissionsForRole(userRole);
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
      
      const userRole = authUser.role ?? 'user';
      setUser({ ...authUser, role: userRole });
      await loadPermissionsForRole(userRole);
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
      setPermissions([]);
      applyDepartment(null);
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role ?? null;
  const isAdmin = role === 'admin';

  const hasPermission = (permission: string): boolean => {
    if (isAdmin) return true; // Admins have bypass permissions for everything
    return permissions.includes(permission);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        role,
        isAdmin,
        isEngineer: !!role && ENGINEER_ROLES.includes(role),
        permissions,
        departmentName,
        departmentSlug,
        hasRole: (roles: string[]) => !!role && roles.includes(role),
        hasPermission,
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

