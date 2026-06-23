import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getHomeRoute } from '@/config/roles';

/**
 * Shown when an authenticated user tries to reach a panel/page their role is
 * not permitted to access. Offers a way back to their own panel.
 */
const Unauthorized: React.FC = () => {
  const navigate = useNavigate();
  const { role, logout } = useAuth();
  const home = getHomeRoute(role);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <ShieldAlert className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to view this page. If you believe this is a
            mistake, please contact an administrator.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {home && (
            <Button onClick={() => navigate(home, { replace: true })}>
              Go to my dashboard
            </Button>
          )}
          <Button variant="ghost" onClick={logout}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Unauthorized;
