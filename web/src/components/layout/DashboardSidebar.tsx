import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import {
  Home,
  Calendar,
  Users,
  Settings,
  Image,
  MessageSquare,
  BarChart3,
  Globe,
  Building,
  ShoppingBag,
  Award,
  BookOpen,
  Info,
  LogOut,
  Menu,
  X,
  Link,
  BadgeCheck,
  Briefcase,
  FolderOpen,
  ClipboardList,
  FileText,
  ShieldAlert
} from 'lucide-react';

interface DashboardSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  onLogout,
  isMobileOpen,
  onMobileClose
}) => {
  const { hasPermission, role, departmentName } = useAuth();
  const showLabels = isMobileOpen || !isCollapsed;

  // Dynamically build navigation based on permissions
  const sidebarCategories = React.useMemo(() => {
    const categories = [];

    // Category 1: Workspace / Dashboard
    const workspaceItems = [];
    if (hasPermission('dashboard:view')) {
      workspaceItems.push({ id: 'dashboard', label: 'Dashboard', icon: Home });
    }
    if (hasPermission('appointments:view')) {
      workspaceItems.push({ id: 'appointments', label: 'Appointments', icon: Calendar });
    }
    if (hasPermission('clients:view')) {
      workspaceItems.push({ id: 'clients', label: 'Client Management', icon: Users });
    }
    if (hasPermission('projects:view')) {
      workspaceItems.push({ id: 'project-execution', label: 'Project Execution', icon: Briefcase });
    }
    if (hasPermission('sites:view')) {
      workspaceItems.push({ id: 'site-visits', label: 'Site Visits', icon: ClipboardList });
    }
    // Document center remains accessible if they have documents:view permission
    if (hasPermission('documents:view')) {
      workspaceItems.push({ id: 'document-center', label: 'Document Center', icon: FolderOpen });
    }
    if (hasPermission('teams:manage') || hasPermission('roles:manage')) {
      workspaceItems.push({ id: 'user-management', label: 'User & Teams', icon: Users });
    }
    if (hasPermission('roles:manage')) {
      workspaceItems.push({ id: 'role-management', label: 'Roles & Permissions', icon: ShieldAlert });
    }

    if (workspaceItems.length > 0) {
      categories.push({
        category: 'Workspace',
        items: workspaceItems
      });
    }

    // Category 2: Content Management
    if (hasPermission('cms:manage')) {
      categories.push({
        category: 'Content Management',
        items: [
          { id: 'home-content', label: 'Home Content', icon: Home },
          { id: 'hero', label: 'Hero Section', icon: Image },
          { id: 'services', label: 'Services', icon: ShoppingBag },
          { id: 'specialized-areas', label: 'Specialized Areas', icon: Award },
          { id: 'projects', label: 'Projects', icon: Building },
          { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
          { id: 'blog', label: 'Blog Posts', icon: BookOpen },
          { id: 'who-we-are', label: 'Who We Are page', icon: Image },
          { id: 'about', label: 'About Content', icon: Info },
          { id: 'what-we-do', label: 'What We Do', icon: BadgeCheck },
          { id: 'legal-pages', label: 'Legal Pages', icon: FileText }
        ]
      });
    }

    // Category 3: Configuration
    if (hasPermission('settings:manage')) {
      categories.push({
        category: 'Configuration',
        items: [
          { id: 'company-info', label: 'Company Info', icon: Building },
          { id: 'social-links', label: 'Social Links', icon: Globe },
          { id: 'footer-links', label: 'Footer Links', icon: Link },
          { id: 'navigation', label: 'Navigation', icon: Globe },
          { id: 'seo', label: 'SEO Settings', icon: BarChart3 },
          { id: 'settings', label: 'Global Settings', icon: Settings }
        ]
      });
    }

    return categories;
  }, [hasPermission]);

  const displayPanelLabel = React.useMemo(() => {
    if (role === 'admin') return 'Admin Panel';
    if (!role) return 'Portal';
    if (departmentName) return `${departmentName} Panel`;
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' Panel';
  }, [role, departmentName]);

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
              <h2 className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">
                {displayPanelLabel}
              </h2>
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
            {sidebarCategories.map((category) => (
              <div key={category.category}>
                {showLabels && (
                  <h3 className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-3">
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
                          isActive && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => onSectionChange(item.id)}
                        title={!showLabels ? item.label : undefined}
                      >
                        <Icon className={cn("h-4 w-4", showLabels && "mr-2")} />
                        {showLabels && <span className="text-sm truncate">{item.label}</span>}
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
