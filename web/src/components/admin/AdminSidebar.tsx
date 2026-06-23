import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Home,
  Calendar,
  FileText,
  Users,
  Settings,
  Image,
  MessageSquare,
  BarChart3,
  Globe,
  Building,
  Mail,
  Phone,
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
  FolderOpen
} from 'lucide-react';

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

const sidebarItems = [
  {
    category: 'Dashboard',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'appointments', label: 'Appointments', icon: Calendar },
      { id: 'project-execution', label: 'Project Execution', icon: Briefcase },
      { id: 'document-center', label: 'Document Center', icon: FolderOpen },
      { id: 'user-management', label: 'User Management', icon: Users },
    ]
  },
  {
    category: 'Content Management',
    items: [
      { id: 'hero', label: 'Hero Section', icon: Image },
      { id: 'services', label: 'Services', icon: ShoppingBag },
      { id: 'specialized-areas', label: 'Specialized Areas', icon: Award },
      { id: 'projects', label: 'Projects', icon: Building },
      { id: 'testimonials', label: 'Testimonials', icon: MessageSquare },
      { id: 'blog', label: 'Blog Posts', icon: BookOpen },
      {id:'who-we-are',label: 'Who We Are page',icon:Image},
      { id: 'about', label: 'About Content', icon: Info },
      { id: 'what-we-do', label: 'What We Do', icon: BadgeCheck },
    ]
  },
  {
    category: 'Configuration',
    items: [
      { id: 'company-info', label: 'Company Info', icon: Building },
      { id: 'social-links', label: 'Social Links', icon: Globe },
      { id: 'footer-links', label: 'Footer Links', icon: Link },
      { id: 'navigation', label: 'Navigation', icon: Globe },
      { id: 'seo', label: 'SEO Settings', icon: BarChart3 },
      { id: 'settings', label: 'Global Settings', icon: Settings },
    ]
  }
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeSection,
  onSectionChange,
  isCollapsed,
  onToggleCollapse,
  onLogout
}) => {
  return (
    <div className={cn(
      "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1"
          >
            {isCollapsed ? <Menu className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          {sidebarItems.map((category) => (
            <div key={category.category}>
              {!isCollapsed && (
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
                        isCollapsed ? "px-2" : "px-3",
                        isActive && "bg-primary text-primary-foreground"
                      )}
                      onClick={() => onSectionChange(item.id)}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                      {!isCollapsed && <span className="text-sm">{item.label}</span>}
                    </Button>
                  );
                })}
              </div>
              {!isCollapsed && <Separator className="my-3" />}
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
            isCollapsed ? "px-2" : "px-3"
          )}
          onClick={onLogout}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </Button>
      </div>
    </div>
  );
};
