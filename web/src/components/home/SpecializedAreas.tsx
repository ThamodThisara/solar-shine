import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { fetchSpecializedAreas } from '@/services/specializedAreaService';
import { Skeleton } from '@/components/ui/skeleton';

const SpecializedAreas: React.FC = () => {
  const { data: areas, isLoading, error } = useQuery({
    queryKey: ['specializedAreas'],
    queryFn: fetchSpecializedAreas
  });

  // Default content that should NEVER change
  const defaultTitle = "Our Specialized Areas";
  const defaultDescription = "We provide specialized solar solutions across different sectors, each tailored to specific energy requirements and environmental conditions.";

  // Use data only for the individual cards, not for the main heading
  const hasData = !isLoading && !error && areas && areas.length > 0;

  // Function to get proper image URL
  const getImageUrl = (imageId: string | null) => {
    if (!imageId) return 'https://images.unsplash.com/photo-1559081286-70366a286898?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';

    // If it's already a full URL, return it
    if (imageId.startsWith('http')) return imageId;

    // If it's an Appwrite file ID, construct the URL
    const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
    const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '685bcfb7001103824569';
    const bucketId = import.meta.env.VITE_APPWRITE_STORAGE_BUCKET_ID || '6873ba8f00060c027d7c';

    return `${endpoint}/storage/buckets/${bucketId}/files/${imageId}/view?project=${projectId}`;
  };

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-white to-brand-light">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {defaultTitle}
          </h2>
          <p className="text-brand-gray max-w-3xl mx-auto">
            {defaultDescription}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
          {isLoading ? (
            // Loading skeletons
            Array(3).fill(null).map((_, idx) => (
              <div key={`loading-${idx}`} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <Skeleton className="h-48 w-full" />
                <div className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))
          ) : hasData ? (
            // Map through actual data for individual cards only
            areas.map((area, index) => (
              <motion.div
                key={area.$id}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="h-48 overflow-hidden">
                  <img
                    src={getImageUrl(area.image)}
                    alt={area.title}
                    className="w-full h-full object-cover transition-transform hover:scale-110 duration-500"
                    onError={(e) => {
                      // Fallback to default image if loading fails
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1559081286-70366a286898?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80';
                    }}
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">{area.title}</h3>
                  <p className="text-brand-gray">{area.description}</p>
                </div>
              </motion.div>
            ))
          ) : (
            // Fallback content for individual cards when no data
            <>
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Residential Solar"
                    className="w-full h-48 object-cover transition-transform hover:scale-110 duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Residential Solar</h3>
                  <p className="text-brand-gray">Custom solar solutions for homeowners, designed to maximize energy savings while enhancing property value.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1553817684-776078ebc7be?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Commercial Solar"
                    className="w-full h-48 object-cover transition-transform hover:scale-110 duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Commercial Solar</h3>
                  <p className="text-brand-gray">Comprehensive solar energy systems for businesses and commercial properties, reducing operational costs.</p>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="h-48 overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1613665813446-82a78c468a1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"
                    alt="Industrial Solar"
                    className="w-full h-48 object-cover transition-transform hover:scale-110 duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3">Industrial Solar</h3>
                  <p className="text-brand-gray">Large-scale solar installations for industrial facilities, providing sustainable power for manufacturing operations.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default SpecializedAreas;
