import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query, Models } from 'appwrite';
import { parseCoordinates } from '@/lib/utils';

export interface SiteRecord {
  $id?: string;
  clientId: string;
  clientCode?: string;
  siteCode?: string;
  siteName: string;
  contactPersonName?: string;
  contactPersonNumber?: string;
  email?: string;
  channels?: string;
  address?: string;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
  panelBrand?: string;
  panelModel?: string;
  panelQuantity?: number | null;
  panelDcCapacity?: number | null;
  inverterBrand?: string;
  inverterModel?: string;
  inverterQuantity?: number | null;
  inverterAcCapacity?: number | null;
  description?: string;
}

function mapDocToSite(doc: Models.Document): SiteRecord {
  return {
    $id: doc.$id,
    clientId: doc.clientId,
    clientCode: doc.clientCode || '',
    siteCode: doc.siteCode || '',
    siteName: doc.siteName,
    contactPersonName: doc.contactPersonName || '',
    contactPersonNumber: doc.contactPersonNumber || '',
    email: doc.email || '',
    channels: doc.channels || '',
    address: doc.address || '',
    googleMapsLink: doc.latitude && doc.longitude ? `https://www.google.com/maps?q=${doc.latitude},${doc.longitude}` : '',
    latitude: doc.latitude,
    longitude: doc.longitude,
    panelBrand: doc.panelBrand || '',
    panelModel: doc.panelModel || '',
    panelQuantity: doc.panelQuantity ?? null,
    panelDcCapacity: doc.panelDcCapacity ?? null,
    inverterBrand: doc.inverterBrand || '',
    inverterModel: doc.inverterModel || '',
    inverterQuantity: doc.inverterQuantity ?? null,
    inverterAcCapacity: doc.inverterAcCapacity ?? null,
    description: doc.description || '',
  };
}

export async function fetchSitesByClient(clientId: string): Promise<SiteRecord[]> {
  if (!clientId) return [];
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.SITES,
      [Query.equal('clientId', clientId), Query.limit(100)]
    );
    return response.documents
      .map(mapDocToSite)
      .sort((a, b) => (a.siteCode || '').localeCompare(b.siteCode || ''));
  } catch (error) {
    console.error('Error fetching sites from Appwrite:', error);
    return [];
  }
}

/**
 * Generate the next available site code for a client.
 * Format: `${clientCode}-S01` … `${clientCode}-S99`.
 */
export function generateNextSiteCode(clientCode: string, sites: SiteRecord[]): string {
  let maxNum = 0;
  const suffixRegex = /-S(\d+)$/;
  for (const s of sites) {
    if (!s.siteCode) continue;
    const match = s.siteCode.match(suffixRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${clientCode}-S${String(maxNum + 1).padStart(2, '0')}`;
}

export async function registerSite(site: SiteRecord): Promise<SiteRecord> {
  if (!site.clientId) {
    throw new Error('A client must be selected before registering a site.');
  }
  if (!site.clientCode) {
    throw new Error('Client code is missing; cannot generate a site code.');
  }

  // Always re-derive the next site code from the latest server state so the
  // code stays unique even if multiple sites are added in quick succession.
  const existing = await fetchSitesByClient(site.clientId);
  const siteCode = generateNextSiteCode(site.clientCode, existing);

  const coords = parseCoordinates(site.googleMapsLink);

  const payload: Record<string, unknown> = {
    clientId: site.clientId,
    clientCode: site.clientCode,
    siteCode,
    siteName: site.siteName.trim(),
    contactPersonName: site.contactPersonName?.trim() || '',
    contactPersonNumber: site.contactPersonNumber?.trim() || '',
    email: site.email?.trim() || '',
    channels: site.channels?.trim() || '',
    address: site.address?.trim() || '',
    panelBrand: site.panelBrand?.trim() || '',
    panelModel: site.panelModel?.trim() || '',
    panelQuantity: site.panelQuantity ?? null,
    panelDcCapacity: site.panelDcCapacity ?? null,
    inverterBrand: site.inverterBrand?.trim() || '',
    inverterModel: site.inverterModel?.trim() || '',
    inverterQuantity: site.inverterQuantity ?? null,
    inverterAcCapacity: site.inverterAcCapacity ?? null,
    description: site.description?.trim() || '',
  };

  if (coords) {
    payload.latitude = coords.lat;
    payload.longitude = coords.lng;
  }

  const response = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.SITES,
    ID.unique(),
    payload
  );

  return mapDocToSite(response);
}
