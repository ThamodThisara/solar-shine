import * as dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

const DUMMY_IMAGE_URL = (width = 600, height = 400) => `https://placehold.co/${width}x${height}/orange/white?text=Solar+Shine`;

const seedDatabase = async () => {
  console.log('Starting database seed...');

  // Debug environment variables
  console.log('Environment variables loaded:');
  console.log('VITE_APPWRITE_ENDPOINT:', process.env.VITE_APPWRITE_ENDPOINT);
  console.log('VITE_APPWRITE_PROJECT_ID:', process.env.VITE_APPWRITE_PROJECT_ID);
  console.log('VITE_APPWRITE_DATABASE_ID:', process.env.VITE_APPWRITE_DATABASE_ID);

  // Use dynamic import for appwrite
  const appwriteModule = await import('appwrite');
  console.log('Appwrite module keys:', Object.keys(appwriteModule));
  console.log('Default export keys:', Object.keys(appwriteModule.default));
  
  const { Client, Databases, ID } = appwriteModule.default;

  const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT!)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID!);

  const databases = new Databases(client);
  const DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID!;

  const COLLECTIONS = {
    GLOBAL_SETTINGS: 'global_settings',
    HERO_SECTION: 'hero_section',
    SERVICE_CARDS: 'service_cards',
    SPECIALIZED_AREAS: 'specialized_areas',
    PORTFOLIO_PROJECTS: 'portfolio_projects',
    TESTIMONIALS: 'testimonials',
    BLOG_POSTS: 'blog_posts',
    NAVIGATION_ITEMS: 'navigation_items',
    SOCIAL_LINKS: 'social_links',
    FOOTER_LINKS: 'footer_links',
    COMPANY_INFO: 'company_info',
    ABOUT_CONTENT: 'about_content',
    APPOINTMENTS: 'appointments',
    AVAILABLE_TIME_SLOTS: 'available_time_slots',
    SEO_SETTINGS: 'seo_settings',
    PAGE_SEO: 'page_seo',
  };

  try {
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
      { title: 'The Benefits of Switching to Solar Power', slug: 'benefits-of-solar-power', excerpt: 'Discover the top reasons to make the switch to clean, renewable solar energy.', content: 'Full blog post content goes here...', featured_image: DUMMY_IMAGE_URL(800, 400), published: true, publishDate: new Date().toISOString(), author: 'Jane Doe' },
      { title: 'How to Maintain Your Solar Panels', slug: 'how-to-maintain-solar-panels', excerpt: 'A guide to keeping your solar panels in top condition for maximum efficiency.', content: 'Full blog post content goes here...', featured_image: DUMMY_IMAGE_URL(800, 400), published: true, publishDate: new Date().toISOString(), author: 'John Smith' },
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

    // 8. Seed Testimonials
    console.log('Seeding Testimonials...');
    const testimonials = [
        { text: 'Solar Shine did an amazing job! Our energy bills have never been lower.', author: 'Alex Johnson', position: 'Homeowner', rating: 5 },
        { text: 'The entire process was smooth and professional. Highly recommended.', author: 'Samantha Bee', position: 'Business Owner', rating: 5 },
    ];
    for (const testimonial of testimonials) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.TESTIMONIALS, ID.unique(), testimonial);
    }

    // 9. Seed Specialized Areas
    console.log('Seeding Specialized Areas...');
    const areas = [
        { title: 'Grid-Tied Systems', description: 'Connect to the grid and sell back excess power.', image: DUMMY_IMAGE_URL(400,300), order: 1 },
        { title: 'Off-Grid Solutions', description: 'Complete energy independence for remote locations.', image: DUMMY_IMAGE_URL(400,300), order: 2 },
    ];
    for (const area of areas) {
        await databases.createDocument(DATABASE_ID, COLLECTIONS.SPECIALIZED_AREAS, ID.unique(), area);
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
