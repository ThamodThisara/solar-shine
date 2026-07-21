
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Globe,
  Youtube, MessageCircle, Share2, ChevronDown, ChevronUp, Sun,
  ArrowRight, Heart, Shield, FileText
} from 'lucide-react';
import { TikTokIcon } from '@/components/icons/TikTokIcon';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanyInfo } from '@/services/companyService';
import { fetchGlobalSettings } from '@/services/settingsService';
import { socialLinkService, footerLinkService } from '@/services/appwriteService';
import { motion } from 'framer-motion';

const Footer: React.FC = () => {
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Fetch company info from database
  const { data: companyInfo } = useQuery({
    queryKey: ['companyInfo'],
    queryFn: fetchCompanyInfo,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch global settings for contact information
  const { data: globalSettings } = useQuery({
    queryKey: ['globalSettings'],
    queryFn: fetchGlobalSettings,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Fetch social links from database
  const { data: socialLinks = [], isLoading: socialLinksLoading } = useQuery({
    queryKey: ['socialLinks'],
    queryFn: async () => {
      try {
        const result = await socialLinkService.getAll();
        return result.sort((a, b) => (a.order || 1) - (b.order || 1));
      } catch (error) {
        console.error('Footer: Error fetching social links:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch footer links from database
  const { data: footerLinks = [] } = useQuery({
    queryKey: ['footerLinks'],
    queryFn: async () => {
      try {
        const result = await footerLinkService.getAll();
        return result; // Remove sorting by order since it doesn't exist
      } catch (error) {
        console.error('Footer: Error fetching footer links:', error);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fallback company info if database is empty
  const fallbackCompanyInfo = {
    name: 'Solar Maps',
    description: 'Leading provider of renewable energy solutions in Sri Lanka. We specialize in solar panel installation, maintenance, and energy consultation services.',
  };

  // Use database data or fallback
  const company = companyInfo || fallbackCompanyInfo;

  // Use global settings for contact info, with fallbacks
  const contactInfo = {
    address: globalSettings?.address || '123 Solar Street, Colombo, Sri Lanka',
    email: globalSettings?.contact_email || 'info@solarshine.com',
    phone: globalSettings?.contact_phone || '+94 11 234 5678',
  };

  // Function to get the appropriate icon component based on the icon name
  const getSocialIcon = (iconName?: string | null) => {
    if (!iconName) return Globe;
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      facebook: Facebook,
      twitter: Twitter,
      instagram: Instagram,
      linkedin: Linkedin,
      youtube: Youtube,
      tiktok: TikTokIcon,
      pinterest: Share2,
      snapchat: MessageCircle,
      whatsapp: MessageCircle,
      telegram: MessageCircle,
      discord: MessageCircle,
      reddit: Share2,
      github: Share2,
      twitch: MessageCircle,
      spotify: MessageCircle,
      apple: Share2,
      google: Share2,
      microsoft: Share2,
      amazon: Share2,
      netflix: MessageCircle,
    };
    return iconMap[iconName.toLowerCase()] || Globe;
  };

  // Group footer links by category
  const groupedFooterLinks = footerLinks.reduce((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = [];
    }
    acc[link.category].push(link);
    return acc;
  }, {} as { [key: string]: any[] });

  // Default sections if no footer links
  const defaultSections = {
    'Company': [
      { name: 'About Us', url: '/who-we-are' },
      { name: 'Services', url: '/services' },
      { name: 'Projects', url: '/projects' },
      { name: 'News', url: '/blog' },
      { name: 'Contact', url: '/contact' },
      { name: 'Privacy Policy', url: '/privacy' },
      { name: 'Terms of Service', url: '/terms' },
    ],
      // 'Our Services': [
      //   { name: 'Solar Installation', url: '/services#installation' },
      //   { name: 'Energy Consultation', url: '/services#consultation' },
      //   { name: 'Maintenance', url: '/services#maintenance' },
      //   { name: 'System Design', url: '/services#design' },
      // ],
      // 'Company': [
      //   { name: 'About Us', url: '/who-we-are' },
      //   { name: 'Our Team', url: '/who-we-are#team' },
      //   { name: 'News', url: '/blog' },
      // ]
  };

  const sections = Object.keys(groupedFooterLinks).length > 0 ? groupedFooterLinks : defaultSections;

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <footer className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative">
        {/* Main Footer Content */}
        <div className="container-custom py-12 md:py-16 px-4">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-start"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {/* Company Info - Full width on tablet, 4 columns on large screens */}
            <motion.div className="md:col-span-12 lg:col-span-4" variants={itemVariants}>
              <div className="flex items-start mb-8">
                <div className="bg-white p-2 rounded-2xl mr-5 flex-shrink-0 shadow-lg">
                  {companyInfo?.logo_url ? (
                    <img
                      // src={companyInfo.logo_url}
                      // alt={`${company.name} Logo`}
                      // className="h-12 w-12 object-contain"
                      src="/Solar%20Maps%20logo.png"
                      alt="Solar Maps"
                      className="h-12 w-12 object-contain"
                      onError={(e) => {
                        // If logo fails to load, hide it and show Sun icon
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const sunIcon = document.createElement('div');
                          sunIcon.innerHTML = '<svg class="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z"/></svg>';
                          parent.appendChild(sunIcon);
                        }
                      }}
                    />
                  ) : (
                    <Sun className="h-12 w-12 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent mb-2 leading-tight">
                    {company.name}
                  </h3>
                  <p className="text-sm text-gray-300 leading-relaxed">{company.description}</p>
                </div>
              </div>

              {/* Social Links */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Follow Us
                </h4>
                <div className="flex space-x-3">
                  {socialLinksLoading ? (
                    <div className="flex space-x-3">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    socialLinks.map((social) => {
                      const IconComponent = getSocialIcon(social.icon);
                      return (
                        <motion.a
                          key={social.$id}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-gray-800 hover:bg-orange-500 text-gray-300 hover:text-white p-2.5 rounded-lg transition-all duration-300 transform hover:scale-110 hover:shadow-lg"
                          aria-label={social.name}
                          whileHover={{ y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <IconComponent size={18} />
                        </motion.a>
                      );
                    })
                  )}
                </div>
              </div>
            </motion.div>

            {/* Footer Links Sections - 7 columns on tablet, 4 (even third) on large screens */}
            <motion.div className="md:col-span-7 lg:col-span-4" variants={itemVariants}>
              <div className="grid grid-cols-1 gap-y-6">
                {Object.entries(sections).map(([sectionName, links]) => (
                  <motion.div key={sectionName} variants={itemVariants}>
                    {/* Mobile Accordion Header */}
                    <div className="lg:hidden">
                      <button
                        onClick={() => toggleSection(sectionName)}
                        className="flex items-center justify-between w-full py-3 text-left border-b border-gray-700"
                      >
                        <h3 className="text-lg font-semibold text-white">{sectionName}</h3>
                        {expandedSections[sectionName] ? (
                          <ChevronUp className="h-5 w-5 text-orange-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-orange-400" />
                        )}
                      </button>
                    </div>

                    {/* Desktop Header */}
                    <h3 className="text-lg font-semibold text-white mb-4 hidden lg:block">
                      {sectionName}
                    </h3>

                    {/* Links List */}
                    <div className={`lg:block ${expandedSections[sectionName] ? 'block' : 'hidden'}`}>
                      <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-3">
                        {links.map((link) => (
                          <li key={link.name}>
                            <Link
                              to={link.url}
                              className="text-gray-300 hover:text-orange-400 transition-colors duration-300 flex items-center group"
                            >
                              <ArrowRight className="h-4 w-4 mr-2 text-orange-400 group-hover:translate-x-1 transition-transform duration-300" />
                              {link.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
            <motion.div className="md:col-span-5 lg:col-span-4" variants={itemVariants}>
              {/* Contact Info */}
              <h3 className="text-lg font-semibold text-white mb-4">Contact Us</h3>
              <div className="space-y-3">

                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-orange-400 flex-shrink-0" />
                  <a
                      href={`mailto:${contactInfo.email}`}
                      className="text-gray-300 hover:text-orange-400 transition-colors text-sm min-w-0 break-words"
                  >
                    {contactInfo.email}
                  </a>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-orange-400 flex-shrink-0" />
                  <a
                      href={`tel:${contactInfo.phone}`}
                      className="text-gray-300 hover:text-orange-400 transition-colors text-sm"
                  >
                    {contactInfo.phone}
                  </a>
                </div>
                <div className="flex items-start space-x-3">
                  <MapPin className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-300 text-sm leading-relaxed">{contactInfo.address}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Bottom Footer */}
        <motion.div
          className="bg-black py-6 px-4"
          variants={itemVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="container-custom">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <span>&copy; {new Date().getFullYear()} {company.name}. All rights reserved.</span>
              </div>

              <div className="flex items-center space-x-6 text-sm">
                <div className="text-gray-400 flex items-center">
                  <span>Made with</span>
                  <Heart className="h-4 w-4 mx-1 text-red-500 fill-current" />
                  <span>in Sri Lanka</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
