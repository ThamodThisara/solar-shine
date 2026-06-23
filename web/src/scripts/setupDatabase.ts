import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const endpoint = process.env.VITE_APPWRITE_ENDPOINT;
const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'main';

console.log('🚀 Solar Shine Web - Database Setup Script');
console.log('==========================================');

if (!endpoint || !projectId) {
  console.error('❌ Appwrite credentials missing!');
  console.error('');
  console.error('Please create a .env file with:');
  console.error('VITE_APPWRITE_ENDPOINT=your-endpoint');
  console.error('VITE_APPWRITE_PROJECT_ID=your-project-id');
  console.error('VITE_APPWRITE_DATABASE_ID=main');
  console.error('VITE_APPWRITE_STORAGE_BUCKET_ID=media');
  console.error('');
  console.error('📋 Follow these steps:');
  console.error('1. Go to https://cloud.appwrite.io');
  console.error('2. Create a new project');
  console.error('3. Copy your project ID');
  console.error('4. Update your .env file');
  process.exit(1);
}

console.log('✅ Environment variables found:');
console.log(`   Endpoint: ${endpoint}`);
console.log(`   Project ID: ${projectId}`);
console.log(`   Database ID: ${databaseId}`);
console.log('');

console.log('🔧 Automated Database Setup with Appwrite CLI');
console.log('==============================================');
console.log('');
console.log('⚡ Quick Setup (Recommended):');
console.log('   Your project already has an appwrite.json file with all collections configured!');
console.log('   Collections included:');
console.log('      - global_settings (Site configuration)');
console.log('      - hero_section (Homepage hero)');
console.log('      - services_banner (Services page banner)');
console.log('      - service_cards (Service offerings)');
console.log('      - projects (Portfolio projects)');
console.log('      - blog_posts (Blog content)');
console.log('      - navigation_items (Header/footer navigation)');
console.log('      - seo_settings (Global SEO configuration)');
console.log('      - page_seo (Page-specific SEO)');
console.log('      - testimonials (Customer testimonials)');
console.log('      - specialized_areas (Service specializations)');
console.log('');
console.log('   🚀 Simply run: appwrite push collections');
console.log('   💡 This will create all collections from the appwrite.json file automatically!');
console.log('');
console.log('📋 Prerequisites:');
console.log('1. Install Appwrite CLI: npm install -g appwrite-cli');
console.log('2. Login to Appwrite: appwrite login');
console.log('3. Initialize project: appwrite init project');
console.log('');
console.log('📋 Step-by-step Setup Commands:');
console.log('');

console.log('1️⃣  Initialize collections:');
console.log('   appwrite init collections');
console.log('');

console.log('2️⃣  Create database and collections using CLI:');
console.log('');

const collections = [
  { 
    id: 'global_settings', 
    name: 'Global Settings',
    attributes: [
      { key: 'site_title', type: 'string', size: 255, required: true },
      { key: 'site_description', type: 'string', size: 500, required: false },
      { key: 'contact_email', type: 'string', size: 255, required: false },
      { key: 'contact_phone', type: 'string', size: 50, required: false },
      { key: 'address', type: 'string', size: 500, required: false }
    ]
  },
  { 
    id: 'hero_section', 
    name: 'Hero Section',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'subtitle', type: 'string', size: 500, required: false },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'background_image', type: 'string', size: 255, required: false }
    ]
  },
  { 
    id: 'services_banner', 
    name: 'Services Banner',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'subtitle', type: 'string', size: 500, required: false },
      { key: 'background_image', type: 'string', size: 255, required: false }
    ]
  },
  { 
    id: 'service_cards', 
    name: 'Service Cards',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 500, required: false },
      { key: 'icon', type: 'string', size: 100, required: false },
      { key: 'link_url', type: 'string', size: 255, required: false },
      { key: 'order_index', type: 'integer', required: false }
    ]
  },
  { 
    id: 'additional_services', 
    name: 'Additional Services',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 500, required: false },
      { key: 'icon', type: 'string', size: 100, required: true },
      { key: 'order_index', type: 'integer', required: false }
    ]
  },
  { 
    id: 'service_process_steps', 
    name: 'Service Process Steps',
    attributes: [
      { key: 'number', type: 'string', size: 10, required: true },
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 500, required: true },
      { key: 'order_index', type: 'integer', required: false }
    ]
  },
  {
    id: 'portfolio_projects',
    name: 'Portfolio Projects',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'image_url', type: 'string', size: 255, required: false },
      { key: 'category', type: 'string', size: 100, required: false },
      { key: 'completion_date', type: 'datetime', required: false },
      { key: 'featured', type: 'boolean', required: false }
    ]
  },
  { 
    id: 'blog_posts', 
    name: 'Blog Posts',
    attributes: [
      { key: 'title', type: 'string', size: 255, required: true },
      { key: 'slug', type: 'string', size: 255, required: true },
      { key: 'excerpt', type: 'string', size: 500, required: false },
      { key: 'content', type: 'string', size: 10000, required: false },
      { key: 'featured_image', type: 'string', size: 255, required: false },
      { key: 'published', type: 'boolean', required: false },
      { key: 'author', type: 'string', size: 100, required: false }
    ]
  },
  { 
    id: 'navigation_items', 
    name: 'Navigation Items',
    attributes: [
      { key: 'title', type: 'string', size: 100, required: true },
      { key: 'path', type: 'string', size: 255, required: true },
      { key: 'order', type: 'integer', required: true }
    ]
  },
  { 
    id: 'seo_settings', 
    name: 'SEO Settings',
    attributes: [
      { key: 'site_title', type: 'string', size: 255, required: true },
      { key: 'site_description', type: 'string', size: 500, required: false },
      { key: 'site_keywords', type: 'string', size: 500, required: false },
      { key: 'author', type: 'string', size: 100, required: false },
      { key: 'site_url', type: 'string', size: 255, required: false },
      { key: 'default_og_image', type: 'string', size: 255, required: false },
      { key: 'twitter_handle', type: 'string', size: 100, required: false },
      { key: 'facebook_app_id', type: 'string', size: 100, required: false },
      { key: 'google_analytics_id', type: 'string', size: 100, required: false },
      { key: 'google_search_console_id', type: 'string', size: 255, required: false },
      { key: 'robots_txt', type: 'string', size: 1000, required: false },
      { key: 'sitemap_url', type: 'string', size: 255, required: false }
    ]
  },
  { 
    id: 'page_seo', 
    name: 'Page SEO',
    attributes: [
      { key: 'page_path', type: 'string', size: 255, required: true },
      { key: 'page_title', type: 'string', size: 255, required: true },
      { key: 'meta_description', type: 'string', size: 500, required: false },
      { key: 'meta_keywords', type: 'string', size: 500, required: false },
      { key: 'og_title', type: 'string', size: 255, required: false },
      { key: 'og_description', type: 'string', size: 500, required: false },
      { key: 'og_image', type: 'string', size: 255, required: false },
      { key: 'canonical_url', type: 'string', size: 255, required: false }
    ]
  },
  { 
    id: 'testimonials', 
    name: 'Testimonials',
    attributes: [
      { key: 'text', type: 'string', size: 1000, required: true },
      { key: 'author', type: 'string', size: 100, required: true },
      { key: 'position', type: 'string', size: 100, required: false },
      { key: 'company', type: 'string', size: 100, required: false },
      { key: 'rating', type: 'integer', required: false, min: 1, max: 5 }
    ]
  },
  { 
    id: 'specialized_areas', 
    name: 'Specialized Areas',
    attributes: [
      { key: 'title', type: 'string', size: 100, required: true },
      { key: 'description', type: 'string', size: 1000, required: false },
      { key: 'image', type: 'string', size: 255, required: false },
      { key: 'order', type: 'integer', required: false }
    ]
  }
];

collections.forEach((collection, index) => {
  console.log(`${index + 1}. Create ${collection.name} collection:`);
  console.log(`   appwrite databases create-collection \\`);
  console.log(`     --database-id ${databaseId} \\`);
  console.log(`     --collection-id ${collection.id} \\`);
  console.log(`     --name "${collection.name}" \\`);
  console.log(`     --permissions 'read("any")' 'create("users")' 'update("users")' 'delete("users")'`);
  console.log('');
  
  console.log(`   Add attributes for ${collection.name}:`);
  collection.attributes.forEach((attr, attrIndex) => {
    if (attr.type === 'string') {
      console.log(`   appwrite databases create-string-attribute \\`);
      console.log(`     --database-id ${databaseId} \\`);
      console.log(`     --collection-id ${collection.id} \\`);
      console.log(`     --key ${attr.key} \\`);
      console.log(`     --size ${(attr as any).size} \\`);
      console.log(`     --required ${attr.required}`);
    } else if (attr.type === 'integer') {
      console.log(`   appwrite databases create-integer-attribute \\`);
      console.log(`     --database-id ${databaseId} \\`);
      console.log(`     --collection-id ${collection.id} \\`);
      console.log(`     --key ${attr.key} \\`);
      if ((attr as any).min !== undefined) console.log(`     --min ${(attr as any).min} \\`);
      if ((attr as any).max !== undefined) console.log(`     --max ${(attr as any).max} \\`);
      console.log(`     --required ${attr.required}`);
    } else if (attr.type === 'boolean') {
      console.log(`   appwrite databases create-boolean-attribute \\`);
      console.log(`     --database-id ${databaseId} \\`);
      console.log(`     --collection-id ${collection.id} \\`);
      console.log(`     --key ${attr.key} \\`);
      console.log(`     --required ${attr.required}`);
    } else if (attr.type === 'datetime') {
      console.log(`   appwrite databases create-datetime-attribute \\`);
      console.log(`     --database-id ${databaseId} \\`);
      console.log(`     --collection-id ${collection.id} \\`);
      console.log(`     --key ${attr.key} \\`);
      console.log(`     --required ${attr.required}`);
    }
    console.log('');
  });
  console.log('');
});

console.log('3️⃣  Alternative: Use the appwrite.json configuration file');
console.log('   📄 Create an appwrite.json file in your project root:');
console.log('   Then run: appwrite push collections');
console.log('');

console.log('📚 Additional Resources:');
console.log('   - CLI Documentation: https://appwrite.io/docs/tooling/command-line/collections');
console.log('   - Setup Guide: APPWRITE_SETUP.md');
console.log('   - Quick Start: QUICK_START.md');
console.log('');

console.log('🎯 After database setup:');
console.log('   1. Run: pnpm dev');
console.log('   2. Visit: http://localhost:8080/login');
console.log('   3. Create your admin account');
console.log('   4. Access admin panel: http://localhost:8080/admin');
console.log('');

console.log('💡 Pro Tips:');
console.log('   - Use "appwrite pull collections" to sync existing collections');
console.log('   - Keep your appwrite.json file in version control');
console.log('   - Test collections with "appwrite databases list-collections"');
console.log('');

console.log('🎉 Ready to build your Solar Shine admin panel!');

process.exit(0);
