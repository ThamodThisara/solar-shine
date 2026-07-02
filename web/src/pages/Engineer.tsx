
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { EngineerLayout } from '@/components/engineer/EngineerLayout';
import ProjectExecutionSection from '@/components/admin/ProjectExecutionSection';
import SiteVisitsSection from '@/components/admin/SiteVisitsSection';
import DocumentCenterSection from '@/components/admin/DocumentCenterSection';

import { useSearchParams } from 'react-router-dom';

const Engineer: React.FC = () => {
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
      case 'project-execution':
        return <ProjectExecutionSection />;
      case 'site-visits':
        return <SiteVisitsSection />;
      case 'document-center':
        return <DocumentCenterSection />;
      default:
        return <ProjectExecutionSection />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600">Please log in to access the engineer panel.</p>
        </div>
      </div>
    );
  }

  return (
    <EngineerLayout
      activeSection={activeSection}
      onSectionChange={setActiveSection}
    >
      {renderContent()}
    </EngineerLayout>
  );
};

export default Engineer;
