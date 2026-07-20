
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Dashboard } from '@/components/admin/Dashboard';
import { ContentManager } from '@/components/admin/content/ContentManager';
import AppointmentsSection from '@/components/admin/AppointmentsSection';
import ProjectExecutionSection from '@/components/admin/ProjectExecutionSection';
import SiteVisitsSection from '@/components/admin/SiteVisitsSection';
import DocumentCenterSection from '@/components/admin/DocumentCenterSection';
import UserManagementSection from '@/components/admin/UserManagementSection';
import { ClientsSection } from '@/components/admin/ClientsSection';

import { useSearchParams } from 'react-router-dom';

const Admin: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeSection, setActiveSection] = useState(tabParam || 'dashboard');
  const { user } = useAuth();

  React.useEffect(() => {
    if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard />;
      case 'appointments':
        return <AppointmentsSection />;
      case 'project-execution':
        return <ProjectExecutionSection />;
      case 'site-visits':
        return <SiteVisitsSection />;
      case 'document-center':
        return <DocumentCenterSection />;
      case 'user-management':
        return <UserManagementSection />;
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
        return <Dashboard />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderContent()}
    </AdminLayout>
  );
};

export default Admin;
