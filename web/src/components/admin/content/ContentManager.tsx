import React from 'react';
import { HeroSectionManager } from './HeroSectionManager';
import { ServicesManager } from './ServicesManager';
import { ProjectsManager } from './ProjectsManager';
import { BlogManager } from './BlogManager';
import { TestimonialsManager } from './TestimonialsManager';
import { SpecializedAreasManager } from './SpecializedAreasManager';
import { AboutContentManager } from './AboutContentManager';
import { WhatWeDoManager } from './WhatWeDoManager';
import { HomeContentManager } from './HomeContentManager';
import { CompanyInfoManager } from './CompanyInfoManager';
import { SocialLinksManager } from './SocialLinksManager';
import { FooterLinksManager } from './FooterLinksManager';
import { NavigationManager } from './NavigationManager';
import { SEOManager } from './SEOManager';
import { GlobalSettingsManager } from './GlobalSettingsManager';
import {WhoweareManager} from'./WhoweareManager';
interface ContentManagerProps {
  activeSection: string;
}

export const ContentManager: React.FC<ContentManagerProps> = ({ activeSection }) => {
  const renderContent = () => {
    switch (activeSection) {
      case 'home-content':
        return <HomeContentManager />;
      case 'hero':
        return <HeroSectionManager />;
      case 'services':
        return <ServicesManager />;
      case 'projects':
        return <ProjectsManager />;
      case 'blog':
        return <BlogManager />;
      case 'specialized-areas':
        return <SpecializedAreasManager />;
      case 'testimonials':
        return <TestimonialsManager />;
      case 'who-we-are':
        return <WhoweareManager/>;
      case 'about':
        return <AboutContentManager />;
      case 'what-we-do':
        return <WhatWeDoManager />;
      case 'company-info':
        return <CompanyInfoManager />;
      case 'social-links':
        return <SocialLinksManager />;
      case 'footer-links':
        return <FooterLinksManager />;
      case 'navigation':
        return <NavigationManager />;
      case 'seo':
        return <SEOManager />;
      case 'settings':
        return <GlobalSettingsManager />;
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            Select a section from the sidebar to manage content.
          </div>
        );
    }
  };

  return <div>{renderContent()}</div>;
};
