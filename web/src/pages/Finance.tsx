import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { FinanceLayout } from '@/components/finance/FinanceLayout';
import ProjectExecutionSection from '@/components/admin/ProjectExecutionSection';
import SiteVisitsSection from '@/components/admin/SiteVisitsSection';
import DocumentCenterSection from '@/components/admin/DocumentCenterSection';

import { useSearchParams } from 'react-router-dom';

const Finance: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeSection, setActiveSection] = useState(tabParam || 'project-execution');
  const { user } = useAuth();

  React.useEffect(() => {
    if (tabParam) {
      setActiveSection(tabParam);
    }
  }, [tabParam]);

  const renderContent = () => {
    switch (activeSection) {
      // Finance gets a read-oriented Project Execution view: no "Create Project"
      // (and "Manage Project Types" is already admin-only).
      case 'project-execution':
        return <ProjectExecutionSection showCreate={false} />;
      // No "Create Site Visit" for finance.
      case 'site-visits':
        return <SiteVisitsSection showCreate={false} />;
      // Document Center already scopes documents to the finance department and
      // hides "Manage Document Types" for non-admins.
      case 'document-center':
        return <DocumentCenterSection />;
      default:
        return <ProjectExecutionSection showCreate={false} />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the finance panel.</p>
        </div>
      </div>
    );
  }

  return (
    <FinanceLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderContent()}
    </FinanceLayout>
  );
};

export default Finance;
