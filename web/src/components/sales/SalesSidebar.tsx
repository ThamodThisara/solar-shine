import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessSection } from '@/config/roles';
import {
  LogOut,
  Menu,
  X,
  Home,
  Users,
  Briefcase,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';

interface SalesSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  /** Whether the off-canvas drawer is open on mobile/tablet. */
  isMobileOpen: boolean;
  /** Close the off-canvas drawer (mobile/tablet). */
  onMobileClose: () => void;
}

// The Sales panel surfaces the sales-facing subset of features: the shared
// Dashboard and Client Management (from the Admin panel) alongside the
// project/site-visit/document workflows sales managers participate in.
const sidebarItems = [
  {
    category: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'clients', label: 'Client Management', icon: Users },
      { id: 'project-execution', label: 'Project Execution', icon: Briefcase },
      { id: 'site-visits', label: 'Site Visits', icon: ClipboardList },
      { id: 'document-center', label: 'Document Center', icon: FolderOpen },
    ],
  },
];

export const SalesSidebar: React.FC<SalesSidebarProps> = ({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  isMobileOpen,
  onMobileClose,
}) => {
  const { role } = useAuth();
  // On mobile the drawer is always full-width, so labels are shown regardless of
  // the desktop collapse state. Collapse only hides labels on lg+ screens.
  const showLabels = isMobileOpen || !isCollapsed;

  const allowedItems = React.useMemo(() => {
    return sidebarItems.map((category) => ({
      ...category,
      items: category.items.filter((item) => canAccessSection(item.id, role)),
    })).filter((category) => category.items.length > 0);
  }, [role]);

  return (
    <>
      {/* Backdrop — mobile/tablet only */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <div className={cn(
        "bg-white border-r border-gray-200 flex flex-col z-50",
        // Mobile: fixed off-canvas drawer that slides in/out.
        "fixed inset-y-0 left-0 w-64 max-w-[85vw] transform transition-transform duration-300",
        isMobileOpen ? "translate-x-0" : "-translate-x-full",
        // Desktop (lg+): static column that collapses in place.
        "lg:static lg:translate-x-0 lg:max-w-none lg:transition-all",
        isCollapsed ? "lg:w-16" : "lg:w-64"
      )}>
      {/* Header */}
      <div className="py-3 px-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {showLabels && (
            <h2 className="text-lg font-semibold text-gray-900">Sales Panel</h2>
          )}
          {/* Desktop: collapse toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 hidden lg:flex"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
          {/* Mobile: close drawer */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onMobileClose}
            className="p-1 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {allowedItems.map((category) => (
            <div key={category.category}>
              {showLabels && (
                <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2 px-3">
                  {category.category}
                </h3>
              )}
              <div className="space-y-1">
                {category.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <Button
                      key={item.id}
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start h-9",
                        showLabels ? "px-3" : "px-2",
                        isActive && "bg-cyan-600 text-white hover:bg-cyan-700"
                      )}
                      onClick={() => onSectionChange(item.id)}
                      title={!showLabels ? item.label : undefined}
                    >
                      <Icon className={cn("h-4 w-4", showLabels && "mr-2")} />
                      {showLabels && <span className="text-sm">{item.label}</span>}
                    </Button>
                  );
                })}
              </div>
              {showLabels && <Separator className="my-3" />}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start h-9 text-red-600 hover:text-red-700 hover:bg-red-50",
            showLabels ? "px-3" : "px-2"
          )}
          onClick={onLogout}
          title={!showLabels ? "Logout" : undefined}
        >
          <LogOut className={cn("h-4 w-4", showLabels && "mr-2")} />
          {showLabels && <span className="text-sm">Logout</span>}
        </Button>
      </div>
      </div>
    </>
  );
};
