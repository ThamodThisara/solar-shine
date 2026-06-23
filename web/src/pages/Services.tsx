
import React, { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { BadgeCheck, Sun, Battery, Wrench, BarChart3, Zap, Shield, Home, Building, Factory, Settings, Lightbulb, CheckCircle, Star, Heart } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchServicesBanner } from '@/services/servicesBannerService';
import { fetchServiceCards } from '@/services/serviceCardService';
import { fetchAdditionalServices } from '@/services/additionalServiceService';
import { fetchServiceProcessSteps } from '@/services/serviceProcessService';
import { storage, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { ServicesBanner, ServiceCard, AdditionalService, ServiceProcessStep } from '@/types/payload-types';



const processTitle = "Our Service Process";

const Services: React.FC = () => {
  const [activeService, setActiveService] = useState<string | null>(null);
  const [bannerData, setBannerData] = useState<ServicesBanner | null>(null);
  const [isLoadingBanner, setIsLoadingBanner] = useState(true);
  const [services, setServices] = useState<ServiceCard[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
  const [isLoadingAdditionalServices, setIsLoadingAdditionalServices] = useState(true);
  const [processSteps, setProcessSteps] = useState<ServiceProcessStep[]>([]);
  const [isLoadingProcessSteps, setIsLoadingProcessSteps] = useState(true);

  useEffect(() => {
    loadBannerData();
    loadServices();
    loadAdditionalServices();
    loadProcessSteps();
  }, []);

  const loadBannerData = async () => {
    try {
      const data = await fetchServicesBanner();
      setBannerData(data);
    } catch (error) {
      console.error('Error loading services banner:', error);
    } finally {
      setIsLoadingBanner(false);
    }
  };

  const loadServices = async () => {
    try {
      setIsLoadingServices(true);
      const services = await fetchServiceCards();
      // Sort services by order_index
      const sortedServices = services.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

      setServices(sortedServices);

      // Set the first service as active if available
      if (sortedServices.length > 0 && !activeService) {
        setActiveService(sortedServices[0].$id);
      }
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const loadAdditionalServices = async () => {
    try {
      setIsLoadingAdditionalServices(true);
      const additionalServicesData = await fetchAdditionalServices();
      // Sort by order_index
      const sortedAdditionalServices = additionalServicesData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setAdditionalServices(sortedAdditionalServices);
    } catch (error) {
      console.error('Error loading additional services:', error);
    } finally {
      setIsLoadingAdditionalServices(false);
    }
  };

  const loadProcessSteps = async () => {
    try {
      setIsLoadingProcessSteps(true);
      const processStepsData = await fetchServiceProcessSteps();
      // Sort by order_index
      const sortedProcessSteps = processStepsData.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
      setProcessSteps(sortedProcessSteps);
    } catch (error) {
      console.error('Error loading process steps:', error);
    } finally {
      setIsLoadingProcessSteps(false);
    }
  };

  // Helper function to render icons dynamically
  const renderIcon = (iconName: string) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      Sun,
      Battery,
      Wrench,
      BarChart3,
      Zap,
      Shield,
      Home,
      Building,
      Factory,
      Settings,

      Lightbulb,
      CheckCircle,
      Star,
      Heart
    };

    const IconComponent = iconMap[iconName];
    if (IconComponent) {
      return <IconComponent className="text-primary" size={24} />;
    }

    // Fallback to first letter if icon not found
    return (
      <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-medium text-primary">
        {iconName.charAt(0)}
      </div>
    );
  };



  // Helper function to get image URL from Appwrite storage
  const getImageUrl = (imageId: string | null | undefined): string | null => {
    if (!imageId) return null;

    try {
      // If it's already a full URL, return it as is
      if (imageId.startsWith('http')) {
        return imageId;
      }

      // Get the direct file URL from Appwrite storage
      const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, imageId);
      return String(fileUrl);
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };

  // Helper function to parse features from string format
  const parseFeatures = (features: string[]) => {
    return features.map(feature => {
      const colonIndex = feature.indexOf(':');
      if (colonIndex !== -1) {
        return {
          name: feature.substring(0, colonIndex).trim(),
          description: feature.substring(colonIndex + 1).trim()
        };
      }
      return {
        name: feature,
        description: ''
      };
    });
  };

  return (
    <>
      <Header />
      <main className="pt-20 min-h-screen">
        {/* Hero Section */}
        <section className="relative h-[50vh] md:h-[60vh] flex items-center justify-center overflow-hidden">
          {isLoadingBanner ? (
            <div className="absolute inset-0 z-0 bg-gray-200 animate-pulse" />
          ) : bannerData?.background_image ? (
            <div className="absolute inset-0 z-0">
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 z-10" />
              <img
                src={getImageUrl(bannerData.background_image) || ''}
                alt="Solar services"
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="absolute inset-0 z-0 bg-gradient-to-br from-blue-600 to-green-600" />
          )}

          <div className="container-custom relative z-20 text-center text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              {bannerData?.title || "Our Solar Services"}
            </h1>
            <p className="text-xl md:text-2xl max-w-3xl mx-auto">
              {bannerData?.subtitle || "Comprehensive solar energy solutions for residential, commercial, and industrial clients"}
            </p>
          </div>
        </section>

        {/* Main Services */}
        <section className="py-20 px-4">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
              <p className="text-lg text-brand-gray max-w-3xl mx-auto">
                We provide comprehensive solar solutions tailored to different sectors, each with unique energy requirements and considerations.
              </p>
            </div>

            {isLoadingServices ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-brand-gray">Loading services...</p>
              </div>
            ) : services.length > 0 ? (
              <>
                {/* Service Tabs */}
                <div className="flex flex-wrap justify-center gap-4 mb-12">
                  {services.map((service) => (
                    <button
                      key={service.$id}
                      onClick={() => setActiveService(service.$id)}
                      className={`px-6 py-3 rounded-full transition-colors ${activeService === service.$id
                        ? "bg-primary text-black"
                        : "bg-white border border-gray-200 hover:border-primary"
                        }`}
                    >
                      {service.title}
                    </button>
                  ))}
                </div>

                {/* Active Service Content */}
                {services.map((service) => {
                  const parsedFeatures = parseFeatures(service.features || []);

                  return (
                    <div
                      key={service.$id}
                      className={`${activeService === service.$id ? 'block' : 'hidden'}`}
                    >
                      <motion.div
                        className="grid md:grid-cols-2 gap-10 items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                      >
                        <div>
                          <h3 className="text-3xl font-bold mb-4">{service.title}</h3>
                          <p className="text-lg text-brand-gray mb-6">{service.description}</p>

                          {service.benefits && service.benefits.length > 0 && (
                            <>
                              <h4 className="text-xl font-bold mb-3">Key Benefits</h4>
                              <ul className="space-y-2 mb-6">
                                {service.benefits.map((benefit, index) => (
                                  <li key={index} className="flex items-start">
                                    <BadgeCheck className="h-5 w-5 text-primary mr-2 flex-shrink-0 mt-1" />
                                    <span>{benefit}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}

                          {parsedFeatures.length > 0 && (
                            <>
                              <h4 className="text-xl font-bold mb-3">Features</h4>
                              <div className="space-y-4">
                                {parsedFeatures.map((feature, index) => (
                                  <div key={index}>
                                    <h5 className="font-bold">{feature.name}</h5>
                                    {feature.description && (
                                      <p className="text-gray-400">{feature.description}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </>
                          )}

                          <div className="mt-8">
                            <a
                              href="/contact"
                              className="btn-primary inline-block"
                            >
                              Enquire About This Service
                            </a>
                          </div>
                        </div>

                        <div className="rounded-lg overflow-hidden shadow-lg">
                          {service.image ? (
                            (() => {
                              const imageUrl = getImageUrl(service.image);
                              return imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={service.title}
                                  className="w-full h-full object-cover transition-opacity duration-300"
                                  onError={() => {
                                    // If image failed to load, show fallback
                                    console.error('Image failed to load for service:', service.title);
                                  }}
                                />
                              ) : (
                                <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                                  <div className="text-4xl text-gray-400">📷</div>
                                </div>
                              );
                            })()
                          ) : (
                            <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
                              <div className="text-4xl text-gray-400">📷</div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-brand-gray text-lg">No main services available at the moment.</p>
                <p className="text-brand-gray">Please check back later or contact us for more information.</p>
              </div>
            )}
          </div>
        </section>

        {/* Additional Services */}
        <section className="py-20 px-4 bg-brand-light">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Additional Services</h2>
              <p className="text-lg text-brand-gray max-w-3xl mx-auto">
                Beyond our core offerings, we provide these specialized services to enhance your solar experience.
              </p>
            </div>

            {isLoadingAdditionalServices ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-brand-gray">Loading additional services...</p>
              </div>
            ) : additionalServices.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {additionalServices.map((service, index) => (
                  <motion.div
                    key={service.$id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  >
                    <Card className="h-full">
                      <CardHeader>
                        <div className="bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                          {renderIcon(service.icon)}
                        </div>
                        <CardTitle>{service.title}</CardTitle>
                        <CardDescription>{service.description}</CardDescription>
                      </CardHeader>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-brand-gray">
                <p>No additional services available at the moment.</p>
                <p>Please check back later or contact us for more information.</p>
              </div>
            )}
          </div>
        </section>

        {/* Service Process */}
        <section className="py-20 px-4">
          <div className="container-custom">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">{processTitle}</h2>
              <p className="text-lg text-brand-gray max-w-3xl mx-auto">
                Our streamlined process ensures a smooth experience from initial consultation to system activation.
              </p>
            </div>

            <div className="relative">
              {/* Process line */}
              <div className="absolute left-[26px] top-0 h-full w-1 bg-gray-200 hidden md:block"></div>

              {isLoadingProcessSteps ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-brand-gray">Loading process steps...</p>
                </div>
              ) : processSteps.length > 0 ? (
                <div className="space-y-8">
                  {processSteps.map((step, index) => (
                    <motion.div
                      key={step.$id}
                      className="flex gap-6"
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                    >
                      <div className="relative">
                        <div className="bg-primary text-black w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg z-10 relative">
                          {step.number}
                        </div>
                      </div>
                      <div className="flex-1 bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                        <p className="text-brand-gray">{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-brand-gray">
                  <p>No process steps available at the moment.</p>
                  <p>Please check back later or contact us for more information.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 px-4 bg-primary">
          <div className="container-custom text-center">
            <h2 className="text-3xl font-bold mb-6">Ready to Get Started?</h2>
            <p className="text-lg max-w-2xl mx-auto mb-8">
              Contact us today for a free consultation and take the first step towards energy independence.
            </p>
            <a
              href="/contact"
              className="bg-brand-black text-white px-8 py-3 rounded-md inline-block hover:bg-brand-black/90 transition-colors"
            >
              Request a Free Quote
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
};

export default Services;
