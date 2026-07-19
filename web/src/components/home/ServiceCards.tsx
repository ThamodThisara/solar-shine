
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { ServiceCard } from '@/types/payload-types';



interface ServiceCardsProps {
  services: ServiceCard[];
  title?: string;
  description?: string;
}

const ServiceCards: React.FC<ServiceCardsProps> = ({
  services,
  title = 'Our Services',
  description = 'We provide comprehensive solar energy solutions to meet your renewable energy goals.',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="section bg-brand-light">
      <div className="container-custom">
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">
          {description}
        </p>

        <div className="relative mt-12">
          {/* Navigation Buttons */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-xl hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 md:-left-8 hidden md:block group"
            aria-label="Scroll left"
          >
            <ChevronLeft size={28} className="text-slate-600 group-hover:text-slate-800 transition-colors duration-300" />
          </button>

          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white p-3 rounded-full shadow-xl hover:bg-gray-50 hover:shadow-2xl transition-all duration-300 md:-right-8 hidden md:block group"
            aria-label="Scroll right"
          >
            <ChevronRight size={28} className="text-slate-600 group-hover:text-slate-800 transition-colors duration-300" />
          </button>

          {/* Service Cards Container */}
          <div
            ref={containerRef}
            className="flex overflow-x-auto gap-6 pb-6 scrollbar-hide snap-x snap-mandatory px-4 md:px-8"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {services.map((service, index) => {
              const cardColor = index % 2 === 0 ? 'bg-primary' : 'bg-brand-black';

              return (
                <motion.div
                  key={service.$id}
                  className="min-w-[260px] sm:min-w-[300px] max-w-[350px] bg-white rounded-lg shadow-lg p-6 flex flex-col h-[280px] snap-center"
                  whileHover={{ y: -10, transition: { duration: 0.3 } }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className={`${cardColor} w-14 rounded-lg flex items-center justify-center mb-4`}>
                    <div className="text-white text-2xl">⚡</div>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{service.title || 'Service'}</h3>
                  <p className="text-brand-gray line-clamp-2">{service.description}</p>
                  <a
                    href={`/services#${(service.title || '').toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-primary font-medium mt-4 flex items-center hover:underline"
                  >
                    Learn More
                    <ChevronRight size={16} className="ml-1" />
                  </a>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceCards;
