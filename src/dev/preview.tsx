import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/index.css';

// Import widgets
import ZillowPropertySearch from '../components/zillow-property-search';
import ZillowAreas from '../components/zillow-areas';
import ZillowBuyability from '../components/zillow-buyability';

// Mock data for preview mode
const mockPropertySearch = {
  properties: [
    {
      id: '1',
      address: '123 Main St, Seattle, WA 98101',
      price: 850000,
      bedrooms: 3,
      bathrooms: 2.5,
      sqft: 2100,
      imageUrl: 'https://photos.zillowstatic.com/fp/d3b3c4b5e5c5f5e5f5e5f5e5f5e5f5e5-cc_ft_768.jpg',
      propertyType: 'Single Family',
      listingType: 'for-sale',
      latitude: 47.6062,
      longitude: -122.3321,
      zestimate: 875000,
    },
    {
      id: '2',
      address: '456 Pike Place, Seattle, WA 98101',
      price: 625000,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 1450,
      imageUrl: 'https://photos.zillowstatic.com/fp/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-cc_ft_768.jpg',
      propertyType: 'Condo',
      listingType: 'for-sale',
      latitude: 47.6097,
      longitude: -122.3421,
      zestimate: 640000,
    },
    {
      id: '3',
      address: '789 Capitol Hill Ave, Seattle, WA 98102',
      price: 2850,
      bedrooms: 1,
      bathrooms: 1,
      sqft: 750,
      imageUrl: 'https://photos.zillowstatic.com/fp/z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4-cc_ft_768.jpg',
      propertyType: 'Apartment',
      listingType: 'for-rent',
      latitude: 47.6205,
      longitude: -122.3209,
    },
    {
      id: '4',
      address: '321 Queen Anne Dr, Seattle, WA 98109',
      price: 1250000,
      bedrooms: 4,
      bathrooms: 3,
      sqft: 2850,
      imageUrl: 'https://photos.zillowstatic.com/fp/j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6-cc_ft_768.jpg',
      propertyType: 'Single Family',
      listingType: 'for-sale',
      latitude: 47.6369,
      longitude: -122.3573,
      zestimate: 1300000,
    },
  ],
  location: 'Seattle, WA',
  totalResults: 247,
  filters: {
    minPrice: 500000,
    maxPrice: 1500000,
    bedrooms: 2,
    bathrooms: 2,
  },
  listingType: 'for-sale',
};

const mockAreas = {
  areas: [
    {
      name: 'Capitol Hill',
      type: 'Neighborhood',
      description: 'Vibrant urban neighborhood known for nightlife, dining, and culture. Popular with young professionals.',
      propertyCount: 87,
      rentalCount: 234,
      avgPrice: 725000,
      latitude: 47.6205,
      longitude: -122.3209,
    },
    {
      name: 'Queen Anne',
      type: 'Neighborhood',
      description: 'Historic hilltop neighborhood with stunning city and mountain views. Mix of old and new homes.',
      propertyCount: 45,
      rentalCount: 98,
      avgPrice: 1150000,
      latitude: 47.6369,
      longitude: -122.3573,
    },
    {
      name: 'Ballard',
      type: 'Neighborhood',
      description: 'Former Scandinavian fishing village now trendy with breweries, shops, and Sunday farmers market.',
      propertyCount: 62,
      rentalCount: 156,
      avgPrice: 895000,
      latitude: 47.6686,
      longitude: -122.3844,
    },
    {
      name: 'Fremont',
      type: 'Neighborhood',
      description: 'Quirky artistic neighborhood with public art, cafes, and a strong community vibe.',
      propertyCount: 38,
      rentalCount: 87,
      avgPrice: 825000,
      latitude: 47.6515,
      longitude: -122.3493,
    },
  ],
  location: 'Seattle, WA',
  propertyType: 'both',
  featuredProperties: [
    {
      id: '1',
      address: 'Delridge, WA',
      price: 93,
      subtitle: 'Emerging area',
      description: 'West Seattle hillside neighborhood with increasing housing inventory and transit improvements.',
      imageUrl: 'https://photos.zillowstatic.com/fp/d6025c6891ff0e4f6c3b1b5e1eac3f09-cc_ft_768.webp',
      listingType: 'for-sale',
      latitude: 47.542660500000004,
      longitude: -122.3522635,
    },
    {
      id: '2',
      address: 'White Center, WA',
      price: 0,
      subtitle: 'Budget friendly',
      description: 'Unincorporated pocket just south of West Seattle known for smaller homes and relatively lower prices.',
      imageUrl: 'https://photos.zillowstatic.com/fp/3c4e2d3c1b8f7e9a5c6d8e2f3a4b5c6d-cc_ft_768.webp',
      listingType: 'for-sale',
      latitude: 47.50839,
      longitude: -122.3481805,
    },
    {
      id: '3',
      address: 'Rainier Valley, WA',
      price: 164,
      subtitle: 'Lower price point',
      description: 'Located in southeast Seattle with light rail access, mixed residential blocks and steady new development.',
      imageUrl: 'https://photos.zillowstatic.com/fp/8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b-cc_ft_768.webp',
      listingType: 'for-sale',
      latitude: 47.543128499999995,
      longitude: -122.26663900000001,
    },
    {
      id: '4',
      address: 'Beacon Hill, WA',
      price: 25,
      subtitle: 'Good value',
      description: 'Residential neighborhood south of downtown with light rail stops and more attainable single-family homes.',
      imageUrl: 'https://photos.zillowstatic.com/fp/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d-cc_ft_768.webp',
      listingType: 'for-sale',
      latitude: 47.5561135,
      longitude: -122.30282949999999,
    },
  ],
};

const mockBuyability = {
  maxHomePrice: 425000,
  monthlyPayment: 2850,
  interestRate: 6.5,
  annualIncome: 95000,
  downPayment: 65000,
  creditScore: 740,
  monthlyDebts: 450,
  breakdown: {
    principalAndInterest: 2275,
    propertyTax: 354,
    insurance: 142,
    pmi: 79,
  },
};

function App() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200 flex flex-col items-center justify-center p-4">
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:scale-105 transition-all duration-200"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Zillow Property Widgets
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Preview with theme toggle
        </p>
      </div>

      <div className="w-[760px] space-y-8">
        <ZillowPropertySearch {...mockPropertySearch} />
        <ZillowAreas {...mockAreas} />
        <ZillowBuyability {...mockBuyability} />
      </div>
    </div>
  );
}

// Inject props into window for widgets to use
declare global {
  interface Window {
    __WIDGET_PROPS__: any;
  }
}

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}








