import { useOpenAiGlobal } from "./use-openai-global";

export function useWidgetProps<T extends Record<string, unknown>>(
  defaultState?: T | (() => T)
): T {
  // Mock data for zillow widgets
  const mockData = {
    // Buyability Calculator
    maxHomePrice: 429751,
    monthlyPayment: 3100,
    interestRate: 6.5,
    annualIncome: 120000,
    downPayment: 40000,
    creditScore: 690,
    monthlyDebts: 500,
    location: 'Seattle, WA',
    latitude: 47.6062,
    longitude: -122.3321,
    breakdown: {
      principalAndInterest: 2170,
      propertyTax: 465,
      insurance: 310,
      pmi: 155,
    },
    // Property Search
    properties: [
      {
        id: '1',
        address: '123 Ocean Ave, Santa Monica, CA 90401',
        price: 2850000,
        bedrooms: 3,
        bathrooms: 2.5,
        sqft: 2100,
        imageUrl: 'https://photos.zillowstatic.com/fp/d3b3c4b5e5c5f5e5f5e5f5e5f5e5f5e5-cc_ft_768.jpg',
        propertyType: 'Single Family',
        listingType: 'for-sale',
        latitude: 34.011379,
        longitude: -118.496629,
        zestimate: 2900000,
      },
      {
        id: '2',
        address: '456 Montana Ave, Santa Monica, CA 90403',
        price: 1625000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1450,
        imageUrl: 'https://photos.zillowstatic.com/fp/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6-cc_ft_768.jpg',
        propertyType: 'Condo',
        listingType: 'for-sale',
        latitude: 34.027045,
        longitude: -118.495122,
        zestimate: 1640000,
      },
      {
        id: '3',
        address: '789 Main St, Santa Monica, CA 90405',
        price: 4850,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 750,
        imageUrl: 'https://photos.zillowstatic.com/fp/z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4-cc_ft_768.jpg',
        propertyType: 'Apartment',
        listingType: 'for-rent',
        latitude: 34.010249,
        longitude: -118.498711,
      },
      {
        id: '4',
        address: '321 Pico Blvd, Santa Monica, CA 90405',
        price: 3250000,
        bedrooms: 4,
        bathrooms: 3,
        sqft: 2850,
        imageUrl: 'https://photos.zillowstatic.com/fp/j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6-cc_ft_768.jpg',
        propertyType: 'Single Family',
        listingType: 'for-sale',
        latitude: 34.004812,
        longitude: -118.480692,
        zestimate: 3300000,
      },
    ],
    areas: [
      {
        name: 'Santa Monica, CA',
        type: 'city',
        description: 'Coastal city with beautiful beaches, pier, and upscale shopping. Known for excellent weather year-round.',
        propertyCount: 245,
        rentalCount: 189,
        avgPrice: 1850000,
        latitude: 34.010249,
        longitude: -118.498711,
      },
      {
        name: 'Santa Monica Pier Area/Ocean Avenue, Santa Monica, CA',
        type: 'hood',
        description: 'Iconic beachfront area with pier, amusement park, and ocean views. Prime tourist destination.',
        propertyCount: 87,
        rentalCount: 156,
        avgPrice: 2200000,
        latitude: 34.011379,
        longitude: -118.496629,
      },
      {
        name: 'Ocean Park, Santa Monica, CA',
        type: 'hood',
        description: 'Quiet beach neighborhood south of downtown Santa Monica. Mix of residential and small businesses.',
        propertyCount: 64,
        rentalCount: 98,
        avgPrice: 1650000,
        latitude: 34.004812,
        longitude: -118.480692,
      },
      {
        name: 'Wilshire/Montana, Santa Monica, CA',
        type: 'hood',
        description: 'Upscale residential area with tree-lined streets and proximity to Montana Avenue shops.',
        propertyCount: 52,
        rentalCount: 34,
        avgPrice: 2450000,
        latitude: 34.027045,
        longitude: -118.495122,
      },
      {
        name: 'Santa Monica, Lyford, TX',
        type: 'hood',
        description: 'Small Texas community with affordable housing and rural character.',
        propertyCount: 12,
        rentalCount: 8,
        avgPrice: 185000,
        latitude: 26.35868,
        longitude: -97.598891,
      },
    ],
    featuredProperties: [
      {
        id: 'f1',
        address: 'Santa Monica Pier Area/Ocean Avenue, Santa Monica, CA',
        price: 87,
        subtitle: 'Beachfront living',
        description: 'Iconic beachfront area with pier, amusement park, and ocean views. Prime tourist destination.',
        imageUrl: 'https://photos.zillowstatic.com/fp/d6025c6891ff0e4f6c3b1b5e1eac3f09-cc_ft_768.webp',
        latitude: 34.011379,
        longitude: -118.496629,
      },
      {
        id: 'f2',
        address: 'Ocean Park, Santa Monica, CA',
        price: 64,
        subtitle: 'Residential beach',
        description: 'Quiet beach neighborhood south of downtown Santa Monica. Mix of residential and small businesses.',
        imageUrl: 'https://photos.zillowstatic.com/fp/3c4e2d3c1b8f7e9a5c6d8e2f3a4b5c6d-cc_ft_768.webp',
        latitude: 34.004812,
        longitude: -118.480692,
      },
      {
        id: 'f3',
        address: 'Wilshire/Montana, Santa Monica, CA',
        price: 52,
        subtitle: 'Upscale residential',
        description: 'Upscale residential area with tree-lined streets and proximity to Montana Avenue shops.',
        imageUrl: 'https://photos.zillowstatic.com/fp/8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b-cc_ft_768.webp',
        latitude: 34.027045,
        longitude: -118.495122,
      },
      {
        id: 'f4',
        address: 'Santa Monica, CA',
        price: 245,
        subtitle: 'City center',
        description: 'Coastal city with beautiful beaches, pier, and upscale shopping. Known for excellent weather year-round.',
        imageUrl: 'https://photos.zillowstatic.com/fp/1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d-cc_ft_768.webp',
        latitude: 34.010249,
        longitude: -118.498711,
      },
    ],
    // Location and filters for areas/properties
    searchLocation: 'Santa Monica, CA',
    totalResults: 460,
    filters: {
      minPrice: 1000000,
      maxPrice: 3500000,
      bedrooms: 2,
      bathrooms: 2,
    },
    listingType: 'for-sale',
  };

  return mockData as unknown as T;
}








