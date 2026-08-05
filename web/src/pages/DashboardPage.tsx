import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Dashboard } from '@/components/admin/Dashboard';
import { ContentManager } from '@/components/admin/content/ContentManager';
import AppointmentsSection from '@/components/admin/AppointmentsSection';
import ProjectExecutionSection from '@/components/admin/ProjectExecutionSection';
import SiteVisitsSection from '@/components/admin/SiteVisitsSection';
import DocumentCenterSection from '@/components/admin/DocumentCenterSection';
import UserManagementSection from '@/components/admin/UserManagementSection';
import { ClientsSection } from '@/components/admin/ClientsSection';
import { RolePermissionManagementSection } from '@/components/admin/RolePermissionManagementSection';

const DashboardPage: React.FC = () => {
  const { user, hasPermission, isAuthenticated, isLoading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const [activeSection, setActiveSection] = useState(tabParam || 'dashboard');

  // Sync state with search params
  useEffect(() => {
    if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  // Handle section changes
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setSearchParams({ tab: section });
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isLoading, isAuthenticated, navigate]);

  // If loading or not authenticated, render loading screen
  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Authenticating and loading workspace...</p>
        </div>
      </div>
    );
  }

  // Check section access permissions
  const hasAccessToSection = (section: string): boolean => {
    switch (section) {
      case 'dashboard':
        return hasPermission('dashboard:view');
      case 'appointments':
        return hasPermission('appointments:view');
      case 'clients':
        return hasPermission('clients:view');
      case 'project-execution':
        return hasPermission('projects:view');
      case 'site-visits':
        return hasPermission('sites:view');
      case 'document-center':
        return hasPermission('documents:view');
      case 'user-management':
        return hasPermission('teams:manage') || hasPermission('roles:manage');
      case 'role-management':
        return hasPermission('roles:manage');
      case 'home-content':
      case 'legal-pages':
      case 'hero':
      case 'services':
      case 'specialized-areas':
      case 'projects':
      case 'testimonials':
      case 'blog':
      case 'who-we-are':
      case 'about':
      case 'what-we-do':
        return hasPermission('cms:manage');
      case 'company-info':
      case 'social-links':
      case 'footer-links':
      case 'navigation':
      case 'seo':
      case 'settings':
        return hasPermission('settings:manage');
      default:
        return false;
    }
  };

  // Fallback: If current section is not allowed, find the first section they have permission for
  useEffect(() => {
    if (!hasAccessToSection(activeSection)) {
      const fallbackTabs = [
        { id: 'dashboard', flag: 'dashboard:view' },
        { id: 'appointments', flag: 'appointments:view' },
        { id: 'clients', flag: 'clients:view' },
        { id: 'project-execution', flag: 'projects:view' },
        { id: 'site-visits', flag: 'sites:view' },
        { id: 'document-center', flag: 'documents:view' },
        { id: 'user-management', flag: 'teams:manage' },
        { id: 'role-management', flag: 'roles:manage' },
        { id: 'home-content', flag: 'cms:manage' },
        { id: 'company-info', flag: 'settings:manage' }
      ];

      const allowed = fallbackTabs.find(tab => {
        if (tab.flag === 'teams:manage') {
          return hasPermission('teams:manage') || hasPermission('roles:manage');
        }
        return hasPermission(tab.flag);
      });

      if (allowed) {
        handleSectionChange(allowed.id);
      }
    }
  }, [activeSection, permissionsUpdatedEventCounter(hasPermission)]);

  // Render the appropriate section content with granular permission configuration
  const renderContent = () => {
    // Return early if no access
    if (!hasAccessToSection(activeSection)) {
      return (
        <div className="p-8 text-center bg-white rounded-lg shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
          <p className="text-gray-500">You do not have permission to access the "{activeSection}" module.</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <AppointmentsSection />;
      case 'project-execution':
        // If they have project:view but not projects:edit, render read-only
        return <ProjectExecutionSection showCreate={hasPermission('projects:create')} />;
      case 'site-visits':
        // If they have sites:view but not sites:create, render read-only
        return <SiteVisitsSection showCreate={hasPermission('sites:create')} />;
      case 'document-center':
        return <DocumentCenterSection />;
      case 'user-management':
        return <UserManagementSection />;
      case 'role-management':
        return <RolePermissionManagementSection />;
      case 'clients':
        return <ClientsSection />;
      case 'home-content':
      case 'legal-pages':
      case 'hero':
      case 'services':
      case 'specialized-areas':
      case 'projects':
      case 'testimonials':
      case 'blog':
      case 'who-we-are':
      case 'about':
      case 'what-we-do':
      case 'company-info':
      case 'social-links':
      case 'footer-links':
      case 'navigation':
      case 'seo':
      case 'settings':
        return <ContentManager activeSection={activeSection} />;
      default:
        return <div className="p-6 text-center text-gray-500">Select a section from the sidebar.</div>;
    }
  };

  return (
    <DashboardLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
    >
      {renderContent()}
    </DashboardLayout>
  );
};

// Helper helper function to trigger re-checks on permission change
function permissionsUpdatedEventCounter(hasPermissionFn: Function) {
  return hasPermissionFn.toString();
}

export default DashboardPage;
