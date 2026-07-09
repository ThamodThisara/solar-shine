import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function createSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-") // Replace spaces with -
    .replace(/[^\w\-]+/g, "") // Remove all non-word chars
    .replace(/\-\-+/g, "-") // Replace multiple - with single -
    .replace(/^-+/, "") // Trim - from start of text
    .replace(/-+$/, ""); // Trim - from end of text
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export const getImageWithCacheBusting = (url: string) => {
  if (!url) return "";
  // Appends a timestamp to the image URL to bypass browser cache
  return `${url}?v=${new Date().getTime()}`;
};

/**
 * Safely prepare data for Appwrite database operations by filtering out
 * undefined values and converting empty strings to null
 */
export function prepareAppwriteData<T extends Record<string, any>>(data: T): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip undefined values
    if (value === undefined) continue;
    
    // Convert empty strings to null for Appwrite
    if (value === '') {
      result[key] = null;
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Parses latitude and longitude coordinates from any Google Maps link pattern
 * or raw coordinate text string.
 */
export function parseCoordinates(link?: string): { lat: number; lng: number } | null {
  if (!link) return null;
  
  const cleanLink = link.trim();
  
  // 1. Check for standard query parameter: q=latitude,longitude or query=latitude,longitude
  const qMatch = cleanLink.match(/[?&](q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/) || cleanLink.match(/(q|query)=([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[2]);
    const lng = parseFloat(qMatch[3]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 2. Check for @latitude,longitude (e.g. /@6.927100,79.861200,17z)
  const atMatch = cleanLink.match(/@([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 3. Check for /place/latitude,longitude or /maps/place/latitude,longitude
  const placeMatch = cleanLink.match(/\/place\/([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (placeMatch) {
    const lat = parseFloat(placeMatch[1]);
    const lng = parseFloat(placeMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 4. Check for direct coordinates /latitude,longitude/ in URL path (allowing optional + sign)
  const pathMatch = cleanLink.match(/\/([+-]?\d+\.\d+),\+?([+-]?\d+\.\d+)/) || cleanLink.match(/\/([+-]?\d+\.\d+),([+-]?\d+\.\d+)/);
  if (pathMatch) {
    const lat = parseFloat(pathMatch[1]);
    const lng = parseFloat(pathMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 5. Check if the text is just raw latitude, longitude (e.g. "6.927100, 79.861200")
  const rawMatch = cleanLink.match(/^([+-]?\d+\.\d+)\s*,\s*([+-]?\d+\.\d+)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
}
