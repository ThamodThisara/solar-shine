
import React from 'react';
import {  Sun, Home, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthUser } from '@/services/authService';
import { Badge } from '@/components/ui/badge';
import NotificationBell from '../layout/NotificationBell';

interface AdminHeaderProps {
  user: AuthUser | null;
  onLogout?: () => Promise<void>;
  /** Opens the off-canvas navigation drawer on mobile/tablet. */
  onMenuClick?: () => void;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user, onMenuClick }) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg py-3 px-4">
      <div className="w-full max-w-[1440px] mx-auto flex justify-between items-center gap-2">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Mobile/tablet: open navigation drawer */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700 px-2 lg:hidden"
            onClick={onMenuClick}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Sun className="h-7 w-7 sm:h-8 sm:w-8 text-yellow-300 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">Solar Maps</h1>
              {/* <p className="text-blue-100 text-xs">Admin Dashboard</p> */}
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-500 text-white border-blue-400 hidden sm:inline-flex">
            Admin
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-blue-700 px-2 sm:px-3"
            onClick={() => window.open('/', '_blank')}
          >
            <Home size={16} className="sm:mr-2" />
            <span className="hidden sm:inline">View Site</span>
          </Button>

          <NotificationBell />
          
          <div className="flex items-center gap-3 border-l border-blue-400 pl-4">
            <div className="text-right hidden md:block">
              <p className="text-white text-sm font-medium">{user?.name || user?.email}</p>
              <p className="text-blue-200 text-xs">Administrator</p>
            </div>
            {/* <Button 
              variant="outline" 
              size="sm" 
              className="text-white border-white hover:bg-white hover:text-blue-800"
              onClick={onLogout}
            >
              <LogOut size={16} className="mr-2" />
              Logout
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
