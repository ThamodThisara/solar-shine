import React, { useState } from 'react';
import { EngineerSidebar } from './EngineerSidebar';
import EngineerHeader from './EngineerHeader';
import { useAuth } from '@/contexts/AuthContext';
import { Toaster } from '@/components/ui/sonner';

interface EngineerLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export const EngineerLayout: React.FC<EngineerLayoutProps> = ({
  children,
  activeSection,
  onSectionChange,
}) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { user, logout } = useAuth();

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <EngineerSidebar
        activeSection={activeSection}
        onSectionChange={onSectionChange}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onLogout={logout}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <EngineerHeader user={user} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      <Toaster />
    </div>
  );
};
