import React, { useEffect, useRef, useState } from 'react';
import { useWidgetProps } from '../hooks';
import '../styles/index.css';
import { cn } from '../lib/utils';

interface Area {
  name: string;
  type?: string;
  description?: string;
  propertyCount?: number;
  rentalCount?: number;
  avgPrice?: number;
  latitude?: number;
  longitude?: number;
}

interface Property {
  id: string;
  address: string;
  price: number;
  subtitle?: string;
  description?: string;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  imageUrl?: string;
  listingType?: string;
  latitude?: number;
  longitude?: number;
}

interface Props extends Record<string, unknown> {
  areas: Area[];
  location: string;
  propertyType: string;
  featuredProperties?: Property[];
}

declare global {
  interface Window {
    google: any;
    initializeMap: () => void;
  }
}

const ZillowAreas: React.FC<Partial<Props>> = (externalProps) => {
  const props = useWidgetProps<Props>({
    areas: [],
    location: 'Search Results',
    propertyType: 'both',
    featuredProperties: [],
  });

  // Merge external props (for preview mode) with widget props
  const finalProps = { ...props, ...externalProps };
  
  // Handle both 'location' and 'searchLocation' for backward compatibility
  const displayLocation = finalProps.location || (finalProps as any).searchLocation || 'Search Results';

  const { areas, featuredProperties = [] } = finalProps;
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Initialize Google Maps
  useEffect(() => {
    if (areas.length === 0) return;

    const initMap = () => {
      const mapElement = document.getElementById('search-map');
      if (!mapElement) return;

      const areasWithCoords = areas.filter(a => a.latitude && a.longitude);
      
      let center = { lat: 37.7749, lng: -122.4194 };
      let zoom = 10;
      
      if (areasWithCoords.length > 0) {
        center = {
          lat: areasWithCoords[0].latitude!,
          lng: areasWithCoords[0].longitude!
        };
        zoom = 11;
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

      areasWithCoords.forEach((area, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: area.latitude!, lng: area.longitude! },
          map: mapRef.current,
          title: area.name,
          label: {
            text: `${index + 1}`,
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 'bold'
          },
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 16,
            fillColor: '#0066FF',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3
          }
        });

        marker.addListener('click', () => {
          setSelectedIndex(index);
        });

        markersRef.current.push(marker);
      });

      if (markersRef.current.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        areasWithCoords.forEach(area => {
          bounds.extend({ lat: area.latitude!, lng: area.longitude! });
        });
        mapRef.current.fitBounds(bounds);
      }
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
  }, [areas]);

  const handleAreaClick = (area: Area, index: number) => {
    setSelectedIndex(index);

    if (mapRef.current && area.latitude && area.longitude) {
      mapRef.current.setCenter({ lat: area.latitude, lng: area.longitude });
      mapRef.current.setZoom(13);
      
      if (markersRef.current[index]) {
        markersRef.current[index].setAnimation(window.google.maps.Animation.BOUNCE);
        setTimeout(() => {
          markersRef.current[index].setAnimation(null);
        }, 750);
      }
    }

    if (window.parent && window.parent.postMessage) {
      window.parent.postMessage({
        type: 'area-selected',
        data: { areaName: area.name, area }
      }, '*');
    }
  };

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
        {featuredProperties.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 pb-6 px-4 z-10">
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                {featuredProperties.map((property) => {
                  return (
                    <div
                      key={property.id}
                      className="bg-white overflow-hidden flex-shrink-0 cursor-pointer transition-shadow"
                      style={{ width: '355px', minHeight: '140px', borderRadius: '22px' }}
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
                          {/* Area Name - dataArea1 - FIRST, Bold, larger */}
                          <h3 className="font-bold text-sm text-gray-900 mb-1 truncate">
                            {property.address}
                          </h3>
                          
                          {/* Subtitle - dataArea2 - smaller gray */}
                          {property.subtitle && (
                            <div className="text-xs text-gray-600 mb-1 truncate">
                              {property.subtitle}
                            </div>
                          )}
                          
                          {/* Property Count - dataArea3 - AFTER name and subtitle */}
                          <div className="text-xs text-gray-600 line-clamp-1">
                            <span className="font-bold">{property.price > 0 ? property.price : 0}</span> homes for sale
                          </div>
                        </div>
                      </div>

                      {/* Description - Below the grid */}
                      {property.description && (
                        <div className="px-2 pb-2 pt-0">
                          <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                            {property.description}
                          </p>
                        </div>
                      )}
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

export default ZillowAreas;








