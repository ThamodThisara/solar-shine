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

export interface WhatWeDoCta {
  title: string;
  description: string;
  button_text: string;
  button_route: string;
}

// Default copy — mirrors the values that were previously hardcoded on the
// What We Do page CTA section so the public page never renders empty.
export const DEFAULT_WHAT_WE_DO_CTA: WhatWeDoCta = {
  title: 'Ready to Harness the Power of Solar Energy?',
  description:
    'Contact us today to discuss how our solar solutions can benefit your home or business.',
  button_text: 'Get a Free Consultation',
  button_route: '/contact',
};

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
  cta: WhatWeDoCta;
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
        impact: content.impact ? JSON.parse(content.impact) : { title: '', description: '', stats: [] },
        cta: content.cta ? { ...DEFAULT_WHAT_WE_DO_CTA, ...JSON.parse(content.cta) } : { ...DEFAULT_WHAT_WE_DO_CTA }
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
      impact: JSON.stringify(content.impact),
      cta: JSON.stringify(content.cta ?? DEFAULT_WHAT_WE_DO_CTA)
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
