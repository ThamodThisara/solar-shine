import { databases, storage, DATABASE_ID, COLLECTIONS, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { BlogPost } from '@/types/payload-types';
import { createSlug } from '@/lib/utils';

function mapDocumentToBlogPost(doc: any): BlogPost {
  // Handle both featured_image and featured_image_id fields
  let imageUrl: string | undefined;
  let imageId: string | undefined;
  
  if (doc.featured_image_id) {
    try {
      // Use the /view endpoint for direct image access
      const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID || '685bcfb7001103824569';
      imageUrl = `https://fra.cloud.appwrite.io/v1/storage/buckets/${STORAGE_BUCKET_ID}/files/${doc.featured_image_id}/view?project=${projectId}`;
      imageId = doc.featured_image_id;
    } catch (error) {
      console.warn('Failed to construct image URL:', error);
    }
  } else if (doc.featured_image) {
    imageUrl = doc.featured_image;
  }
  
  return {
    ...doc,
    $id: doc.$id,
    featured_image: imageUrl,
    featured_image_id: imageId,
    publishDate: doc.publishDate || doc.publish_date || undefined,
    published: doc.published !== undefined ? doc.published : false,
    categories: doc.categories && doc.categories.length > 0 ? doc.categories : ['uncategorized'],
    tags: doc.tags || [],
  } as unknown as BlogPost;
}

export async function fetchBlogPosts(): Promise<BlogPost[]> {
  try {
    const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BLOG_POSTS, [
      Query.orderDesc('publishDate')
    ]);
    const posts = response.documents.map(mapDocumentToBlogPost);
    return posts;
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    throw error;
  }
}

export async function fetchBlogPostBySlug(slug: string): Promise<BlogPost | null> {
    try {
      const response = await databases.listDocuments(DATABASE_ID, COLLECTIONS.BLOG_POSTS, [
        Query.equal('slug', slug)
      ]);
      if (response.documents.length > 0) {
        return mapDocumentToBlogPost(response.documents[0]);
      }
      return null;
    } catch (error) {
      console.error(`Error fetching blog post by slug ${slug}:`, error);
      throw error;
    }
  }

export async function uploadBlogImage(imageFile: File): Promise<string> {
    const fileResponse = await storage.createFile(STORAGE_BUCKET_ID, ID.unique(), imageFile);
    return fileResponse.$id;
}

export async function createBlogPost(postData: Partial<Omit<BlogPost, '$id' | 'featured_image'>>): Promise<string | null> {
    try {
        // Prepare data for Appwrite, handling missing fields
        const dataToSave: any = {
            title: postData.title || '',
            slug: postData.slug || createSlug(postData.title!),
            excerpt: postData.excerpt || null,
            content: postData.content || null,
            author: postData.author || null,
            publishDate: postData.publishDate || new Date().toISOString(),
            published: postData.published || false,
            categories: postData.categories && postData.categories.length > 0 ? postData.categories : ['uncategorized'],
            tags: postData.tags || [],
        };

        // Add featured_image_id if it exists
        if (postData.featured_image_id) {
            dataToSave.featured_image_id = postData.featured_image_id;
        }

        // Remove undefined values to prevent Appwrite errors
        Object.keys(dataToSave).forEach(key => {
            if (dataToSave[key] === undefined) {
                delete dataToSave[key];
            }
        });

        const response = await databases.createDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, ID.unique(), dataToSave);
        return response.$id;
    } catch (error) {
        console.error('Error creating blog post:', error);
        return null;
    }
}

export async function updateBlogPost(id: string, postData: Partial<Omit<BlogPost, '$id' | 'featured_image'>>): Promise<boolean> {
  try {
    const oldPost = await databases.getDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, id);
    const oldImageId = oldPost.featured_image_id as string | undefined;

    // If a new image is being set, and it's different from the old one, delete the old one.
    if (postData.featured_image_id && postData.featured_image_id !== oldImageId && oldImageId) {
        await storage.deleteFile(STORAGE_BUCKET_ID, oldImageId);
    }

    const { title, slug, excerpt, content, author, publishDate, published, featured_image_id, categories, tags } = postData;
    const dataToUpdate: any = { 
      title, 
      slug, 
      excerpt, 
      content, 
      author, 
      publishDate, 
      published, 
      featured_image_id, 
      categories: categories && categories.length > 0 ? categories : ['uncategorized'],
      tags: tags || []
    };
    
    // Appwrite expects null for empty optional fields, not undefined.
    for (const key in dataToUpdate) {
      if (dataToUpdate[key] === undefined) {
        dataToUpdate[key] = null;
      }
    }

    await databases.updateDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, id, dataToUpdate);
    return true;
  } catch (error) {
    console.error('Error updating blog post:', error);
    return false;
  }
}

export async function deleteBlogPost(id: string): Promise<boolean> {
    try {
        const post = await databases.getDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, id);
        if (post.featured_image_id) {
            await storage.deleteFile(STORAGE_BUCKET_ID, post.featured_image_id as string);
        }
        await databases.deleteDocument(DATABASE_ID, COLLECTIONS.BLOG_POSTS, id);
        return true;
    } catch (error) {
        console.error('Error deleting blog post:', error);
        return false;
    }
}
