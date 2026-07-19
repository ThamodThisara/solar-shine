
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
import { fetchHomeContent, DEFAULT_HOME_CONTENT } from '@/services/homeContentService';

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

  const { data: homeContent } = useQuery({
    queryKey: ['homeContent'],
    queryFn: fetchHomeContent
  });

  // Fall back to defaults so headings render even before the query resolves.
  const home = homeContent ?? DEFAULT_HOME_CONTENT;

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
        {serviceCards && (
          <ServiceCards
            services={serviceCards}
            title={home.services_title}
            description={home.services_description}
          />
        )}
        <SpecializedAreas
          title={home.specialized_title}
          description={home.specialized_description}
        />
        {projects && (
          <ProjectsShowcase
            projects={projects}
            title={home.projects_title}
            description={home.projects_description}
          />
        )}
        {testimonials && (
          <TestimonialsSection
            testimonials={testimonials}
            title={home.testimonials_title}
            description={home.testimonials_description}
          />
        )}
        {blogPosts && (
          <BlogSection
            posts={blogPosts}
            title={home.blog_title}
            description={home.blog_description}
          />
        )}
        <AppointmentSection
          title={home.appointment_title}
          description={home.appointment_description}
        />
      </main>
      <Footer />
    </>
  );
};

export default Index;
