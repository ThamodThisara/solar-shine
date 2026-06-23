
import React from 'react';
import {  Sun, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthUser } from '@/services/authService';
import { Badge } from '@/components/ui/badge';

interface AdminHeaderProps {
  user: AuthUser | null;
  onLogout?: () => Promise<void>;
}

const AdminHeader: React.FC<AdminHeaderProps> = ({ user }) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 shadow-lg py-3 px-4">
      <div className="container-custom flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Sun className="h-8 w-8 text-yellow-300" />
            <div>
              <h1 className="text-xl font-bold text-white">Solar Maps</h1>
              {/* <p className="text-blue-100 text-xs">Admin Dashboard</p> */}
            </div>
          </div>
          <Badge variant="secondary" className="bg-blue-500 text-white border-blue-400">
            CMS
          </Badge>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-blue-700"
            onClick={() => window.open('/', '_blank')}
          >
            <Home size={16} className="mr-2" />
            View Site
          </Button>
          
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
