import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Debug environment variables
console.log('Environment variables loaded:');
console.log('VITE_APPWRITE_ENDPOINT:', process.env.VITE_APPWRITE_ENDPOINT);
console.log('VITE_APPWRITE_PROJECT_ID:', process.env.VITE_APPWRITE_PROJECT_ID);
console.log('VITE_APPWRITE_DATABASE_ID:', process.env.VITE_APPWRITE_DATABASE_ID);

import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite';

const DUMMY_IMAGE_URL = (width = 600, height = 400) => `https://placehold.co/${width}x${height}/orange/white?text=Solar+Shine`;

const seedDatabase = async () => {
  console.log('Starting database seed...');

  try {
    // Clear existing data (optional, use with caution)
    // console.log('Clearing existing data...');
    // for (const collectionId of Object.values(COLLECTIONS)) {
    //   const documents = await databases.listDocuments(DATABASE_ID, collectionId);
    //   for (const doc of documents.documents) {
    //     await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
    //   }
    // }
    // console.log('Existing data cleared.');

    // 1. Seed Global Settings
    console.log('Seeding Global Settings...');
    await databases.createDocument(DATABASE_ID, COLLECTIONS.GLOBAL_SETTINGS, ID.unique(), {
      site_title: 'Solar Shine',
      site_description: 'Your trusted partner for solar panel installation and maintenance.',
      contact_email: 'contact@solarshine.com',
      contact_phone: '+1 (555) 123-4567',
      address: '123 Solar Way, Sunville, CA 90210',
    });

    // 2. Seed Hero Section
    console.log('Seeding Hero Section...');
    await databases.createDocument(DATABASE_ID, COLLECTIONS.HERO_SECTION, ID.unique(), {
      title: 'Power Your Future with Solar Energy',
      subtitle: 'Reliable, Affordable, and Sustainable Solar Solutions',
      description: 'Join the green energy revolution and reduce your carbon footprint with our state-of-the-art solar panels. Get a free quote today!',
      cta_text: 'Get a Free Quote',
      cta_url: '/contact',
      background_image: DUMMY_IMAGE_URL(1920, 1080),
    });

    // 3. Seed Service Cards
    console.log('Seeding Service Cards...');
    const services = [
      { title: 'Residential Solar', description: 'Custom solar solutions for your home.', icon: 'home', link_url: '/services/residential', order_index: 1 },
      { title: 'Commercial Solar', description: 'Power your business with clean energy.', icon: 'business', link_url: '/services/commercial', order_index: 2 },
      { title: 'Panel Maintenance', description: 'Ensuring your system runs at peak efficiency.', icon: 'maintenance', link_url: '/services/maintenance', order_index: 3 },
    ];
    for (const service of services) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.SERVICE_CARDS, ID.unique(), service);
    }

    // 4. Seed Projects
    console.log('Seeding Projects...');
    const projects = [
      { title: 'Sunville Family Home', category: 'Residential', completion_date: new Date().toISOString(), featured: true, image_url: DUMMY_IMAGE_URL(800, 600), description: 'A 10kW system for a modern family home.' },
      { title: 'Downtown Business Center', category: 'Commercial', completion_date: new Date().toISOString(), featured: true, image_url: DUMMY_IMAGE_URL(800, 600), description: 'A 100kW installation for a large commercial building.' },
      { title: 'Industrial Warehouse Power', category: 'Industrial', completion_date: new Date().toISOString(), featured: false, image_url: DUMMY_IMAGE_URL(800, 600), description: 'Powering a massive warehouse complex with solar.' },
    ];
    for (const project of projects) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.PORTFOLIO_PROJECTS, ID.unique(), project);
    }

    // 5. Seed Blog Posts
    console.log('Seeding Blog Posts...');
    const posts = [
      { 
        title: 'The Benefits of Switching to Solar Power', 
        slug: 'benefits-of-solar-power', 
        excerpt: 'Discover the top reasons to make the switch to clean, renewable solar energy.', 
        content: 'Full blog post content goes here...', 
        featured_image: DUMMY_IMAGE_URL(800, 400), 
        published: true, 
        publishDate: new Date().toISOString(), 
        author: 'Jane Doe',
        categories: ['Education', 'Residential']
      },
      { 
        title: 'How to Maintain Your Solar Panels', 
        slug: 'how-to-maintain-solar-panels', 
        excerpt: 'A guide to keeping your solar panels in top condition for maximum efficiency.', 
        content: 'Full blog post content goes here...', 
        featured_image: DUMMY_IMAGE_URL(800, 400), 
        published: true, 
        publishDate: new Date().toISOString(), 
        author: 'John Smith',
        categories: ['Maintenance', 'Tips']
      },
      { 
        title: 'Solar Technology Innovations of 2025', 
        slug: 'solar-tech-innovations-2025', 
        excerpt: 'The latest breakthroughs in solar panel efficiency and smart home integration.', 
        content: 'Full blog post content goes here...', 
        featured_image: DUMMY_IMAGE_URL(800, 400), 
        published: true, 
        publishDate: new Date().toISOString(), 
        author: 'Sarah Chen',
        categories: ['Technology', 'Innovation']
      }
    ];
    for (const post of posts) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, ID.unique(), post);
    }

    // 6. Seed Navigation Items
    console.log('Seeding Navigation Items...');
    const navItems = [
      { title: 'Home', path: '/', order: 1 },
      { title: 'About Us', path: '/who-we-are', order: 2 },
      { title: 'Services', path: '/services', order: 3 },
      { title: 'Projects', path: '/projects', order: 4 },
      { title: 'Blog', path: '/blog', order: 5 },
      { title: 'Contact', path: '/contact', order: 6 },
    ];
    for (const item of navItems) {
      await databases.createDocument(DATABASE_ID, COLLECTIONS.NAVIGATION_ITEMS, ID.unique(), item);
    }

    // 7. Seed SEO Settings
    console.log('Seeding SEO Settings...');
    await databases.createDocument(DATABASE_ID, COLLECTIONS.SEO_SETTINGS, ID.unique(), {
      site_title: 'Solar Shine',
      site_description: 'Expert solar panel installation and maintenance services. Transform your home with clean, renewable energy solutions.',
      site_keywords: 'solar panels, solar energy, renewable energy, solar installation',
      author: 'Solar Shine Team',
      site_url: 'https://www.solarshine.com',
      default_og_image: DUMMY_IMAGE_URL(1200, 630),
      twitter_handle: '@solarshine',
    });

    // 8. Seed Page SEO
    console.log('Seeding Page SEO...');
    const pageSeoData = [
        { page_path: '/', page_title: 'Home | Solar Shine', meta_description: 'Welcome to Solar Shine, your expert in solar solutions.' },
        { page_path: '/who-we-are', page_title: 'About Us | Solar Shine', meta_description: 'Learn about our mission and our expert team.' },
    ];
    for (const seo of pageSeoData) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.PAGE_SEO, ID.unique(), seo);
    }

    // 9. Seed Testimonials
    console.log('Seeding Testimonials...');
    const testimonials = [
        { text: 'Solar Shine did an amazing job! Our energy bills have never been lower.', author: 'Alex Johnson', position: 'Homeowner', rating: 5 },
        { text: 'The entire process was smooth and professional. Highly recommended.', author: 'Samantha Bee', position: 'Business Owner', rating: 5 },
    ];
    for (const testimonial of testimonials) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, ID.unique(), testimonial);
    }

    // 10. Seed Specialized Areas
    console.log('Seeding Specialized Areas...');
    const areas = [
        { title: 'Grid-Tied Systems', description: 'Connect to the grid and sell back excess power.', image: DUMMY_IMAGE_URL(400,300), order: 1 },
        { title: 'Off-Grid Solutions', description: 'Complete energy independence for remote locations.', image: DUMMY_IMAGE_URL(400,300), order: 2 },
    ];
    for (const area of areas) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, ID.unique(), area);
    }

    // 11. Seed About Content
    console.log('Seeding About Content...');
    const teamMembers = [
        { name: 'Dr. Evelyn Reed', position: 'Founder & CEO', bio: 'A visionary leader in renewable energy.', image: DUMMY_IMAGE_URL(200,200) },
        { name: 'Ben Carter', position: 'Lead Engineer', bio: 'Expert in solar technology and system design.', image: DUMMY_IMAGE_URL(200,200) },
    ];
    await databases.createDocument(DATABASE_ID, COLLECTIONS.ABOUT_CONTENT, ID.unique(), {
        title: 'About Solar Shine',
        subtitle: 'Pioneering a Brighter, Greener Future',
        content: 'Since 2010, we have been on a mission to make solar energy accessible to everyone.',
        mission_statement: 'To provide high-quality, affordable solar solutions that empower communities and protect our planet.',
        vision_statement: 'A world where clean energy is the primary source of power for all.',
        team_members: JSON.stringify(teamMembers),
        main_image_id: DUMMY_IMAGE_URL(800,600),
    });

    // 12. Seed Company Info
    console.log('Seeding Company Info...');
    await databases.createDocument(DATABASE_ID, COLLECTIONS.COMPANY_INFO, ID.unique(), {
        name: 'Solar Shine Inc.',
        description: 'Leading the charge in renewable energy solutions.',
        address: '123 Solar Way, Sunville, CA 90210',
        email: 'info@solarshine.com',
        phone: '+1 (555) 123-4567',
    });

    // 13. Seed Social Links
    console.log('Seeding Social Links...');
    const socialLinks = [
        { name: 'Facebook', url: 'https://facebook.com', icon: 'facebook', order: 1 },
        { name: 'Twitter', url: 'https://twitter.com', icon: 'twitter', order: 2 },
        { name: 'LinkedIn', url: 'https://linkedin.com', icon: 'linkedin', order: 3 },
    ];
    for (const link of socialLinks) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.SOCIAL_LINKS, ID.unique(), link);
    }

    // 14. Seed Footer Links
    console.log('Seeding Footer Links...');
    const footerLinks = [
        { name: 'Privacy Policy', url: '/privacy', category: 'Legal', order: 1 },
        { name: 'Terms of Service', url: '/terms', category: 'Legal', order: 2 },
        { name: 'Careers', url: '/careers', category: 'Company', order: 1 },
    ];
    for (const link of footerLinks) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.FOOTER_LINKS, ID.unique(), link);
    }

    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

// To run the script from the command line
const run = async () => {
    await seedDatabase();
    process.exit(0);
};

run();
