import React, { useEffect, useState } from 'react';
import { fetchSEOSettings, fetchPageSEOByPath } from '@/services/seoService';

interface SEOHeadProps {
  pagePath: string;
  fallbackTitle?: string;
  fallbackDescription?: string;
  customTitle?: string;
  customDescription?: string;
  customKeywords?: string;
  customOgImage?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  pagePath,
  fallbackTitle = 'Solar Maps - Professional Solar Panel Installation',
  fallbackDescription = 'Expert solar panel installation and maintenance services. Transform your home with clean, renewable energy solutions.',
  customTitle,
  customDescription,
  customKeywords,
  customOgImage
}) => {
  const [seoData, setSeoData] = useState<any>(null);
  const [globalSEO, setGlobalSEO] = useState<any>(null);

  useEffect(() => {
    const loadSEOData = async () => {
      try {
        // Load global SEO settings
        const globalSettings = await fetchSEOSettings();
        setGlobalSEO(globalSettings);

        // Load page-specific SEO
        const pageData = await fetchPageSEOByPath(pagePath);
        setSeoData(pageData);
      } catch (error) {
        console.error('Error loading SEO data:', error);
      }
    };

    loadSEOData();
  }, [pagePath]);

  // Determine final values with priority: custom props > page SEO > global SEO > fallback
  const title = customTitle || seoData?.page_title || globalSEO?.site_title || fallbackTitle;
  const description = customDescription || seoData?.meta_description || globalSEO?.site_description || fallbackDescription;
  const keywords = customKeywords || seoData?.meta_keywords || globalSEO?.site_keywords || '';
  const ogImage = customOgImage || seoData?.og_image || globalSEO?.default_og_image || '';
  const siteUrl = globalSEO?.site_url || 'https://solarmaps.lk';
  const canonicalUrl = seoData?.canonical_url || `${siteUrl}${pagePath}`;
  const author = globalSEO?.author || 'Solar Maps Team';
  const twitterHandle = globalSEO?.twitter_handle || '';
  const fbAppId = globalSEO?.facebook_app_id || '';

  useEffect(() => {
    // Update document title
    document.title = title;

    // Update meta tags
    const updateMeta = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMeta('description', description);
    if (keywords) updateMeta('keywords', keywords);
    if (author) updateMeta('author', author);
    
    // Open Graph tags
    updateMeta('og:title', title, true);
    updateMeta('og:description', description, true);
    updateMeta('og:type', 'website', true);
    updateMeta('og:url', canonicalUrl, true);
    if (ogImage) updateMeta('og:image', ogImage, true);
    if (fbAppId) updateMeta('fb:app_id', fbAppId, true);

    // Twitter Card tags
    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    if (ogImage) updateMeta('twitter:image', ogImage);
    if (twitterHandle) updateMeta('twitter:site', twitterHandle);

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    // Add Google Analytics if configured
    if (globalSEO?.google_analytics_id) {
      const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag/js?id=${globalSEO.google_analytics_id}"]`);
      if (!existingScript) {
        // Add Google Analytics script
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${globalSEO.google_analytics_id}`;
        document.head.appendChild(script);

        // Add gtag config
        const configScript = document.createElement('script');
        configScript.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${globalSEO.google_analytics_id}');
        `;
        document.head.appendChild(configScript);
      }
    }

    // Add Google Search Console verification if configured
    if (globalSEO?.google_search_console_id) {
      updateMeta('google-site-verification', globalSEO.google_search_console_id);
    }

  }, [title, description, keywords, ogImage, canonicalUrl, author, twitterHandle, fbAppId, globalSEO]);

  return null; // This component doesn't render anything visible
};

export default SEOHead;
