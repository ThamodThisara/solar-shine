
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/config/roles';
import Unauthorized from './Unauthorized';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Roles permitted to access this route. When omitted, any authenticated user
   * is allowed. Authenticated users whose role is not listed are shown the
   * Unauthorized page (rather than being silently redirected) so that direct
   * URL access to another panel is clearly denied.
   */
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, hasRole, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Unauthorized />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
