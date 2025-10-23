/**
 * Zillow API Client - Real API Integration via RapidAPI
 * 
 * This module provides real estate data from Zillow using RapidAPI.
 * Documentation: https://rapidapi.com/apimaker/api/zillow-com1
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
}

interface PropertyDetails {
  zpid: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  livingArea: number;
  propertyType: string;
  homeStatus: string;
  imgSrc?: string;
  latitude?: number;
  longitude?: number;
  listingSubType?: any;
  hdpUrl?: string;
  zestimate?: number;
  rentZestimate?: number;
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
   */
  private async makeRequest<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    console.log(`[zillow-api.ts][73] --> Fetching: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': this.apiHost,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[zillow-api.ts][85] --> API Error: ${response.status} - ${errorText}`);
      throw new Error(`Zillow API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Search for properties by location and filters
   */
  async searchProperties(params: PropertySearchParams): Promise<SearchResult> {
    console.log(`[zillow-api.ts][96] --> Searching properties with params:`, params);

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

    try {
      const result = await this.makeRequest<SearchResult>('/propertyExtendedSearch', apiParams);
      console.log(`[zillow-api.ts][116] --> Found ${result.totalResultCount} properties`);
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][119] --> Search error:`, error);
      throw error;
    }
  }

  /**
   * Get property details by Zillow Property ID (zpid)
   */
  async getPropertyDetails(zpid: string): Promise<PropertyDetails> {
    console.log(`[zillow-api.ts][128] --> Getting property details for zpid: ${zpid}`);
    
    try {
      const result = await this.makeRequest<PropertyDetails>('/property', { zpid });
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][134] --> Property details error:`, error);
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
   */
  async searchRegions(location: string): Promise<any> {
    console.log(`[zillow-api.ts][173] --> Searching regions for: ${location}`);
    
    try {
      const result = await this.makeRequest<any>('/regionSearch', { location });
      return result;
    } catch (error) {
      console.error(`[zillow-api.ts][179] --> Region search error:`, error);
      throw error;
    }
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
    console.warn(`[zillow-api.ts][318] --> No RapidAPI key provided, API calls will fail`);
  }
  
  return new ZillowApiClient({
    rapidApiKey,
    rapidApiHost: 'zillow-com1.p.rapidapi.com',
  });
}

