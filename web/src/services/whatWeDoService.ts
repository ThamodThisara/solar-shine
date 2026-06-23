import { databases, storage, DATABASE_ID, COLLECTIONS, ID } from '@/lib/appwrite';

export interface WhatWeDoHero {
  title: string;
  subtitle: string;
  image?: string;
  image_id?: string;
}

export interface ApproachStep {
  number: string;
  title: string;
  description: string;
  order_index: number;
}

export interface ExpertiseArea {
  title: string;
  description: string;
  icon: string;
  image?: string;
  image_id?: string;
  order_index: number;
}

export interface Benefit {
  text: string;
  order_index: number;
}

export interface ImpactStat {
  value: string;
  label: string;
  order_index: number;
}

export interface WhatWeDoContent {
  $id?: string;
  hero: WhatWeDoHero;
  approach: {
    title: string;
    description: string;
    steps: ApproachStep[];
  };
  expertise: {
    title: string;
    description: string;
    areas: ExpertiseArea[];
  };
  benefits: {
    title: string;
    items: Benefit[];
  };
  impact: {
    title: string;
    description: string;
    stats: ImpactStat[];
  };
}

export const fetchWhatWeDoContent = async (): Promise<WhatWeDoContent | null> => {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.WHAT_WE_DO,
      []
    );
    
    if (response.documents.length > 0) {
      const content = response.documents[0];
      // Parse the JSON strings back to objects
      return {
        ...content,
        hero: content.hero ? JSON.parse(content.hero) : { title: '', subtitle: '' },
        approach: content.approach ? JSON.parse(content.approach) : { title: '', description: '', steps: [] },
        expertise: content.expertise ? JSON.parse(content.expertise) : { title: '', description: '', areas: [] },
        benefits: content.benefits ? JSON.parse(content.benefits) : { title: '', items: [] },
        impact: content.impact ? JSON.parse(content.impact) : { title: '', description: '', stats: [] }
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching What We Do content:', error);
    return null;
  }
};

export const updateWhatWeDoContent = async (content: WhatWeDoContent): Promise<boolean> => {
  try {
    // Convert objects to JSON strings for storage
    const contentToSave = {
      hero: JSON.stringify(content.hero),
      approach: JSON.stringify(content.approach),
      expertise: JSON.stringify(content.expertise),
      benefits: JSON.stringify(content.benefits),
      impact: JSON.stringify(content.impact)
    };

    if (content.$id) {
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTIONS.WHAT_WE_DO,
        content.$id,
        contentToSave
      );
    } else {
      const result = await databases.createDocument(
        DATABASE_ID,
        COLLECTIONS.WHAT_WE_DO,
        ID.unique(),
        contentToSave
      );
      content.$id = result.$id;
    }
    return true;
  } catch (error) {
    console.error('Error updating What We Do content:', error);
    return false;
  }
};

// Export a service object for easier importing
export const whatWeDoService = {
  fetchWhatWeDoContent,
  updateWhatWeDoContent
};
