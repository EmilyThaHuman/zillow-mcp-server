import React, { useEffect, useRef, useState } from 'react';
import { useWidgetProps } from '../hooks';
import '../styles/index.css';
import { cn } from '../lib/utils';

interface Property {
  id: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  imageUrl?: string;
  propertyType?: string;
  listingType?: string;
  latitude?: number;
  longitude?: number;
  zestimate?: number;
}

interface Filters {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
}

interface Props extends Record<string, unknown> {
  properties: Property[];
  location: string;
  totalResults: number;
  filters: Filters;
  listingType: string;
}

declare global {
  interface Window {
    google: any;
    initializeMap: () => void;
  }
}

const ZillowPropertySearch: React.FC<Partial<Props>> = (externalProps) => {
  const props = useWidgetProps<Props>({
    properties: [],
    location: 'Search Results',
    totalResults: 0,
    filters: {},
    listingType: 'for-sale',
  });

  // Merge external props (for preview mode) with widget props
  const finalProps = { ...props, ...externalProps };

  // Handle both 'location' and 'searchLocation' for backward compatibility
  const displayLocation = finalProps.location || (finalProps as any).searchLocation || 'Search Results';

  const { properties, totalResults, filters, listingType } = finalProps;
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize Google Maps
  useEffect(() => {
    if (properties.length === 0) return;

    const initMap = () => {
      const mapElement = document.getElementById('search-map');
      if (!mapElement) return;

      const propertiesWithCoords = properties.filter(p => p.latitude && p.longitude);
      
      let center = { lat: 37.7749, lng: -122.4194 };
      let zoom = 12;
      
      if (propertiesWithCoords.length > 0) {
        center = {
          lat: propertiesWithCoords[0].latitude!,
          lng: propertiesWithCoords[0].longitude!
        };
        zoom = 13;
      }

      const mapStyle = [
        { "featureType": "all", "elementType": "geometry", "stylers": [{ "color": "#162238" }] },
        { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "color": "#0d121a" }, { "weight": 2 }] },
        { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#e6e7e8" }] },
        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000f26" }] },
        { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#89aae4" }] }
      ];

      mapRef.current = new window.google.maps.Map(mapElement, {
        center,
        zoom,
        styles: mapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        gestureHandling: 'greedy'
      });

      const infoWindow = new window.google.maps.InfoWindow();

      propertiesWithCoords.forEach((property, index) => {
        const markerColor = property.listingType === 'for-rent' ? '#ff9800' : '#4caf50';
        
        const marker = new window.google.maps.Marker({
          position: { lat: property.latitude!, lng: property.longitude! },
          map: mapRef.current,
          title: property.address,
          icon: {
            path: 'M 0,0 C -2,-20 -10,-22 -10,-30 A 10,10 0 1,1 10,-30 C 10,-22 2,-20 0,0 z',
            fillColor: markerColor,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.2,
            labelOrigin: new window.google.maps.Point(0, -30)
          },
          label: {
            text: '$' + (property.price / 1000).toFixed(0) + 'k',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 'bold'
          }
        });

        const contentString = `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 8px; max-width: 250px;">
          <div style="font-weight: 700; font-size: 16px; color: #0066cc; margin-bottom: 4px;">$${property.price.toLocaleString()}</div>
          <div style="font-size: 13px; color: #666; margin-bottom: 8px;">${property.address}</div>
          <div style="font-size: 12px; color: #333;">${property.bedrooms} bd | ${property.bathrooms} ba | ${property.sqft.toLocaleString()} sqft</div>
        </div>`;

        marker.addListener('click', () => {
          infoWindow.setContent(contentString);
          infoWindow.open(mapRef.current, marker);
          setSelectedIndex(index);
        });

        markersRef.current.push(marker);
      });

      if (markersRef.current.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        propertiesWithCoords.forEach(property => {
          bounds.extend({ lat: property.latitude!, lng: property.longitude! });
        });
        mapRef.current.fitBounds(bounds);
      }

      setMapLoaded(true);
    };

    if (typeof window.google === 'undefined' || !window.google.maps) {
      const script = document.createElement('script');
      script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAMH3mSJD1zFkeUW0jhHFc9YUiBO5vHs8Y';
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
  }, [properties]);

  const handlePropertyClick = (property: Property, index: number) => {
    setSelectedIndex(index);

    if (mapRef.current && property.latitude && property.longitude) {
      mapRef.current.setCenter({ lat: property.latitude, lng: property.longitude });
      mapRef.current.setZoom(16);
      
      if (markersRef.current[index]) {
        markersRef.current[index].setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          markersRef.current[index].setAnimation(null);
        }, 750);
      }
    }

    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'property-selected',
        data: { propertyId: property.id, address: property.address, property }
      }, '*');
    }
  };

  const filterTags: string[] = [];
  if (filters.minPrice || filters.maxPrice) {
    const priceRange = filters.minPrice && filters.maxPrice 
      ? `$${filters.minPrice / 1000}k - $${filters.maxPrice / 1000}k`
      : filters.minPrice 
        ? `Above $${filters.minPrice / 1000}k`
        : `Below $${(filters.maxPrice || 0) / 1000}k`;
    filterTags.push(priceRange);
  }
  if (filters.bedrooms) filterTags.push(`${filters.bedrooms}+ beds`);
  if (filters.bathrooms) filterTags.push(`${filters.bathrooms}+ baths`);
  if (filters.propertyType) filterTags.push(filters.propertyType);

  return (
    <div className="flex flex-col h-full">
      {/* Map Container with Property Cards Overlay */}
      <div className="relative w-full h-[500px] rounded-3xl overflow-hidden shadow-lg border-2 border-gray-200">
        <div id="search-map" className="w-full h-full" />
        
        {/* Expand Button - Top Right */}
        <button className="absolute top-4 right-4 z-20 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        {/* Horizontal Scrollable Properties at bottom of map */}
        {properties.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 pb-6 px-4 z-10">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {properties.map((property, index) => {
                  return (
                    <div
                      key={property.id}
                      className={cn(
                        "bg-white overflow-hidden flex-shrink-0 cursor-pointer transition-shadow",
                        selectedIndex === index 
                          ? "shadow-2xl ring-2 ring-blue-500" 
                          : "hover:shadow-2xl"
                      )}
                      style={{ width: '355px', minHeight: '88px', borderRadius: '22px' }}
                      onClick={() => handlePropertyClick(property, index)}
                    >
                      {/* Card Body - Grid with photo on left, data on right */}
                      <div className="grid grid-cols-[72px_1fr] gap-2 p-2">
                        {/* Property Image - Left Side - 72x72 rounded-2xl */}
                        <div className="w-[72px] h-[72px] bg-gray-200 rounded-2xl overflow-hidden flex-shrink-0">
                          {property.imageUrl ? (
                            <img
                              src={property.imageUrl}
                              alt={property.address}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/72x72?text=No+Image';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs bg-gray-100">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Property Data - Right Side */}
                        <div className="flex flex-col justify-start pt-1 min-w-0">
                          {/* Price - FIRST, Bold, larger */}
                          <div className="font-bold text-base text-blue-600 mb-1">
                            ${property.price.toLocaleString()}
                          </div>
                          
                          {/* Property Details - beds, baths, sqft */}
                          <div className="text-xs text-gray-700 mb-1">
                            {property.bedrooms} bd | {property.bathrooms} ba | {property.sqft.toLocaleString()} sqft
                          </div>
                          
                          {/* Address - smaller gray */}
                          <div className="text-xs text-gray-600 truncate">
                            {property.address}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZillowPropertySearch;








