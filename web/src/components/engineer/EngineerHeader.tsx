
import React from 'react';
import { Sun, Home, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface EngineerUser {
  name?: string;
  email?: string;
  role?: string;
}

interface EngineerHeaderProps {
  user: EngineerUser | null;
  /** Opens the off-canvas navigation drawer on mobile/tablet. */
  onMenuClick?: () => void;
}

/** Turns a role slug like "project_engineer" into "Project Engineer". */
const formatRole = (role?: string) =>
  role
    ? role
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Engineer';

const EngineerHeader: React.FC<EngineerHeaderProps> = ({ user, onMenuClick }) => {
  return (
    <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 shadow-lg py-3 px-4">
      <div className="container-custom flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile/tablet: open navigation drawer */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-emerald-700 px-2 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Sun className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-300 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Solar Maps</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-emerald-500 text-white border-emerald-400 hidden sm:inline-flex">
            Engineer
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-emerald-700 px-2 sm:px-3"
            onClick={() => window.open('/', '_blank')}
          >
            <Home size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">View Site</span>
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
