import { databases, storage, DATABASE_ID, STORAGE_BUCKET_ID, COLLECTIONS } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import type {
  GlobalSettings,
  HeroSection,
  ServiceCard,
  SpecializedArea,
  Project,
  Testimonial,
  BlogPost,
  NavigationItem,
  SocialLink,
  FooterLink,
  CompanyInfo,
  AboutContent
} from '@/types/payload-types';

// Generic CRUD operations
class AppwriteCRUDService<T> {
  constructor(private collectionId: string) {}

  async getAll(): Promise<T[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        this.collectionId,
        [Query.orderDesc('$createdAt')]
      );
      return response.documents as unknown as T[];
    } catch (error) {
      console.error(`Error fetching ${this.collectionId}:`, error);
      throw error;
    }
  }

  async getById(id: string): Promise<T> {
    try {
      const response = await databases.getDocument(
        DATABASE_ID,
        this.collectionId,
        id
      );
      return response as unknown as T;
    } catch (error) {
      console.error(`Error fetching ${this.collectionId} by ID:`, error);
      throw error;
    }
  }

  async create(data: Omit<T, '$id'>): Promise<T> {
    try {
      const response = await databases.createDocument(
        DATABASE_ID,
        this.collectionId,
        ID.unique(),
        data
      );
      return response as unknown as T;
    } catch (error) {
      console.error(`Error creating ${this.collectionId}:`, error);
      throw error;
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const response = await databases.updateDocument(
        DATABASE_ID,
        this.collectionId,
        id,
        data
      );
      return response as unknown as T;
    } catch (error) {
      console.error(`Error updating ${this.collectionId}:`, error);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await databases.deleteDocument(
        DATABASE_ID,
        this.collectionId,
        id
      );
    } catch (error) {
      console.error(`Error deleting ${this.collectionId}:`, error);
      throw error;
    }
  }
}

// Specialized services
export const globalSettingsService = new AppwriteCRUDService<GlobalSettings>(COLLECTIONS.GLOBAL_SETTINGS);
export const heroSectionService = new AppwriteCRUDService<HeroSection>(COLLECTIONS.HERO_SECTION);
export const serviceCardService = new AppwriteCRUDService<ServiceCard>(COLLECTIONS.SERVICE_CARDS);
export const specializedAreaService = new AppwriteCRUDService<SpecializedArea>(COLLECTIONS.SPECIALIZED_AREAS);
export const projectService = new AppwriteCRUDService<Project>(COLLECTIONS.PORTFOLIO_PROJECTS);
export const testimonialService = new AppwriteCRUDService<Testimonial>(COLLECTIONS.TESTIMONIALS);
export const blogPostService = new AppwriteCRUDService<BlogPost>(COLLECTIONS.BLOG_POSTS);
export const navigationService = new AppwriteCRUDService<NavigationItem>(COLLECTIONS.NAVIGATION_ITEMS);
export const socialLinkService = new AppwriteCRUDService<SocialLink>(COLLECTIONS.SOCIAL_LINKS);
export const footerLinkService = new AppwriteCRUDService<FooterLink>(COLLECTIONS.FOOTER_LINKS);
export const companyInfoService = new AppwriteCRUDService<CompanyInfo>(COLLECTIONS.COMPANY_INFO);
export const aboutContentService = new AppwriteCRUDService<AboutContent>(COLLECTIONS.ABOUT_CONTENT);

// File upload service
export const fileUploadService = {
  async uploadFile(file: File): Promise<string> {
    try {
      const response = await storage.createFile(
        STORAGE_BUCKET_ID,
        ID.unique(),
        file
      );
      return response.$id;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  },

  async getFileUrl(fileId: string): Promise<string> {
    try {
      // In Appwrite v18+, getFileView returns a URL object
      const response = storage.getFileView(STORAGE_BUCKET_ID, fileId);
      // Convert the URL object to string
      const urlString = response.toString();
      console.log('Generated file URL:', urlString);
      return urlString;
    } catch (error) {
      console.error('Error getting file URL:', error);
      throw error;
    }
  },

  async deleteFile(fileId: string): Promise<void> {
    try {
      await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }
};

// Blog-specific service with additional methods
export const blogService = {
  ...blogPostService,
  
  async getPublishedPosts(): Promise<BlogPost[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BLOG_POSTS,
        [
          Query.isNotNull('publishDate'),
          Query.orderDesc('publishDate')
        ]
      );
      return response.documents as unknown as BlogPost[];
    } catch (error) {
      console.error('Error fetching published blog posts:', error);
      throw error;
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.BLOG_POSTS,
        [Query.equal('slug', slug)]
      );
      return response.documents.length > 0 ? response.documents[0] as unknown as BlogPost : null;
    } catch (error) {
      console.error('Error fetching blog post by slug:', error);
      throw error;
    }
  }
};

// Project-specific service with category filtering
export const projectsService = {
  ...projectService,
  
  async getProjectsByCategory(category: 'Residential' | 'Commercial' | 'Industrial'): Promise<Project[]> {
    try {
      const response = await databases.listDocuments(
        DATABASE_ID,
        COLLECTIONS.PORTFOLIO_PROJECTS,
        [
          Query.equal('category', category),
          Query.orderDesc('completionDate')
        ]
      );
      return response.documents as unknown as Project[];
    } catch (error) {
      console.error('Error fetching projects by category:', error);
      throw error;
    }
  }
};
