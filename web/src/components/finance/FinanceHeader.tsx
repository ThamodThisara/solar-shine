import React from 'react';
import { Home, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import NotificationBell from '../layout/NotificationBell';

interface FinanceUser {
  name?: string;
  email?: string;
  role?: string;
}

interface FinanceHeaderProps {
  user: FinanceUser | null;
  /** Opens the off-canvas navigation drawer on mobile/tablet. */
  onMenuClick?: () => void;
}

const FinanceHeader: React.FC<FinanceHeaderProps> = ({ user, onMenuClick }) => {
  return (
    <div className="bg-gradient-to-r from-amber-600 to-amber-800 shadow-lg py-3 px-4">
      <div className="w-full max-w-[1440px] mx-auto flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile/tablet: open navigation drawer */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-amber-700 px-2 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <img src="/Solar%20Maps%20logo.png" alt="Solar Maps" className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 object-contain" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Solar Maps</h1>
            </div>
          </div>
          <Badge variant="secondary" className="bg-amber-500 text-white border-amber-400 hidden sm:inline-flex">
            Finance
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-amber-700 px-2 sm:px-3"
            onClick={() => window.open('/', '_blank')}
          >
            <Home size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">View Site</span>
          </Button>

          <NotificationBell />

          <div className="flex items-center gap-3 border-l border-amber-400 pl-4">
            <div className="text-right hidden md:block">
              <p className="text-white text-sm font-medium">{user?.name || user?.email}</p>
              <p className="text-amber-200 text-xs">Finance Manager</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceHeader;
