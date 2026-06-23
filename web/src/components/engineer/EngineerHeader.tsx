
import React from 'react';
import { Sun, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EngineerUser {
  name?: string;
  email?: string;
  role?: string;
}

interface EngineerHeaderProps {
  user: EngineerUser | null;
}

/** Turns a role slug like "project_engineer" into "Project Engineer". */
const formatRole = (role?: string) =>
  role
    ? role
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Engineer';

const EngineerHeader: React.FC<EngineerHeaderProps> = ({ user }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 shadow-lg py-3 px-4">
      <div className="container-custom flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Solar Maps</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-500 text-white border-emerald-400">
            Engineer
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-emerald-700"
            onClick={() => window.open('/', '_blank')}
          >
            <Home size={16} className="mr-2" />
            View Site
          </Button>

          <div className="flex items-center gap-3 border-l border-emerald-400 pl-4">
            <div className="text-right hidden md:block">
              <p className="text-white text-sm font-medium">{user?.name || user?.email}</p>
              <p className="text-emerald-200 text-xs">{formatRole(user?.role)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EngineerHeader;
