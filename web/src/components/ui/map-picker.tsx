import React, { useEffect, useRef, useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Search, MapPin } from 'lucide-react';

interface MapPickerProps {
  onLocationSelect: (location: { address: string; googleMapsLink: string; lat: number; lng: number }) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  onLocationSelect,
  initialLat = 6.9271,
  initialLng = 79.8612,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet assets dynamically from CDN
  useEffect(() => {
    if ((window as any).L) {
      setLeafletLoaded(true);
      return;
    }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = '';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setLeafletLoaded(true);
    };
    document.body.appendChild(script);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    // Create map centered at initial coordinates
    const map = L.map(mapContainerRef.current).setView([initialLat, initialLng], 13);
    mapRef.current = map;

    // Add Tile Layer (OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Custom marker icon setup to bypass Leaflet default local asset loading issue
    const defaultIcon = L.icon({
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });

    // Create marker
    const marker = L.marker([initialLat, initialLng], {
      draggable: true,
      icon: defaultIcon,
    }).addTo(map);
    markerRef.current = marker;

    // Map click handler to move marker
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      marker.setLatLng([lat, lng]);
      handleLocationChange(lat, lng);
    });

    // Marker dragend handler
    marker.on('dragend', () => {
      const position = marker.getLatLng();
      handleLocationChange(position.lat, position.lng);
    });

    // Run initial trigger
    handleLocationChange(initialLat, initialLng);

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [leafletLoaded]);

  // Update map center and marker when initialLat/initialLng props change (e.g. pasted URL)
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return;
    
    // To prevent infinite update loops, check if the map is already centered near these coordinates
    const center = mapRef.current.getCenter();
    const latDiff = Math.abs(center.lat - initialLat);
    const lngDiff = Math.abs(center.lng - initialLng);
    
    if (latDiff > 0.0001 || lngDiff > 0.0001) {
      mapRef.current.setView([initialLat, initialLng], 15);
      if (markerRef.current) {
        markerRef.current.setLatLng([initialLat, initialLng]);
      }
    }
  }, [initialLat, initialLng, leafletLoaded]);

  const handleLocationChange = async (lat: number, lng: number) => {
    const googleMapsLink = `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
    let address = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18`
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          address = data.display_name;
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding failed', err);
    }

    onLocationSelect({ address, googleMapsLink, lat, lng });
  };

  const performSearch = async () => {
    if (!searchQuery.trim() || !leafletLoaded || !mapRef.current) return;

    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const { lat, lon } = results[0];
          const latitude = parseFloat(lat);
          const longitude = parseFloat(lon);

          mapRef.current.setView([latitude, longitude], 15);
          if (markerRef.current) {
            markerRef.current.setLatLng([latitude, longitude]);
          }
          handleLocationChange(latitude, longitude);
        } else {
          toast.error('Location search yielded no results.');
        }
      }
    } catch (err) {
      console.error('Location search failed', err);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      performSearch();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          placeholder="Search location (e.g. Kadawatha, Colombo)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="text-xs h-8"
        />
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading}
          onClick={performSearch}
          className="shrink-0 flex gap-1 items-center h-8"
        >
          <Search className="h-3.5 w-3.5" /> Search
        </Button>
      </div>

      <div className="relative border rounded-md overflow-hidden bg-muted flex items-center justify-center">
        {!leafletLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 text-xs text-muted-foreground">
            Loading Interactive Map...
          </div>
        )}
        <div ref={mapContainerRef} className="w-full h-[220px]" style={{ zIndex: 0 }} />
      </div>
      <div className="text-[10px] text-muted-foreground flex items-start gap-1 p-1 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 rounded-md">
        <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <span>Click anywhere on the map or drag the pin to set the coordinates. We will automatically geocode the address and Google Maps links.</span>
      </div>
    </div>
  );
};
