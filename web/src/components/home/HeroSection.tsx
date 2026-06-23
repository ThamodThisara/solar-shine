import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HeroSection as HeroSectionType } from '@/types/payload-types';
import { getImageWithCacheBusting } from '@/lib/utils';

interface HeroSectionProps {
  data: HeroSectionType;
}

const HeroSection: React.FC<HeroSectionProps> = ({ data }) => {
  // Ensure the background image URL is properly formatted
  const backgroundImageUrl = data.background_image ?
    (data.background_image.startsWith('http')
      ? data.background_image
      : `${import.meta.env.VITE_APPWRITE_ENDPOINT}/storage/buckets/${import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID}/files/${data.background_image}/view?project=${import.meta.env.VITE_APPWRITE_PROJECT_ID}`)
    : '';

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 to-black/40 z-10" />
        {backgroundImageUrl && (
          <img
            src={backgroundImageUrl}
            alt={data.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Failed to load hero background image:', backgroundImageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>

      <div className="container-custom relative z-20 pt-20 md:pt-0">
        <div className="max-w-3xl text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            {data.title}
          </h1>
          <p className="text-xl md:text-2xl mb-3 text-white/90">
            {data.subtitle}
          </p>
          {data.description && (
            <p className="text-base mb-8 text-white/80 max-w-2xl">
              {data.description}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button className="btn-primary flex items-center gap-2 text-lg" asChild>
              <a href={data.cta_url || '#'}>
                {data.cta_text}
                <ArrowRight size={18} />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
