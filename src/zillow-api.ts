/**
 * Zillow API Client - Real API Integration via RapidAPI
 * 
 * This module provides real estate data from Zillow using RapidAPI.
 * Documentation: https://rapidapi.com/apimaker/api/zillow-com1
 * API Base URL: https://zillow-com1.p.rapidapi.com
 */

interface ZillowApiConfig {
  rapidApiKey: string;
  rapidApiHost?: string;
}

interface PropertySearchParams {
  location: string;
  status_type?: 'ForSale' | 'ForRent';
  home_type?: string;
  minPrice?: number;
  maxPrice?: number;
  bathsMin?: number;
  bedsMin?: number;
  sqftMin?: number;
  sqftMax?: number;
  page?: number;
  sort?: string;
}

interface ListingSubType {
  is_FSBA?: boolean;
}

interface PropertyDetails {
  zpid: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;
  listingStatus?: string;
  imgSrc?: string;
  latitude?: number;
  longitude?: number;
  listingSubType?: ListingSubType;
  dateSold?: string | null;
  daysOnZillow?: number;
  lotAreaValue?: number;
  lotAreaUnit?: string;
  country?: string;
  currency?: string;
  hasImage?: boolean;
  contingentListingType?: string | null;
  // Legacy fields for backward compatibility
  homeStatus?: string;
  hdpUrl?: string;
  zestimate?: number;
  rentZestimate?: number;
}

interface DetailedPropertyInfo {
  zpid: number;
  city: string;
  state: string;
  homeType: string;
  homeStatus: string;
  price: number;
  bathrooms: number;
  bedrooms: number;
  livingArea: number;
  yearBuilt?: number;
  description?: string;
  latitude: number;
  longitude: number;
  imgSrc: string;
  url?: string;
  address: {
    city: string;
    state: string;
    streetAddress: string;
    zipcode: string;
    neighborhood?: string | null;
  };
  streetAddress?: string;
  zipcode?: string;
  propertyTaxRate?: number;
  annualHomeownersInsurance?: number;
  monthlyHoaFee?: number;
  zestimate?: number | null;
  rentZestimate?: number;
  timeOnZillow?: string;
  pageViewCount?: number;
  favoriteCount?: number;
  schools?: Array<{
    name: string;
    rating?: number;
    level: string;
    type: string;
    distance?: number;
    grades?: string;
  }>;
  resoFacts?: {
    hasGarage?: boolean;
    garageSpaces?: number;
    parking?: number;
    yearBuilt?: number;
    lotSize?: string;
    pricePerSquareFoot?: number;
    hoaFee?: string;
    taxAnnualAmount?: number;
    [key: string]: any;
  };
  mortgageRates?: {
    arm5Rate?: number;
    fifteenYearFixedRate?: number;
    thirtyYearFixedRate?: number;
  };
  priceHistory?: Array<any>;
  taxHistory?: any;
  nearbyHomes?: Array<{
    zpid: number;
    price: number;
    homeType: string;
    homeStatus: string;
    latitude: number;
    longitude: number;
    address: {
      streetAddress: string;
      city: string;
      state: string;
      zipcode: string;
    };
  }>;
}

interface SearchResult {
  totalResultCount: number;
  resultsPerPage: number;
  totalPages: number;
  currentPage: number;
  props: PropertyDetails[];
}

interface ZestimateResult {
  zpid: string;
  address: string;
  zestimate?: number;
  rentZestimate?: number;
  valuationRange?: {
    low: number;
    high: number;
  };
  valueChange?: number;
}

interface LocationSuggestion {
  display?: string;
  name?: string;
  regionId?: number;
  regionType?: string;
  latitude?: number;
  longitude?: number;
}

interface LocationSuggestionsResult {
  results?: LocationSuggestion[];
}

export class ZillowApiClient {
  private apiKey: string;
  private apiHost: string;
  private baseUrl: string;

  constructor(config: ZillowApiConfig) {
    this.apiKey = config.rapidApiKey;
    this.apiHost = config.rapidApiHost || 'zillow-com1.p.rapidapi.com';
    this.baseUrl = `https://${this.apiHost}`;
  }

  /**
   * Makes a request to the Zillow API via RapidAPI
   * Uses the correct headers format: x-rapidapi-key and x-rapidapi-host
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`[zillow-api.ts][88] --> Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-rapidapi-key': this.apiKey,
        'x-rapidapi-host': this.apiHost,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[zillow-api.ts][100] --> API Error: ${response.status} - ${errorText}`);
      throw new Error(`Zillow API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for properties by location and filters
   * Uses the /propertyExtendedSearch endpoint
   * 
   * Response includes:
   * - props: Array of property objects with details
   * - totalResultCount: Total number of matching properties
   * - resultsPerPage: Number of results per page
   * - totalPages: Total number of pages
   * - currentPage: Current page number
   */
  async searchProperties(params: PropertySearchParams): Promise<SearchResult> {
    console.log(`[zillow-api.ts][125] --> Searching properties with params:`, params);

    const apiParams: Record<string, any> = {
      location: params.location,
      status_type: params.status_type || 'ForSale',
      page: params.page || 1,
    };

    // Add optional filters
    if (params.home_type) apiParams.home_type = params.home_type;
    if (params.minPrice) apiParams.minPrice = params.minPrice;
    if (params.maxPrice) apiParams.maxPrice = params.maxPrice;
    if (params.bathsMin) apiParams.bathsMin = params.bathsMin;
    if (params.bedsMin) apiParams.bedsMin = params.bedsMin;
    if (params.sqftMin) apiParams.sqftMin = params.sqftMin;
    if (params.sqftMax) apiParams.sqftMax = params.sqftMax;
    if (params.sort) apiParams.sort = params.sort;

    try {
      const result = await this.makeRequest<SearchResult>('/propertyExtendedSearch', apiParams);
      console.log(`[zillow-api.ts][148] --> Found ${result.totalResultCount} properties`);
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][151] --> Search error:`, error);
      throw error;
    }
  }

  /**
   * Get property details by Zillow Property ID (zpid)
   * Uses the /property endpoint
   * 
   * Returns comprehensive property information including:
   * - Basic details (price, beds, baths, sqft, year built)
   * - Address and location information
   * - Property description
   * - Schools nearby with ratings and distances
   * - HOA fees, property taxes, insurance estimates
   * - Mortgage rate estimates
   * - Price and tax history
   * - Nearby comparable homes
   * - Detailed RESO facts (garage, parking, lot size, etc.)
   */
  async getPropertyDetails(zpid: string): Promise<DetailedPropertyInfo> {
    console.log(`[zillow-api.ts][175] --> Getting property details for zpid: ${zpid}`);
    
    try {
      const result = await this.makeRequest<DetailedPropertyInfo>('/property', { zpid });
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][180] --> Property details error:`, error);
      throw error;
    }
  }

  /**
   * Get Zestimate (home value estimate) for a property
   */
  async getZestimate(zpid: string): Promise<ZestimateResult> {
    console.log(`[zillow-api.ts][143] --> Getting Zestimate for zpid: ${zpid}`);
    
    try {
      const result = await this.makeRequest<ZestimateResult>('/zestimate', { zpid });
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][149] --> Zestimate error:`, error);
      throw error;
    }
  }

  /**
   * Get rent estimate for a property
   */
  async getRentEstimate(zpid: string): Promise<ZestimateResult> {
    console.log(`[zillow-api.ts][158] --> Getting rent estimate for zpid: ${zpid}`);
    
    try {
      const result = await this.makeRequest<ZestimateResult>('/rentEstimate', { zpid });
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][164] --> Rent estimate error:`, error);
      throw error;
    }
  }

  /**
   * Search for neighborhoods/regions in a location
   * Uses the /locationSuggestions endpoint
   * 
   * Response includes location suggestions with:
   * - display: Display name
   * - name: Location name
   * - regionId: Unique region identifier
   * - regionType: Type of region (city, neighborhood, etc.)
   * - latitude/longitude: Geographic coordinates
   */
  async searchLocationSuggestions(location: string): Promise<any> {
    console.log(`[zillow-api.ts][204] --> Searching location suggestions for: ${location}`);
    
    try {
      const result = await this.makeRequest<any>('/locationSuggestions', { location });
      console.log(`[zillow-api.ts][208] --> Found location suggestions`);
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][211] --> Location suggestions error:`, error);
      throw error;
    }
  }

  /**
   * Search for regions (legacy method, calls searchLocationSuggestions)
   */
  async searchRegions(location: string): Promise<LocationSuggestionsResult> {
    const result = await this.searchLocationSuggestions(location);
    return {
      results: result.resultGroups?.[0]?.results || []
    };
  }

  /**
   * Search for properties by coordinates
   * Uses the /propertyByCoordinates endpoint
   * 
   * Response includes properties near the given lat/lng coordinates
   */
  async searchPropertiesByCoordinates(params: {
    lat: number;
    lng: number;
    status_type?: 'ForSale' | 'ForRent';
    radius?: number;
    page?: number;
  }): Promise<SearchResult> {
    console.log(`[zillow-api.ts] --> Searching properties by coordinates:`, params);
    
    try {
      const apiParams: Record<string, any> = {
        lat: params.lat,
        lng: params.lng,
        status_type: params.status_type || 'ForSale',
        page: params.page || 1,
      };
      
      if (params.radius) apiParams.radius = params.radius;
      
      const result = await this.makeRequest<SearchResult>('/propertyByCoordinates', apiParams);
      console.log(`[zillow-api.ts] --> Found ${result.totalResultCount || 0} properties by coordinates`);
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts] --> Property by coordinates error:`, error);
      throw error;
    }
  }

  /**
   * Alternative method name for searching properties
   */
  async searchPropertiesExtended(params: PropertySearchParams): Promise<SearchResult> {
    return this.searchProperties(params);
  }

  /**
   * Get mortgage rates
   * Note: This endpoint may not be available in all RapidAPI Zillow APIs
   * Falls back to estimated rates if not available
   */
  async getMortgageRates(location?: string): Promise<any> {
    console.log(`[zillow-api.ts][191] --> Getting mortgage rates for: ${location || 'general'}`);
    
    // Most unofficial APIs don't have mortgage rates endpoint
    // Return estimated current rates
    return {
      rates: [
        { term: 30, rate: 6.5, apr: 6.7, loanType: 'Conventional' },
        { term: 15, rate: 5.9, apr: 6.1, loanType: 'Conventional' },
        { term: 30, rate: 6.3, apr: 6.5, loanType: 'FHA' },
        { term: 15, rate: 5.7, apr: 5.9, loanType: 'FHA' },
      ],
      asOf: new Date().toISOString(),
      location: location || 'United States',
      disclaimer: 'Rates are estimates and may vary. Contact Zillow Home Loans for actual rates.',
    };
  }

  /**
   * Calculate home affordability
   * This is a calculation, not an API endpoint
   */
  calculateAffordability(params: {
    annualIncome: number;
    downPayment: number;
    creditScore: number;
    monthlyDebts: number;
    interestRate?: number;
  }): any {
    console.log(`[zillow-api.ts][221] --> Calculating affordability with params:`, params);

    const { annualIncome, downPayment, creditScore, monthlyDebts, interestRate = 6.5 } = params;

    // DTI (Debt-to-Income) ratio calculation
    // Most lenders prefer 43% or less
    const monthlyIncome = annualIncome / 12;
    const maxMonthlyPayment = (monthlyIncome * 0.43) - monthlyDebts;

    // Calculate max loan amount based on monthly payment
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = 30 * 12; // 30-year mortgage
    const maxLoanAmount = maxMonthlyPayment * ((Math.pow(1 + monthlyRate, numPayments) - 1) / (monthlyRate * Math.pow(1 + monthlyRate, numPayments)));

    const maxHomePrice = Math.round(maxLoanAmount + downPayment);
    const estimatedMonthlyPayment = Math.round(maxMonthlyPayment);

    // Breakdown calculation
    const principalAndInterest = Math.round(maxLoanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1));
    const propertyTax = Math.round(maxHomePrice * 0.012 / 12); // 1.2% annual property tax
    const insurance = Math.round(maxHomePrice * 0.004 / 12); // 0.4% annual insurance
    const pmi = downPayment < maxHomePrice * 0.2 ? Math.round(maxLoanAmount * 0.005 / 12) : 0; // PMI if less than 20% down

    return {
      maxHomePrice,
      monthlyPayment: estimatedMonthlyPayment,
      loanAmount: Math.round(maxLoanAmount),
      downPayment,
      interestRate,
      creditScore,
      dtiRatio: ((estimatedMonthlyPayment + monthlyDebts) / monthlyIncome * 100).toFixed(2),
      breakdown: {
        principalAndInterest,
        propertyTax,
        insurance,
        pmi,
        total: principalAndInterest + propertyTax + insurance + pmi,
      },
      assumptions: {
        loanTerm: 30,
        propertyTaxRate: 1.2,
        insuranceRate: 0.4,
        maxDtiRatio: 43,
      },
    };
  }

  /**
   * Calculate monthly mortgage payment
   */
  calculateMortgagePayment(params: {
    homePrice: number;
    downPayment: number;
    interestRate: number;
    loanTerm: number;
  }): any {
    console.log(`[zillow-api.ts][281] --> Calculating mortgage payment:`, params);

    const { homePrice, downPayment, interestRate, loanTerm } = params;
    const loanAmount = homePrice - downPayment;
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;

    const monthlyPayment = Math.round(
      loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1)
    );

    const totalPayment = monthlyPayment * numPayments;
    const totalInterest = totalPayment - loanAmount;

    return {
      homePrice,
      downPayment,
      loanAmount,
      interestRate,
      loanTerm,
      monthlyPayment,
      totalPayment,
      totalInterest,
      apr: interestRate + 0.2, // Estimated APR (slightly higher than rate)
    };
  }
}

/**
 * Create a Zillow API client instance
 */
export function createZillowApiClient(rapidApiKey: string): ZillowApiClient {
  if (!rapidApiKey) {
    console.warn(`[zillow-api.ts][360] --> No RapidAPI key provided, API calls will fail`);
  }
  
  return new ZillowApiClient({
    rapidApiKey,
    rapidApiHost: 'zillow-com1.p.rapidapi.com',
  });
}

// Export types for external use
export type { 
  ZillowApiConfig,
  PropertySearchParams,
  PropertyDetails,
  DetailedPropertyInfo,
  SearchResult,
  ZestimateResult,
  LocationSuggestion,
  LocationSuggestionsResult,
  ListingSubType
};

