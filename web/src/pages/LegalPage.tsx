import React, { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { legalPageService, LegalPageType } from '@/services/legalPageService';

interface LegalPageProps {
  pageType: LegalPageType;
}

const LegalPage: React.FC<LegalPageProps> = ({ pageType }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['legalPage', pageType],
    queryFn: () => legalPageService.fetchLegalPage(pageType),
    staleTime: 5 * 60 * 1000,
  });

  // Reset scroll position when navigating between legal pages.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pageType]);

  const title = data?.title ?? '';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Page hero */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
          <div className="container-custom px-4 py-16 md:py-20">
            <motion.h1
              className="text-3xl md:text-4xl lg:text-5xl font-bold"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {title}
            </motion.h1>
          </div>
        </section>

        {/* Content */}
        <section className="container-custom px-4 py-10 md:py-14">
          <div className="max-w-4xl mx-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              </div>
            ) : (
              <motion.article
                className="prose max-w-none"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                // Content is authored by trusted admins via the Admin Panel editor.
                dangerouslySetInnerHTML={{ __html: data?.content ?? '' }}
              />
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
