import { databases, storage, DATABASE_ID, STORAGE_BUCKET_ID, COLLECTIONS, ID, Query } from '@/lib/appwrite';
import { CompanyInfo } from '@/types/payload-types';
import { prepareAppwriteData } from '@/lib/utils';

export const fetchCompanyInfo = async (): Promise<CompanyInfo | null> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.COMPANY_INFO,
      [Query.limit(1)]
    );

    if (response.documents.length > 0) {
      const doc = response.documents[0];
      return {
        $id: doc.$id,
        name: doc.name || '',
        description: doc.description || '',
        website: doc.website || '',
        logo_url: doc.logo_url || '',
        businessHours: doc.business_hours || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    return null;
  }
};

export const updateCompanyInfo = async (companyData: CompanyInfo): Promise<boolean> => {
  try {
    // Get the existing company info to check the ID
    const existingCompany = await fetchCompanyInfo();
    const id = existingCompany?.$id;

    // Prepare the data for Appwrite
    const dbData = prepareAppwriteData({
      name: companyData.name,
      description: companyData.description,
      website: companyData.website,
      logo_url: companyData.logo_url,
      business_hours: companyData.businessHours,
    });

    if (Object.keys(dbData).length === 0) {
      console.warn('No valid fields to update for company info');
      return false;
    }

    try {
      if (id) {
        // Update existing company info
        await databases.updateDocument(DATABASE_ID, COLLECTIONS.COMPANY_INFO, id, dbData);
      } else {
        // Create new company info
        if (!dbData.name) {
          console.error('Name is required for creating new company info');
          return false;
        }
        await databases.createDocument(DATABASE_ID, COLLECTIONS.COMPANY_INFO, ID.unique(), dbData);
      }
      return true;
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return false;
    }
  } catch (error) {
    console.error('Error updating company info:', error);
    return false;
  }
};

export const createCompanyInfo = async (companyData: Omit<CompanyInfo, '$id'>): Promise<CompanyInfo | null> => {
  try {
    const dbData = prepareAppwriteData({
      name: companyData.name,
      description: companyData.description,
      website: companyData.website,
      logo_url: companyData.logo_url,
      business_hours: companyData.businessHours,
    });

    if (!dbData.name) {
      throw new Error('Name is required');
    }

    const response = await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.COMPANY_INFO,
      ID.unique(),
      dbData
    );

    return {
      $id: response.$id,
      name: response.name || '',
      description: response.description || '',
      website: response.website || '',
      logo_url: response.logo_url || '',
      businessHours: response.business_hours || '',
    };
  } catch (error) {
    console.error('Error creating company info:', error);
    return null;
  }
};
