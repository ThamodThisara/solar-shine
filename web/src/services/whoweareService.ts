
import { databases, DATABASE_ID, storage, STORAGE_BUCKET_ID } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';

// Collection IDs
export const COLLECTIONS = {
    ABOUT_PAGE: 'about_page',
    TEAM_MEMBERS: 'team_members',
    CORE_VALUES: 'core_values',
    MILESTONES: 'milestones'
};

// Updated types to match component expectations
export interface AboutPage {
    $id: string;
    title: string;
    subtitle: string;
    main_image?: string;
    mission_statement?: string;
    vision_statement?: string;
    cta_title?: string;
    cta_description?: string;
    contact_button_text?: string;
    projects_button_text?: string;
    $createdAt: string;
    $updatedAt: string;
}

export interface TeamMember {
    $id: string;
    name: string;
    position: string;
    bio: string;
    image: string;
    order: number;
    $createdAt: string;
    $updatedAt: string;
}

export interface Value {
    $id: string;
    title: string;
    description: string;
    icon: string;
    order: number;
    $createdAt: string;
    $updatedAt: string;
}

export interface Milestone {
    $id: string;
    year: string;
    title: string;
    description: string;
    order: number;
    $createdAt: string;
    $updatedAt: string;
}

// This matches what WhoWeAre.tsx expects
export interface AboutContent {
    title?: string;
    subtitle?: string;
    main_image?: string;
    mission_statement?: string;
    vision_statement?: string;
    team_members?: TeamMember[];
    values?: Value[];
    milestones?: Milestone[];
    cta_title?: string;
    cta_description?: string;
    contact_button_text?: string;
    projects_button_text?: string;
}

// Cache system
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < CACHE_DURATION;
}

// Fetch functions
export async function fetchAboutPage(): Promise<AboutPage | null> {
    const cacheKey = 'about_page';
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.ABOUT_PAGE,
            [Query.limit(1)]
        );

        const result = response.documents.length > 0 ? response.documents[0] as unknown as AboutPage : null;

        cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('Error fetching about page:', error);
        if (cached) return cached.data;
        return null;
    }
}

export async function fetchTeamMembers(): Promise<TeamMember[]> {
    const cacheKey = 'team_members';
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.TEAM_MEMBERS,
            [Query.orderAsc('order'), Query.limit(100)]
        );

        const result = response.documents as unknown as TeamMember[];

        cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('Error fetching team members:', error);
        if (cached) return cached.data;
        return [];
    }
}

export async function fetchValues(): Promise<Value[]> {
    const cacheKey = 'values';
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.CORE_VALUES,
            [Query.orderAsc('order'), Query.limit(20)]
        );

        const result = response.documents as unknown as Value[];

        // Process the result to ensure icon URLs are properly resolved
        const processedResult = result.map(value => ({
            ...value,
            // If icon is a file ID (short string), convert it to a proper URL
            icon: value.icon && value.icon.length <= 50 && !value.icon.startsWith('http') && !value.icon.startsWith('data:') 
                ? getPublicFileUrl(value.icon) 
                : value.icon
        }));


        cache.set(cacheKey, {
            data: processedResult,
            timestamp: Date.now()
        });

        return processedResult;
    } catch (error) {
        console.error('Error fetching values:', error);
        if (cached) return cached.data;
        return [];
    }
}

export async function fetchMilestones(): Promise<Milestone[]> {
    const cacheKey = 'milestones';
    const cached = cache.get(cacheKey);

    if (cached && isCacheValid(cached.timestamp)) {
        return cached.data;
    }

    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTIONS.MILESTONES,
            [Query.orderAsc('order'), Query.limit(50)]
        );

        const result = response.documents as unknown as Milestone[];

        cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
        });

        return result;
    } catch (error) {
        console.error('Error fetching milestones:', error);
        if (cached) return cached.data;
        return [];
    }
}

// Cache management
export function clearCache(): void {
    cache.clear();
}

export function invalidateCache(cacheKey: string): void {
    cache.delete(cacheKey);
}

// Specific cache invalidation for values
export function invalidateValuesCache(): void {
    cache.delete('values');
    console.log('Values cache cleared'); // Debug log
}

// CRUD operations
export async function createOrUpdateAboutPage(data: Partial<AboutPage>): Promise<AboutPage> {
    try {
        const existing = await fetchAboutPage();

        let response;
        if (existing) {
            response = await databases.updateDocument(
                DATABASE_ID,
                COLLECTIONS.ABOUT_PAGE,
                existing.$id,
                data
            );
        } else {
            response = await databases.createDocument(
                DATABASE_ID,
                COLLECTIONS.ABOUT_PAGE,
                'unique()',
                data
            );
        }

        invalidateCache('about_page');
        return response as AboutPage;
    } catch (error) {
        console.error('Error creating/updating about page:', error);
        throw new Error('Failed to save about page data');
    }
}

export async function createTeamMember(data: Omit<TeamMember, '$id' | '$createdAt' | '$updatedAt'>): Promise<TeamMember> {
    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.TEAM_MEMBERS,
            'unique()',
            data
        );

        invalidateCache('team_members');
        return response as unknown as TeamMember;
    } catch (error) {
        console.error('Error creating team member:', error);
        throw new Error('Failed to create team member');
    }
}

export async function updateTeamMember(id: string, data: Partial<Omit<TeamMember, '$id' | '$createdAt' | '$updatedAt'>>): Promise<TeamMember> {
    try {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.TEAM_MEMBERS,
            id,
            data
        );

        invalidateCache('team_members');
        return response as unknown as TeamMember;
    } catch (error) {
        console.error('Error updating team member:', error);
        throw new Error('Failed to update team member');
    }
}

export async function deleteTeamMember(id: string): Promise<void> {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.TEAM_MEMBERS,
            id
        );

        invalidateCache('team_members');
    } catch (error) {
        console.error('Error deleting team member:', error);
        throw new Error('Failed to delete team member');
    }
}

export async function createValue(data: Omit<Value, '$id' | '$createdAt' | '$updatedAt'>): Promise<Value> {
    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.CORE_VALUES,
            'unique()',
            data
        );

        invalidateCache('values');
        return response as unknown as Value;
    } catch (error) {
        console.error('Error creating value:', error);
        throw new Error('Failed to create value');
    }
}

export async function updateValue(id: string, data: Partial<Omit<Value, '$id' | '$createdAt' | '$updatedAt'>>): Promise<Value> {
    try {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.CORE_VALUES,
            id,
            data
        );

        invalidateValuesCache(); // Use specific cache invalidation
        console.log('Value updated successfully, cache cleared'); // Debug log
        return response as unknown as Value;
    } catch (error) {
        console.error('Error updating value:', error);
        throw new Error('Failed to update value');
    }
}

export async function deleteValue(id: string): Promise<void> {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.CORE_VALUES,
            id
        );

        invalidateCache('values');
    } catch (error) {
        console.error('Error deleting value:', error);
        throw new Error('Failed to delete value');
    }
}

export async function createMilestone(data: Omit<Milestone, '$id' | '$createdAt' | '$updatedAt'>): Promise<Milestone> {
    try {
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTIONS.MILESTONES,
            'unique()',
            data
        );

        invalidateCache('milestones');
        return response as unknown as Milestone;
    } catch (error) {
        console.error('Error creating milestone:', error);
        throw new Error('Failed to create milestone');
    }
}

export async function updateMilestone(id: string, data: Partial<Omit<Milestone, '$id' | '$createdAt' | '$updatedAt'>>): Promise<Milestone> {
    try {
        const response = await databases.updateDocument(
            DATABASE_ID,
            COLLECTIONS.MILESTONES,
            id,
            data
        );

        invalidateCache('milestones');
        return response as unknown as Milestone;
    } catch (error) {
        console.error('Error updating milestone:', error);
        throw new Error('Failed to update milestone');
    }
}

export async function deleteMilestone(id: string): Promise<void> {
    try {
        await databases.deleteDocument(
            DATABASE_ID,
            COLLECTIONS.MILESTONES,
            id
        );

        invalidateCache('milestones');
    } catch (error) {
        console.error('Error deleting milestone:', error);
        throw new Error('Failed to delete milestone');
    }
}

// Image upload functions
export async function uploadImage(file: File, folder: string = 'whoweare'): Promise<string> {
    try {
        // Use a valid Appwrite file ID (no slashes). The file's own name is preserved by SDK.
        const result = await storage.createFile(
            STORAGE_BUCKET_ID,
            ID.unique(),
            file
        );

        const fileUrl = storage.getFileView(STORAGE_BUCKET_ID, result.$id);
        return fileUrl.toString();
    } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error('Failed to upload image');
    }
}

// Helper to resolve a stored file ID to a public URL
export function getPublicFileUrl(fileId: string): string {
    try {
        if (!fileId) return '';
        const url = storage.getFileView(STORAGE_BUCKET_ID, fileId);
        return url.toString();
    } catch (error) {
        console.error('Error generating file URL:', error);
        return '';
    }
}

// Helper: convert data URL to File for upload
function dataUrlToFile(dataUrl: string, fileName: string): File {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = /data:(.*?);base64/.exec(header || '');
    const mime = mimeMatch?.[1] || 'application/octet-stream';
    const binary = atob(base64 || '');
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], fileName, { type: mime });
}

// Helper: upload icon if it's a data URL or long URL, return file ID (<=50 chars)
async function ensureIconIsFileId(icon?: string, fallbackName: string = `icon_${Date.now()}.png`): Promise<string | undefined> {
    if (!icon) return icon;
    // If already looks like a short fileId (<=50), keep as-is
    if (icon.length <= 50 && !icon.startsWith('http') && !icon.startsWith('data:')) return icon;

    try {
        let file: File | null = null;
        if (icon.startsWith('data:')) {
            file = dataUrlToFile(icon, fallbackName);
        } else if (icon.startsWith('http')) {
            // Fetch the URL and create a File
            const response = await fetch(icon);
            const blob = await response.blob();
            file = new File([blob], fallbackName, { type: blob.type || 'image/png' });
        }
        if (file) {
            const created = await storage.createFile(
                STORAGE_BUCKET_ID,
                ID.unique(),
                file
            );
            return created.$id;
        }
    } catch (e) {
        console.warn('Failed to convert/upload icon, falling back to original icon string');
    }
    // Fallback: if too long, trim is not valid; better return undefined to avoid schema error
    return icon.length <= 50 ? icon : undefined;
}

export async function deleteImage(fileId: string): Promise<void> {
    try {
        await storage.deleteFile(STORAGE_BUCKET_ID, fileId);
    } catch (error) {
        console.error('Error deleting image:', error);
    }
}

// Enhanced CRUD with image support
export async function createOrUpdateAboutPageWithImage(data: Partial<AboutPage>, imageFile?: File): Promise<AboutPage> {
    try {
        let imageUrl = data.main_image;

        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'about-page');
        }

        const pageData = {
            ...data,
            main_image: imageUrl
        } as Partial<AboutPage>;

        return await createOrUpdateAboutPage(pageData);
    } catch (error) {
        console.error('Error creating/updating about page with image:', error);
        throw new Error('Failed to save about page with image');
    }
}

export async function createTeamMemberWithImage(data: Partial<TeamMember>, imageFile?: File): Promise<TeamMember> {
    try {
        let imageUrl = data.image;

        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'team-members');
        }

        const memberData = {
            ...data,
            image: imageUrl || ''
        } as Omit<TeamMember, '$id' | '$createdAt' | '$updatedAt'>;

        return await createTeamMember(memberData);
    } catch (error) {
        console.error('Error creating team member with image:', error);
        throw new Error('Failed to create team member with image');
    }
}

export async function updateTeamMemberWithImage(id: string, data: Partial<TeamMember>, imageFile?: File): Promise<TeamMember> {
    try {
        let imageUrl = data.image;

        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'team-members');
        }

        const memberData = {
            ...data,
            image: imageUrl
        } as Partial<Omit<TeamMember, '$id' | '$createdAt' | '$updatedAt'>>;

        return await updateTeamMember(id, memberData);
    } catch (error) {
        console.error('Error updating team member with image:', error);
        throw new Error('Failed to update team member with image');
    }
}

export async function createValueWithImage(data: Partial<Value>, imageFile?: File): Promise<Value> {
    try {
        let iconFieldValue = data.icon;

        if (imageFile) {
            // For core_values.icon (<= 50 chars), store the file ID instead of a long URL
            const created = await storage.createFile(
                STORAGE_BUCKET_ID,
                ID.unique(),
                imageFile
            );
            iconFieldValue = created.$id;
        } else {
            // If icon is a data URL or long URL, upload and store file ID
            const ensured = await ensureIconIsFileId(iconFieldValue as string | undefined);
            iconFieldValue = ensured || '';
        }

        const valueData = {
            ...data,
            icon: iconFieldValue || ''
        } as Omit<Value, '$id' | '$createdAt' | '$updatedAt'>;

        return await createValue(valueData);
    } catch (error) {
        console.error('Error creating value with image:', error);
        throw new Error('Failed to create value with image');
    }
}

export async function updateValueWithImage(id: string, data: Partial<Value>, imageFile?: File): Promise<Value> {
    try {
        let iconFieldValue = data.icon;

        if (imageFile) {
            // For core_values.icon (<= 50 chars), store the file ID instead of a long URL
            const created = await storage.createFile(
                STORAGE_BUCKET_ID,
                ID.unique(),
                imageFile
            );
            iconFieldValue = created.$id;
            console.log('Uploaded icon file ID:', iconFieldValue); // Debug log
        } else {
            // If icon is a data URL or long URL, upload and store file ID (or keep short value)
            const ensured = await ensureIconIsFileId(iconFieldValue as string | undefined);
            iconFieldValue = ensured as string | undefined;
        }

        const valueData = {
            ...data,
            icon: iconFieldValue
        } as Partial<Omit<Value, '$id' | '$createdAt' | '$updatedAt'>>;

        console.log('Updating value with icon data:', valueData); // Debug log
        return await updateValue(id, valueData);
    } catch (error) {
        console.error('Error updating value with image:', error);
        throw new Error('Failed to update value with image');
    }
}

// Default data fallback (matching WhoWeAre.tsx expectations)
const defaultWhoWeAreData = {
    heroSection: {
        title: "Who We Are",
        subtitle: "A leading solar energy provider committed to powering a sustainable future across Sri Lanka",
        image: "https://images.unsplash.com/photo-1497440001374-f26997328c1b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80"
    },
    mission: {
        title: "Our Mission",
        description: "To accelerate the adoption of clean, renewable solar energy solutions that reduce environmental impact and energy costs while improving energy security and independence for our clients."
    },
    vision: {
        title: "Our Vision",
        description: "To be the leading solar energy provider in Sri Lanka, driving the nation towards a sustainable energy future through innovation, excellence, and customer-focused solutions."
    },
    values: [
        {
            title: "Excellence",
            description: "We are committed to delivering the highest quality solar solutions with precision and care.",
            icon: "award"
        },
        {
            title: "Sustainability",
            description: "Environmental responsibility is at the heart of everything we do.",
            icon: "shield"
        },
        {
            title: "Customer Focus",
            description: "We prioritize understanding and meeting our customers' unique energy needs.",
            icon: "smile"
        },
        {
            title: "Innovation",
            description: "We continuously seek new technologies and approaches to improve our solutions.",
            icon: "check-circle"
        },
        {
            title: "Reliability",
            description: "Our clients can depend on our systems to perform consistently for decades.",
            icon: "clock"
        },
        {
            title: "Teamwork",
            description: "We collaborate effectively, both internally and with our clients, to achieve shared goals.",
            icon: "users"
        }
    ],
    team: {
        title: "Our Leadership Team",
        description: "Meet the experienced professionals who guide our company's vision and operations.",
        members: [
            {
                name: "Sunil Perera",
                position: "Founder & CEO",
                bio: "With over 20 years in renewable energy, Sunil founded our company with a vision of making solar accessible to all Sri Lankans.",
                image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
            },
            {
                name: "Amali Fernando",
                position: "Technical Director",
                bio: "Amali is an electrical engineer with specialized expertise in renewable energy systems and grid integration.",
                image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
            },
            {
                name: "Rajan Mendis",
                position: "Operations Manager",
                bio: "Rajan ensures that our installation and maintenance processes run smoothly and efficiently.",
                image: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
            }
        ]
    },
    history: {
        title: "Our Journey",
        description: "Since our founding in 2010, we've grown from a small team with a big vision to become one of Sri Lanka's most trusted solar providers.",
        milestones: [
            {
                year: "2010",
                title: "Company Founded",
                description: "Started with a small team focused on residential solar installations."
            },
            {
                year: "2014",
                title: "Commercial Expansion",
                description: "Began offering solutions for commercial properties and expanded our team."
            },
            {
                year: "2017",
                title: "Industrial Solutions",
                description: "Launched dedicated industrial division for large-scale projects."
            },
            {
                year: "2020",
                title: "10-Year Anniversary",
                description: "Celebrated a decade of service with over 5,000 successful installations."
            },
            {
                year: "2023",
                title: "Innovation Hub",
                description: "Opened our renewable energy innovation center to develop new solutions."
            }
        ]
    }
};

// Main function to get all about content - this matches what WhoWeAre.tsx expects
export async function getAboutContent(): Promise<AboutContent> {
    try {
        const [aboutPageResult, teamMembersResult, valuesResult, milestonesResult] = await Promise.allSettled([
            fetchAboutPage(),
            fetchTeamMembers(),
            fetchValues(),
            fetchMilestones()
        ]);

        const aboutPage = aboutPageResult.status === 'fulfilled' ? aboutPageResult.value : null;
        const teamMembers = teamMembersResult.status === 'fulfilled' ? teamMembersResult.value : [];
        const values = valuesResult.status === 'fulfilled' ? valuesResult.value : [];
        const milestones = milestonesResult.status === 'fulfilled' ? milestonesResult.value : [];

        // Merge database data with defaults
        const result: AboutContent = {
            title: aboutPage?.title || defaultWhoWeAreData.heroSection.title,
            subtitle: aboutPage?.subtitle || defaultWhoWeAreData.heroSection.subtitle,
            main_image: aboutPage?.main_image || defaultWhoWeAreData.heroSection.image,
            mission_statement: aboutPage?.mission_statement || defaultWhoWeAreData.mission.description,
            vision_statement: aboutPage?.vision_statement || defaultWhoWeAreData.vision.description,
            cta_title: aboutPage?.cta_title || "Ready to Work With Us?",
            cta_description: aboutPage?.cta_description || "Join us in our mission to create a more sustainable future through solar energy.",
            contact_button_text: aboutPage?.contact_button_text || "Contact Us",
            projects_button_text: aboutPage?.projects_button_text || "View Our Projects",
            team_members: teamMembers.length > 0 ? teamMembers : defaultWhoWeAreData.team.members.map((member, index) => ({
                $id: `default-${index}`,
                name: member.name,
                position: member.position,
                bio: member.bio,
                image: member.image,
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            })),
            values: values.length > 0 ? values : defaultWhoWeAreData.values.map((value, index) => ({
                $id: `default-${index}`,
                title: value.title,
                description: value.description,
                icon: value.icon, // Icons are already lowercase in default data
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            })),
            milestones: milestones.length > 0 ? milestones : defaultWhoWeAreData.history.milestones.map((milestone, index) => ({
                $id: `default-${index}`,
                year: milestone.year,
                title: milestone.title,
                description: milestone.description,
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            }))
        };

        return result;
    } catch (error) {
        console.error('Error fetching about content:', error);

        // Return default data with proper structure
        return {
            title: defaultWhoWeAreData.heroSection.title,
            subtitle: defaultWhoWeAreData.heroSection.subtitle,
            main_image: defaultWhoWeAreData.heroSection.image,
            mission_statement: defaultWhoWeAreData.mission.description,
            vision_statement: defaultWhoWeAreData.vision.description,
            cta_title: "Ready to Work With Us?",
            cta_description: "Join us in our mission to create a more sustainable future through solar energy.",
            contact_button_text: "Contact Us",
            projects_button_text: "View Our Projects",
            team_members: defaultWhoWeAreData.team.members.map((member, index) => ({
                $id: `default-${index}`,
                name: member.name,
                position: member.position,
                bio: member.bio,
                image: member.image,
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            })),
            values: defaultWhoWeAreData.values.map((value, index) => ({
                $id: `default-${index}`,
                title: value.title,
                description: value.description,
                icon: value.icon,
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            })),
            milestones: defaultWhoWeAreData.history.milestones.map((milestone, index) => ({
                $id: `default-${index}`,
                year: milestone.year,
                title: milestone.title,
                description: milestone.description,
                order: index + 1,
                $createdAt: '',
                $updatedAt: ''
            }))
        };
    }
}

// Function to populate database with default data
export async function populateDefaultData(): Promise<void> {
    try {
        // Create about page
        await createOrUpdateAboutPage({
            title: defaultWhoWeAreData.heroSection.title,
            subtitle: defaultWhoWeAreData.heroSection.subtitle,
            main_image: defaultWhoWeAreData.heroSection.image,
            mission_statement: defaultWhoWeAreData.mission.description,
            vision_statement: defaultWhoWeAreData.vision.description,
            cta_title: "Ready to Work With Us?",
            cta_description: "Join us in our mission to create a more sustainable future through solar energy.",
            contact_button_text: "Contact Us",
            projects_button_text: "View Our Projects"
        });

        // Create team members
        for (let i = 0; i < defaultWhoWeAreData.team.members.length; i++) {
            const member = defaultWhoWeAreData.team.members[i];
            await createTeamMember({
                name: member.name,
                position: member.position,
                bio: member.bio,
                image: member.image,
                order: i + 1
            });
        }

        // Create values
        for (let i = 0; i < defaultWhoWeAreData.values.length; i++) {
            const value = defaultWhoWeAreData.values[i];
            await createValue({
                title: value.title,
                description: value.description,
                icon: value.icon, // Icons are already lowercase in default data
                order: i + 1
            });
        }

        // Create milestones
        for (let i = 0; i < defaultWhoWeAreData.history.milestones.length; i++) {
            const milestone = defaultWhoWeAreData.history.milestones[i];
            await createMilestone({
                year: milestone.year,
                title: milestone.title,
                description: milestone.description,
                order: i + 1
            });
        }

        console.log('Default data populated successfully');
    } catch (error) {
        console.error('Error populating default data:', error);
        throw new Error('Failed to populate default data');
    }
}