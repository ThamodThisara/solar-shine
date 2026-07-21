
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import { CheckCircle, Award, Users, Clock, Shield, Smile, Star, Zap, Target, Heart } from 'lucide-react';
import { getAboutContent, AboutContent } from '@/services/whoweareService';
import { Skeleton } from '@/components/ui/skeleton';

// Icon mapping for dynamic icons - must match iconOptions from WhoweareManager.tsx
const iconMap = {
    'award': Award,
    'shield': Shield,
    'smile': Smile,
    'check-circle': CheckCircle,
    'clock': Clock,
    'users': Users,
    'star': Star,
    'zap': Zap,
    'target': Target,
    'heart': Heart,
};

const WhoWeAre: React.FC = () => {
    const { data: aboutContent, isLoading, error } = useQuery<AboutContent>({
        queryKey: ['aboutContent'],
        queryFn: getAboutContent,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    if (error) {
        toast.error('Failed to load content. Please try again later.');
        console.error(error);
    }

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <Skeleton className="h-10 w-64 mb-4" />
                    <Skeleton className="h-4 w-3/4 max-w-md mb-2" />
                    <Skeleton className="h-4 w-2/3 max-w-md" />
                </div>
            );
        }

        if (!aboutContent) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[50vh]">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Content Not Available</h2>
                        <p className="text-gray-600">Unable to load page content. Please try again later.</p>
                    </div>
                </div>
            );
        }

        return (
            <>
                {/* Hero Section */}
                <section className="relative flex items-center justify-center overflow-hidden py-20 sm:py-24 min-h-[55vh] md:min-h-[60vh]">
                    <div className="absolute inset-0 z-0">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40 z-10" />
                        <img
                            src={aboutContent.main_image || "https://images.unsplash.com/photo-1497440001374-f26997328c1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"}
                            alt="Solar team"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://images.unsplash.com/photo-1497440001374-f26997328c1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80";
                            }}
                        />
                    </div>
                    <div className="container-custom relative z-20 text-center text-white">
                        <motion.h1
                            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            {aboutContent.title || "Who We Are"}
                        </motion.h1>
                        <motion.p
                            className="text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                        >
                            {aboutContent.subtitle || "A leading solar energy provider committed to powering a sustainable future across Sri Lanka"}
                        </motion.p>
                    </div>
                </section>

                {/* Mission and Vision */}
                <section className="py-16 sm:py-24 bg-gray-50">
                    <div className="container-custom">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            <motion.div
                                className="space-y-4"
                                initial={{ opacity: 0, x: -50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6 }}
                            >
                                <h2 className="text-3xl font-bold text-gray-900">Our Mission</h2>
                                <p className="text-lg text-gray-600">
                                    {aboutContent.mission_statement || "To empower communities with sustainable and affordable solar energy solutions, driving a cleaner future for generations to come."}
                                </p>
                            </motion.div>
                            <motion.div
                                className="space-y-4"
                                initial={{ opacity: 0, x: 50 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: 0.2 }}
                            >
                                <h2 className="text-3xl font-bold text-gray-900">Our Vision</h2>
                                <p className="text-lg text-gray-600">
                                    {aboutContent.vision_statement || "To be a leading force in the global transition to renewable energy, making solar power accessible to everyone, everywhere."}
                                </p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Our Values */}
                <section className="py-20 px-4 bg-brand-light">
                    <div className="container-custom">
                        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Our Core Values</h2>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {aboutContent.values?.map((value, index) => {
                                // Check if the icon is a custom uploaded image or a predefined icon
                                const isCustomIcon = value.icon && (value.icon.startsWith('http') || value.icon.startsWith('data:'));
                                const iconKey = !isCustomIcon ? value.icon : null; // Don't convert to lowercase since we're using consistent names
                                const IconComponent = iconKey ? iconMap[iconKey as keyof typeof iconMap] : null;
                                
                                return (
                                    <motion.div
                                        key={value.$id}
                                        className="bg-white p-6 rounded-lg shadow-md"
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.1 }}
                                    >
                                        <div className="bg-primary/10 w-14 h-14 rounded-full flex items-center justify-center mb-4">
                                            {isCustomIcon ? (
                                                <img 
                                                    src={value.icon} 
                                                    alt={`${value.title} icon`}
                                                    className="w-8 h-8 object-contain"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        // Fallback to default icon if image fails to load
                                                        const fallbackIcon = document.createElement('div');
                                                        fallbackIcon.innerHTML = '<svg class="w-8 h-8 text-primary" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>';
                                                        target.parentNode?.appendChild(fallbackIcon);
                                                    }}
                                                />
                                            ) : (
                                                IconComponent ? (
                                                    <IconComponent className="text-primary" size={24} />
                                                ) : (
                                                    // Fallback icon when no predefined icon is found
                                                    <Award className="text-primary" size={24} />
                                                )
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                                        <p className="text-brand-gray">{value.description}</p>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* Team Section */}
                <section className="py-16 sm:py-24">
                    <div className="container-custom">
                        <div className="text-center">
                            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Meet Our Experts</h2>
                            <p className="mt-4 text-lg leading-8 text-gray-600">
                                A dedicated team of professionals committed to excellence.
                            </p>
                        </div>
                        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <Skeleton key={i} className="h-96 w-full" />
                                ))
                            ) : (
                                aboutContent.team_members?.map((member) => (
                                    <motion.div
                                        key={member.$id}
                                        className="bg-white p-6 rounded-lg shadow-lg text-center"
                                        initial={{ opacity: 0, y: 50 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5 }}
                                    >
                                        <img
                                            className="mx-auto h-24 w-24 rounded-full object-cover"
                                            src={member.image || "/placeholder.svg"}
                                            alt={member.name}
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = "/placeholder.svg";
                                            }}
                                        />
                                        <h3 className="mt-6 text-base font-semibold leading-7 tracking-tight text-gray-900">{member.name}</h3>
                                        <p className="text-sm leading-6 text-gray-600">{member.position}</p>
                                        {member.bio && (
                                            <p className="mt-2 text-xs text-gray-500">{member.bio}</p>
                                        )}
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </section>

                {/* Company History */}
                <section className="py-20 px-4 bg-brand-dark text-white">
                    <div className="container-custom">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Journey</h2>
                            <p className="text-xl text-white/80 max-w-3xl mx-auto">
                                Since our founding, we've grown from a small team with a big vision to become one of Sri Lanka's most trusted solar providers.
                            </p>
                        </div>

                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-1/2 transform -translate-x-1/2 h-full w-1 bg-primary"></div>

                            <div className="space-y-12">
                                {aboutContent.milestones?.map((milestone, index) => (
                                    <motion.div
                                        key={milestone.$id}
                                        className={`relative flex ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center`}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.5, delay: index * 0.2 }}
                                    >
                                        {/* Timeline dot */}
                                        <div className="absolute left-1/2 transform -translate-x-1/2 w-5 h-5 rounded-full bg-primary border-4 border-brand-dark z-10"></div>

                                        {/* Content */}
                                        <div className="w-full md:w-5/12 bg-brand-black/50 p-6 rounded-lg">
                                            <div className="font-bold text-primary text-xl mb-2">{milestone.year}</div>
                                            <h3 className="text-xl font-bold mb-2">{milestone.title}</h3>
                                            <p className="text-white/80">{milestone.description}</p>
                                        </div>

                                        <div className="w-full md:w-5/12"></div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-16 bg-primary">
                    <div className="container-custom text-center">
                        <h2 className="text-3xl font-bold mb-6">
                            {aboutContent.cta_title || "Ready to Work With Us?"}
                        </h2>
                        <p className="text-lg max-w-2xl mx-auto mb-8">
                            {aboutContent.cta_description || "Join us in our mission to create a more sustainable future through solar energy."}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <a
                                href="/contact"
                                className="bg-brand-black text-white px-8 py-3 rounded-md inline-block hover:bg-brand-black/90 transition-colors"
                            >
                                {aboutContent.contact_button_text || "Contact Us"}
                            </a>
                            <a
                                href="/projects"
                                className="bg-transparent border-2 border-brand-black text-brand-black px-8 py-3 rounded-md inline-block hover:bg-brand-black/10 transition-colors"
                            >
                                {aboutContent.projects_button_text || "View Our Projects"}
                            </a>
                        </div>
                    </div>
                </section>
            </>
        );
    };

    return (
        <>
            <Header />
            <main className="pt-20 min-h-screen">
                {renderContent()}
            </main>
            <Footer />
        </>
    );
};

export default WhoWeAre;