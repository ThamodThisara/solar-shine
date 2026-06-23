
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import ServiceCards from '@/components/home/ServiceCards';
import SpecializedAreas from '@/components/home/SpecializedAreas';
import ProjectsShowcase from '@/components/home/ProjectsShowcase';
import TestimonialsSection from '@/components/home/TestimonialsSection';
import BlogSection from '@/components/home/BlogSection';
import AppointmentSection from '@/components/home/AppointmentSection';
import SEOHead from '@/components/common/SEOHead';
import { HeroSection as HeroSectionType, ServiceCard, Project, Testimonial, BlogPost } from '@/types/payload-types';
import { fetchHeroSection, fetchServiceCards, fetchProjects, fetchTestimonials, fetchBlogPosts } from '@/services/cmsService';

const Index: React.FC = () => {
  const { 
    data: heroData, 
    isLoading: heroLoading,
    error: heroError
  } = useQuery({
    queryKey: ['heroSection'],
    queryFn: fetchHeroSection
  });

  const { 
    data: serviceCards, 
    isLoading: servicesLoading,
    error: servicesError
  } = useQuery({
    queryKey: ['serviceCards'],
    queryFn: fetchServiceCards
  });

  const { 
    data: projects, 
    isLoading: projectsLoading,
    error: projectsError
  } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  });

  const { 
    data: testimonials, 
    isLoading: testimonialsLoading,
    error: testimonialsError
  } = useQuery({
    queryKey: ['testimonials'],
    queryFn: fetchTestimonials
  });

  const { 
    data: blogPosts, 
    isLoading: blogLoading,
    error: blogError
  } = useQuery({
    queryKey: ['blogPosts'],
    queryFn: fetchBlogPosts
  });

  // Show error toasts for any fetch failures
  useEffect(() => {
    if (heroError) toast.error("Failed to load hero section");
    if (servicesError) toast.error("Failed to load services");
    if (projectsError) toast.error("Failed to load projects");
    if (testimonialsError) toast.error("Failed to load testimonials");
    if (blogError) toast.error("Failed to load blog posts");
  }, [heroError, servicesError, projectsError, testimonialsError, blogError]);

  const isLoading = heroLoading || servicesLoading || projectsLoading || testimonialsLoading || blogLoading;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <SEOHead pagePath="/" />
      <Header />
      <main>
        {heroData && <HeroSection data={heroData} />}
        {serviceCards && <ServiceCards services={serviceCards} />}
        <SpecializedAreas />
        {projects && <ProjectsShowcase projects={projects} />}
        {testimonials && <TestimonialsSection testimonials={testimonials} />}
        {blogPosts && <BlogSection posts={blogPosts} />}
        <AppointmentSection />
      </main>
      <Footer />
    </>
  );
};

export default Index;
