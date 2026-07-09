import { databases, COLLECTIONS, DATABASE_ID } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { fetchProjectExecutionOptions } from './projectExecutionService';

export interface ClientRecord {
  $id?: string;
  name: string;
  phone: string;
  email: string;
  channels: string;
  address?: string;
  googleMapsLink?: string;
  latitude?: number;
  longitude?: number;
}

import { parseCoordinates } from '@/lib/utils';

export async function fetchClients(): Promise<ClientRecord[]> {
  const registered: ClientRecord[] = [];
  
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      COLLECTIONS.CLIENTS,
      [Query.limit(100)]
    );
    
    const mapped = response.documents.map((doc) => ({
      $id: doc.$id,
      name: doc.name,
      phone: doc.phone,
      email: doc.email,
      channels: doc.channels,
      address: doc.address || '',
      googleMapsLink: doc.latitude && doc.longitude ? `https://www.google.com/maps?q=${doc.latitude},${doc.longitude}` : '',
      latitude: doc.latitude,
      longitude: doc.longitude
    }));
    
    registered.push(...mapped);
  } catch (error) {
    console.error('Error fetching clients from Appwrite:', error);
  }

  try {
    const projects = await fetchProjectExecutionOptions();
    const projectClients = projects.map(p => p.client).filter(Boolean);
    
    for (const name of projectClients) {
      if (!registered.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        registered.push({
          name,
          phone: '—',
          email: '—',
          channels: 'Phone',
        });
      }
    }
  } catch (error) {
    console.warn('Could not load project clients from Appwrite:', error);
  }

  const uniqueMap = new Map<string, ClientRecord>();
  registered.forEach(c => {
    uniqueMap.set(c.name.toLowerCase(), c);
  });

  return Array.from(uniqueMap.values());
}

export async function registerClient(client: ClientRecord): Promise<ClientRecord> {
  const current = await fetchClients();
  const exists = current.some(c => c.name.toLowerCase() === client.name.trim().toLowerCase());
  if (exists) {
    throw new Error(`Client with name "${client.name}" already exists.`);
  }

  const coords = parseCoordinates(client.googleMapsLink);

  const payload: any = {
    name: client.name.trim(),
    phone: client.phone.trim(),
    email: client.email.trim(),
    channels: client.channels.trim(),
    address: client.address?.trim() || '',
  };

  if (coords) {
    payload.latitude = coords.lat;
    payload.longitude = coords.lng;
  }

  const response = await databases.createDocument(
    DATABASE_ID,
    COLLECTIONS.CLIENTS,
    ID.unique(),
    payload
  );

  return {
    $id: response.$id,
    name: response.name,
    phone: response.phone,
    email: response.email,
    channels: response.channels,
    address: response.address,
    googleMapsLink: response.latitude && response.longitude ? `https://www.google.com/maps?q=${response.latitude},${response.longitude}` : '',
    latitude: response.latitude,
    longitude: response.longitude
  };
}

export async function isClientAssigned(clientName: string): Promise<boolean> {
  try {
    const projects = await fetchProjectExecutionOptions();
    return projects.some(p => p.client && p.client.toLowerCase() === clientName.toLowerCase());
  } catch (error) {
    console.warn('Error checking project options for client:', error);
    return false;
  }
}

export async function deleteClient(name: string): Promise<void> {
  const assigned = await isClientAssigned(name);
  if (assigned) {
    throw new Error(`Cannot delete client "${name}" because they are currently assigned to a project.`);
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CLIENTS,
    [Query.equal('name', name), Query.limit(1)]
  );

  if (response.documents.length > 0) {
    await databases.deleteDocument(
      DATABASE_ID,
      COLLECTIONS.CLIENTS,
      response.documents[0].$id
    );
  }
}

export async function updateClient(oldName: string, updated: ClientRecord): Promise<void> {
  const nameChanged = oldName.toLowerCase() !== updated.name.toLowerCase();
  
  if (nameChanged) {
    const assigned = await isClientAssigned(oldName);
    if (assigned) {
      throw new Error(`Cannot rename client because they are currently assigned to a project. You can only edit their phone, email, and channels.`);
    }
    
    const current = await fetchClients();
    const exists = current.some(c => c.name.toLowerCase() === updated.name.trim().toLowerCase());
    if (exists) {
      throw new Error(`Client with name "${updated.name}" already exists.`);
    }
  }

  const response = await databases.listDocuments(
    DATABASE_ID,
    COLLECTIONS.CLIENTS,
    [Query.equal('name', oldName), Query.limit(1)]
  );

  if (response.documents.length > 0) {
    const coords = parseCoordinates(updated.googleMapsLink);
    const payload: any = {
      name: updated.name.trim(),
      phone: updated.phone.trim(),
      email: updated.email.trim(),
      channels: updated.channels.trim(),
      address: updated.address?.trim() || '',
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null
    };

    await databases.updateDocument(
      DATABASE_ID,
      COLLECTIONS.CLIENTS,
      response.documents[0].$id,
      payload
    );
  } else {
    const coords = parseCoordinates(updated.googleMapsLink);
    const payload: any = {
      name: updated.name.trim(),
      phone: updated.phone.trim(),
      email: updated.email.trim(),
      channels: updated.channels.trim(),
      address: updated.address?.trim() || '',
    };
    if (coords) {
      payload.latitude = coords.lat;
      payload.longitude = coords.lng;
    }
    await databases.createDocument(
      DATABASE_ID,
      COLLECTIONS.CLIENTS,
      ID.unique(),
      payload
    );
  }
}
