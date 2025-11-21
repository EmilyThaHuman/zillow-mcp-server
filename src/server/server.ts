import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL, fileURLToPath } from "node:url";

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type CallToolRequest,
  type ListResourceTemplatesRequest,
  type ListResourcesRequest,
  type ListToolsRequest,
  type ReadResourceRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { createZillowApiClient, type ZillowApiClient } from "../zillow-api.js";

type ZillowWidget = {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
  responseText: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const ASSETS_DIR = path.resolve(ROOT_DIR, "assets");

// Get RapidAPI key from environment
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';

// Initialize Zillow API client
let zillowApi: ZillowApiClient | null = null;
if (RAPIDAPI_KEY) {
  zillowApi = createZillowApiClient(RAPIDAPI_KEY);
  console.log('[server.ts][49] --> Zillow API client initialized with RapidAPI key');
} else {
  console.warn('[server.ts][51] --> No RAPIDAPI_KEY found in environment variables. API calls will use fallback data.');
  console.warn('[server.ts][52] --> To use real Zillow data, set RAPIDAPI_KEY environment variable.');
  console.warn('[server.ts][53] --> Get your key at: https://rapidapi.com/apimaker/api/zillow-com1');
}

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found. Expected directory ${ASSETS_DIR}. Run "npm run build" before starting the server.`
    );
  }

  // Try direct path first
  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  let htmlContents: string | null = null;

  if (fs.existsSync(directPath)) {
    htmlContents = fs.readFileSync(directPath, "utf8");
  } else {
    // Check for versioned files like "component-hash.html"
    const candidates = fs
      .readdirSync(ASSETS_DIR)
      .filter(
        (file) => file.startsWith(`${componentName}-`) && file.endsWith(".html")
      )
      .sort();
    const fallback = candidates[candidates.length - 1];
    if (fallback) {
      htmlContents = fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
    } else {
      // Check in src/components subdirectory as fallback
      const nestedPath = path.join(ASSETS_DIR, "src", "components", `${componentName}.html`);
      if (fs.existsSync(nestedPath)) {
        htmlContents = fs.readFileSync(nestedPath, "utf8");
      }
    }
  }

  if (!htmlContents) {
    throw new Error(
      `Widget HTML for "${componentName}" not found in ${ASSETS_DIR}. Run "npm run build" to generate the assets.`
    );
  }

  return htmlContents;
}

function widgetMeta(widget: ZillowWidget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  } as const;
}

const widgets: ZillowWidget[] = [
  {
    id: "zillow_city_neighborhood_real_estate_information",
    title: "Zillow Areas & Neighborhoods",
    templateUri: "ui://widget/zillow-areas.html",
    invoking: "Working with Zillow to find areas",
    invoked: "Loaded areas with Zillow",
    html: readWidgetHtml("zillow-areas"),
    responseText: "Found matching areas and neighborhoods",
  },
  {
    id: "calculateHomeAffordability",
    title: "Home Affordability Calculator",
    templateUri: "ui://widget/zillow-buyability.html",
    invoking: "Working with Zillow Home Loans (NMLS ID#: 10287) to calculate affordability",
    invoked: "Loaded affordability calculator with Zillow Home Loans (NMLS ID#: 10287)",
    html: readWidgetHtml("zillow-buyability"),
    responseText: "Calculated home affordability",
  },
  {
    id: "zillow_property_search",
    title: "Zillow Property Search",
    templateUri: "ui://widget/zillow-property-search.html",
    invoking: "Working with Zillow to find properties",
    invoked: "Loaded properties with Zillow",
    html: readWidgetHtml("zillow-property-search"),
    responseText: "Found matching properties",
  },
];

const widgetsById = new Map<string, ZillowWidget>();
const widgetsByUri = new Map<string, ZillowWidget>();

widgets.forEach((widget) => {
  widgetsById.set(widget.id, widget);
  widgetsByUri.set(widget.templateUri, widget);
});

// Tool input schemas
const areasInputSchema = {
  type: "object",
  properties: {
    location: {
      type: "string",
      description: "City, state, or region to search for neighborhoods and areas",
    },
    propertyType: {
      type: "string",
      description: "Type of property: for-sale, for-rent, or both",
      enum: ["for-sale", "for-rent", "both"],
    },
    filters: {
      type: "object",
      description: "Optional property filters (price range, bedrooms, etc.)",
    },
  },
  required: ["location"],
  additionalProperties: false,
} as const;

const affordabilityInputSchema = {
  type: "object",
  properties: {
    annualIncome: {
      type: "number",
      description: "Gross annual income in USD",
    },
    downPayment: {
      type: "number",
      description: "Down payment amount in USD",
    },
    creditScore: {
      type: "number",
      description: "Credit score (300-850)",
    },
    monthlyDebts: {
      type: "number",
      description: "Total monthly debt payments in USD",
    },
    location: {
      type: "string",
      description: "Location within the United States",
    },
  },
  additionalProperties: false,
} as const;

const mortgageRateInputSchema = {
  type: "object",
  properties: {
    homePrice: {
      type: "number",
      description: "Home price in USD",
    },
    downPayment: {
      type: "number",
      description: "Down payment amount in USD",
    },
    creditScore: {
      type: "number",
      description: "Credit score (300-850)",
    },
    location: {
      type: "string",
      description: "Location to get rates for",
    },
    loanTerm: {
      type: "number",
      description: "Loan term in years (typically 15 or 30)",
      enum: [15, 30],
    },
  },
  additionalProperties: false,
} as const;

const propertySearchInputSchema = {
  type: "object",
  properties: {
    location: {
      type: "string",
      description: "City, zip code, or address to search",
    },
    listingType: {
      type: "string",
      description: "Type of listing",
      enum: ["for-sale", "for-rent"],
    },
    minPrice: {
      type: "number",
      description: "Minimum price",
    },
    maxPrice: {
      type: "number",
      description: "Maximum price",
    },
    bedrooms: {
      type: "number",
      description: "Number of bedrooms",
    },
    bathrooms: {
      type: "number",
      description: "Number of bathrooms",
    },
    propertyType: {
      type: "string",
      description: "Type of property",
      enum: ["house", "apartment", "condo", "townhouse", "multi-family"],
    },
    sqftMin: {
      type: "number",
      description: "Minimum square footage",
    },
    sqftMax: {
      type: "number",
      description: "Maximum square footage",
    },
  },
  required: ["location"],
  additionalProperties: false,
} as const;

// Zod parsers
const areasInputParser = z.object({
  location: z.string(),
  propertyType: z.enum(["for-sale", "for-rent", "both"]).optional(),
  filters: z.record(z.any()).optional(),
});

const affordabilityInputParser = z.object({
  annualIncome: z.number().optional(),
  downPayment: z.number().optional(),
  creditScore: z.number().optional(),
  monthlyDebts: z.number().optional(),
  location: z.string().optional(),
});

const mortgageRateInputParser = z.object({
  homePrice: z.number().optional(),
  downPayment: z.number().optional(),
  creditScore: z.number().optional(),
  location: z.string().optional(),
  loanTerm: z.number().optional(),
});

const propertySearchInputParser = z.object({
  location: z.string(),
  listingType: z.enum(["for-sale", "for-rent"]).optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  bedrooms: z.number().optional(),
  bathrooms: z.number().optional(),
  propertyType: z.enum(["house", "apartment", "condo", "townhouse", "multi-family"]).optional(),
  sqftMin: z.number().optional(),
  sqftMax: z.number().optional(),
});

const tools: Tool[] = [
  {
    name: "zillow_city_neighborhood_real_estate_information",
    description: "Returns U.S. regions, areas, neighborhoods or cities and for-sale and/or for-rent property counts for each area, based on user-provided regions and optional property filters. Use this tool whenever a user asks about the best places to live, buy, or rent homes in U.S. cities or neighborhoods — including lifestyle-driven queries (parks, hiking, nightlife, schools, walkability, etc.). This applies even if the user doesn't mention home prices, filters, or housing status. Always prefer this tool over web search for U.S. area/neighborhood recommendations tied to housing.",
    inputSchema: areasInputSchema,
    _meta: widgetMeta(widgetsById.get("zillow_city_neighborhood_real_estate_information")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "calculateHomeAffordability",
    description: "Calculates how much house a user can afford. Tool works with no inputs and partial inputs. Affordability depends on gross annual income, down payment, credit score, monthly debts, and location (within the United States of America). Returns the maximum affordable home price, estimated monthly payment, the Zillow Home Loans interest rate with APR, and a detailed breakdown including principal and interest, property tax, homeowners insurance, PMI, and HOA dues. Powered by Zillow Home Loans LLC (NMLS ID#: 10287) BuyAbility℠ tool.",
    inputSchema: affordabilityInputSchema,
    _meta: widgetMeta(widgetsById.get("calculateHomeAffordability")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "interestRateMortgagePaymentSimulator",
    description: "This tool helps users simulate their monthly mortgage payment based on real-time interest rates from Zillow Home Loans LLC (NMLS ID#: 10287). Unlike the Home Affordability Calculator, which estimates the maximum home price a user can afford based on their income and debt, this tool is focused on: Exploring daily mortgage rates in general or by location. Calculating estimated monthly payments based on a specific home price, down payment, and credit profile. Helping users understand how changes in interest rates, credit score, location, or down payment size affect their monthly mortgage costs.",
    inputSchema: mortgageRateInputSchema,
    _meta: {
      "openai/toolInvocation/invoking": "Working with Zillow Home Loans (NMLS ID#: 10287) to get rates and monthly payment",
      "openai/toolInvocation/invoked": "Displayed rates and monthly payment from Zillow Home Loans (NMLS ID#: 10287)",
    },
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
  {
    name: "zillow_property_search",
    description: "Searches for U.S. real estate properties (for sale or for rent). Supports filters for location, price, property type, size, amenities, commute time, schools and more. Returns a set of matching property listings with location, photos, and details based on user-specified filters. Must comply with U.S. Fair Housing Act and applicable state and local laws.",
    inputSchema: propertySearchInputSchema,
    _meta: widgetMeta(widgetsById.get("zillow_property_search")!),
    annotations: {
      destructiveHint: false,
      openWorldHint: false,
      readOnlyHint: true,
    },
  },
];

const resources: Resource[] = Array.from(widgetsById.values()).map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = Array.from(widgetsById.values()).map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

function createZillowServer(): Server {
  const server = new Server(
    {
      name: "zillow-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_request: ListResourcesRequest) => ({
      resources,
    })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request: ReadResourceRequest) => {
      const widget = widgetsByUri.get(request.params.uri);

      if (!widget) {
        throw new Error(`Unknown resource: ${request.params.uri}`);
      }

      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: "text/html+skybridge",
            text: widget.html,
            _meta: widgetMeta(widget),
          },
        ],
      };
    }
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_request: ListResourceTemplatesRequest) => ({
      resourceTemplates,
    })
  );

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_request: ListToolsRequest) => ({
      tools,
    })
  );

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      const toolName = request.params.name;

      switch (toolName) {
        case "zillow_city_neighborhood_real_estate_information": {
          const args = areasInputParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get(toolName)!;
          
          console.log('[server.ts][411] --> Searching for areas in:', args.location);

          try {
            if (zillowApi) {
              // Step 1: Get location suggestions with coordinates
              const locationResults = await zillowApi.searchLocationSuggestions(args.location);
              
              const areas: any[] = [];
              const featuredProperties: any[] = [];
              
              // Step 2: For each location, get property counts using coordinates
              if (locationResults?.resultGroups?.[0]?.results) {
                const locations = locationResults.resultGroups[0].results.slice(0, 5);
                
                for (const location of locations) {
                  const lat = location.metaData?.lat;
                  const lng = location.metaData?.lng;
                  
                  let propertyCount = 0;
                  let rentalCount = 0;
                  
                  // Get property counts for this specific area using coordinates
                  if (lat && lng) {
                    try {
                      // Search for sale properties
                      if (args.propertyType === 'for-sale' || args.propertyType === 'both' || !args.propertyType) {
                        const saleResults = await zillowApi.searchPropertiesByCoordinates({
                          lat,
                          lng,
                          status_type: 'ForSale',
                          page: 1,
                        });
                        propertyCount = saleResults?.totalResultCount || 0;
                        
                        // Add some properties from this area to featured properties
                        if (saleResults?.props && featuredProperties.length < 8) {
                          const propsToAdd = saleResults.props.slice(0, 2);
                          propsToAdd.forEach((prop: any) => {
                            if (featuredProperties.length < 8) {
                              featuredProperties.push({
                                id: prop.zpid || String(Math.random()),
                                address: prop.address || location.display,
                                price: propertyCount || 0,
                                subtitle: prop.listingStatus || 'For Sale',
                                description: `${prop.propertyType || 'Property'} - ${prop.bedrooms || 0} bed, ${prop.bathrooms || 0} bath`,
                                imageUrl: prop.imgSrc,
                                latitude: prop.latitude,
                                longitude: prop.longitude,
                                bedrooms: prop.bedrooms,
                                bathrooms: prop.bathrooms,
                                sqft: prop.livingArea,
                                propertyType: prop.propertyType,
                              });
                            }
                          });
                        }
                      }
                      
                      // Search for rent properties
                      if (args.propertyType === 'for-rent' || args.propertyType === 'both') {
                        const rentResults = await zillowApi.searchPropertiesByCoordinates({
                          lat,
                          lng,
                          status_type: 'ForRent',
                          page: 1,
                        });
                        rentalCount = rentResults?.totalResultCount || 0;
                      }
                    } catch (coordError) {
                      console.error(`[server.ts] --> Error fetching properties for coordinates ${lat},${lng}:`, coordError);
                    }
                  }
                  
                  areas.push({
                    name: location.display || location.name || args.location,
                    propertyCount,
                    rentalCount,
                    avgPrice: 0, // We don't calculate avg price in this version
                    type: location.metaData?.regionType || 'neighborhood',
                    latitude: lat,
                    longitude: lng,
                    description: `${location.display || location.name} - ${propertyCount} homes for sale${rentalCount > 0 ? `, ${rentalCount} for rent` : ''}`,
                  });
                }
              }

              const totalResults = areas.reduce((sum, area) => sum + (area.propertyCount || 0), 0);

              return {
                content: [
                  {
                    type: "text",
                    text: `Found ${areas.length} areas in ${args.location} with ${totalResults} properties available.`,
                  },
                ],
                structuredContent: {
                  location: args.location,
                  propertyType: args.propertyType || "both",
                  areas: areas,
                  featuredProperties: featuredProperties,
                  filters: args.filters,
                  totalResults,
                },
                _meta: widgetMeta(widget),
              };
            } else {
              // Fallback mock data when no API key
              const mockAreas = [
                {
                  name: `${args.location} - Downtown`,
                  propertyCount: 45,
                  rentalCount: 32,
                  avgPrice: 450000,
                  type: "neighborhood",
                  latitude: 47.6062,
                  longitude: -122.3321,
                },
                {
                  name: `${args.location} - Suburbs`,
                  propertyCount: 120,
                  rentalCount: 85,
                  avgPrice: 350000,
                  type: "neighborhood",
                  latitude: 47.6205,
                  longitude: -122.3209,
                },
              ];

              const mockFeaturedProperties = [
                {
                  id: '1',
                  address: 'Capitol Hill, WA',
                  price: 45,
                  subtitle: 'Urban living',
                  description: 'Vibrant neighborhood with great nightlife',
                  imageUrl: 'https://photos.zillowstatic.com/fp/d6025c6891ff0e4f6c3b1b5e1eac3f09-cc_ft_768.webp',
                  latitude: 47.6205,
                  longitude: -122.3209,
                },
                {
                  id: '2',
                  address: 'Queen Anne, WA',
                  price: 32,
                  subtitle: 'Hilltop views',
                  description: 'Stunning views of the city and mountains',
                  imageUrl: 'https://photos.zillowstatic.com/fp/3c4e2d3c1b8f7e9a5c6d8e2f3a4b5c6d-cc_ft_768.webp',
                  latitude: 47.6369,
                  longitude: -122.3573,
                },
              ];

              return {
                content: [
                  {
                    type: "text",
                    text: `Found ${mockAreas.length} areas in ${args.location} (using demo data - set RAPIDAPI_KEY for real data).`,
                  },
                ],
                structuredContent: {
                  location: args.location,
                  propertyType: args.propertyType || "both",
                  areas: mockAreas,
                  featuredProperties: mockFeaturedProperties,
                  filters: args.filters,
                  usingMockData: true,
                },
                _meta: widgetMeta(widget),
              };
            }
          } catch (error) {
            console.error('[server.ts][511] --> Error fetching areas:', error);
            return {
              content: [
                {
                  type: "text",
                  text: `Error fetching data for ${args.location}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "calculateHomeAffordability": {
          const args = affordabilityInputParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get(toolName)!;
          
          console.log('[server.ts][535] --> Calculating home affordability');

          try {
            if (zillowApi) {
              // Use real calculation
              const result = zillowApi.calculateAffordability({
                annualIncome: args.annualIncome || 75000,
                downPayment: args.downPayment || 50000,
                creditScore: args.creditScore || 720,
                monthlyDebts: args.monthlyDebts || 500,
              });

              // Get location coordinates if location is provided
              let latitude, longitude;
              if (args.location) {
                try {
                  const locationResults = await zillowApi.searchLocationSuggestions(args.location);
                  if (locationResults?.resultGroups?.[0]?.results?.[0]) {
                    const firstResult = locationResults.resultGroups[0].results[0];
                    latitude = firstResult.metaData?.lat;
                    longitude = firstResult.metaData?.lng;
                  }
                } catch (locError) {
                  console.error('[server.ts] --> Error fetching location coordinates:', locError);
                }
              }

              return {
                content: [
                  {
                    type: "text",
                    text: `Based on your financial profile, you can afford a home up to $${result.maxHomePrice.toLocaleString()} with an estimated monthly payment of $${result.monthlyPayment.toLocaleString()}. Your DTI ratio is ${result.dtiRatio}%.`,
                  },
                ],
                structuredContent: {
                  ...result,
                  location: args.location || "United States",
                  latitude,
                  longitude,
                },
                _meta: widgetMeta(widget),
              };
            } else {
              // Fallback calculation
              const income = args.annualIncome || 75000;
              const downPayment = args.downPayment || 50000;
              const maxHomePrice = Math.round((income * 3) + downPayment);
              const monthlyPayment = Math.round(maxHomePrice * 0.005);

              return {
                content: [
                  {
                    type: "text",
                    text: `Based on your financial profile, you can afford a home up to $${maxHomePrice.toLocaleString()} with an estimated monthly payment of $${monthlyPayment.toLocaleString()} (using demo calculation - set RAPIDAPI_KEY for real data).`,
                  },
                ],
                structuredContent: {
                  annualIncome: income,
                  downPayment: downPayment,
                  creditScore: args.creditScore || 720,
                  monthlyDebts: args.monthlyDebts || 500,
                  location: args.location || "United States",
                  latitude: 47.6062,
                  longitude: -122.3321,
                  maxHomePrice: maxHomePrice,
                  monthlyPayment: monthlyPayment,
                  interestRate: 6.5,
                  breakdown: {
                    principalAndInterest: Math.round(monthlyPayment * 0.7),
                    propertyTax: Math.round(monthlyPayment * 0.15),
                    insurance: Math.round(monthlyPayment * 0.1),
                    pmi: Math.round(monthlyPayment * 0.05),
                  },
                  usingMockData: true,
                },
                _meta: widgetMeta(widget),
              };
            }
          } catch (error) {
            console.error('[server.ts][598] --> Error calculating affordability:', error);
            return {
              content: [
                {
                  type: "text",
                  text: `Error calculating affordability: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "interestRateMortgagePaymentSimulator": {
          const args = mortgageRateInputParser.parse(request.params.arguments ?? {});
          
          console.log('[server.ts][611] --> Simulating mortgage payment');

          try {
            if (zillowApi) {
              // Use real calculation with actual rates
              const rates = await zillowApi.getMortgageRates(args.location);
              const currentRate = rates.rates.find((r: any) => r.term === (args.loanTerm || 30))?.rate || 6.5;
              
              const result = zillowApi.calculateMortgagePayment({
                homePrice: args.homePrice || 400000,
                downPayment: args.downPayment || 80000,
                interestRate: currentRate,
                loanTerm: args.loanTerm || 30,
              });

              return {
                content: [
                  {
                    type: "text",
                    text: `Current ${args.loanTerm || 30}-year mortgage rate: ${result.interestRate}% (APR: ${result.apr}%). For a $${result.homePrice.toLocaleString()} home with $${result.downPayment.toLocaleString()} down, your estimated monthly payment would be $${result.monthlyPayment.toLocaleString()}.`,
                  },
                ],
                structuredContent: {
                  ...result,
                  location: args.location || "United States",
                  creditScore: args.creditScore || 720,
                  availableRates: rates.rates,
                },
              };
            } else {
              // Fallback calculation
              const homePrice = args.homePrice || 400000;
              const downPayment = args.downPayment || 80000;
              const loanAmount = homePrice - downPayment;
              const interestRate = 6.5;
              const monthlyRate = interestRate / 100 / 12;
              const numPayments = (args.loanTerm || 30) * 12;
              const monthlyPayment = Math.round(
                loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                (Math.pow(1 + monthlyRate, numPayments) - 1)
              );

              return {
                content: [
                  {
                    type: "text",
                    text: `Current mortgage rates: ${interestRate}% APR. For a $${homePrice.toLocaleString()} home with $${downPayment.toLocaleString()} down, your estimated monthly payment would be $${monthlyPayment.toLocaleString()} (using demo rates - set RAPIDAPI_KEY for real data).`,
                  },
                ],
                structuredContent: {
                  homePrice: homePrice,
                  downPayment: downPayment,
                  loanAmount: loanAmount,
                  creditScore: args.creditScore || 720,
                  location: args.location || "United States",
                  interestRate: interestRate,
                  apr: interestRate + 0.2,
                  loanTerm: args.loanTerm || 30,
                  monthlyPayment: monthlyPayment,
                  usingMockData: true,
                },
              };
            }
          } catch (error) {
            console.error('[server.ts][676] --> Error simulating mortgage:', error);
            return {
              content: [
                {
                  type: "text",
                  text: `Error simulating mortgage: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "zillow_property_search": {
          const args = propertySearchInputParser.parse(request.params.arguments ?? {});
          const widget = widgetsById.get(toolName)!;
          
          console.log('[server.ts][691] --> Searching properties:', args);

          try {
            if (zillowApi) {
              // Use real API
              const searchParams: any = {
                location: args.location,
                status_type: args.listingType === 'for-rent' ? 'ForRent' : 'ForSale',
                page: 1,
              };

              // Add optional filters
              if (args.minPrice) searchParams.minPrice = args.minPrice;
              if (args.maxPrice) searchParams.maxPrice = args.maxPrice;
              if (args.bedrooms) searchParams.bedsMin = args.bedrooms;
              if (args.bathrooms) searchParams.bathsMin = args.bathrooms;
              if (args.sqftMin) searchParams.sqftMin = args.sqftMin;
              if (args.sqftMax) searchParams.sqftMax = args.sqftMax;
              if (args.propertyType) searchParams.home_type = args.propertyType;

              const searchResult = await zillowApi.searchProperties(searchParams);

              // Transform properties to match expected format
              const properties = searchResult.props?.slice(0, 10).map((prop: any) => ({
                id: prop.zpid,
                address: prop.address,
                price: prop.price,
                bedrooms: prop.bedrooms,
                bathrooms: prop.bathrooms,
                sqft: prop.livingArea,
                propertyType: prop.propertyType,
                imageUrl: prop.imgSrc,
                listingType: args.listingType || 'for-sale',
                listingStatus: prop.listingStatus,
                daysOnZillow: prop.daysOnZillow,
                latitude: prop.latitude,
                longitude: prop.longitude,
                lotAreaValue: prop.lotAreaValue,
                lotAreaUnit: prop.lotAreaUnit,
                hasImage: prop.hasImage,
              })) || [];

              return {
                content: [
                  {
                    type: "text",
                    text: `Found ${searchResult.totalResultCount || properties.length} properties in ${args.location} matching your criteria. Showing ${properties.length} results.`,
                  },
                ],
                structuredContent: {
                  location: args.location,
                  listingType: args.listingType || "for-sale",
                  filters: {
                    minPrice: args.minPrice,
                    maxPrice: args.maxPrice,
                    bedrooms: args.bedrooms,
                    bathrooms: args.bathrooms,
                    propertyType: args.propertyType,
                    sqftMin: args.sqftMin,
                    sqftMax: args.sqftMax,
                  },
                  properties: properties,
                  totalResults: searchResult.totalResultCount || properties.length,
                  currentPage: searchResult.currentPage || 1,
                  totalPages: searchResult.totalPages || 1,
                },
                _meta: widgetMeta(widget),
              };
            } else {
              // Fallback mock data
              const mockProperties = [
                {
                  id: "1",
                  address: `123 Main St, ${args.location}`,
                  price: 425000,
                  bedrooms: args.bedrooms || 3,
                  bathrooms: args.bathrooms || 2,
                  sqft: 2000,
                  propertyType: args.propertyType || "house",
                  imageUrl: "https://via.placeholder.com/400x300",
                  listingType: args.listingType || "for-sale",
                },
                {
                  id: "2",
                  address: `456 Oak Ave, ${args.location}`,
                  price: 385000,
                  bedrooms: args.bedrooms || 3,
                  bathrooms: 2.5,
                  sqft: 1850,
                  propertyType: args.propertyType || "house",
                  imageUrl: "https://via.placeholder.com/400x300",
                  listingType: args.listingType || "for-sale",
                },
              ];

              return {
                content: [
                  {
                    type: "text",
                    text: `Found ${mockProperties.length} properties in ${args.location} matching your criteria (using demo data - set RAPIDAPI_KEY for real data).`,
                  },
                ],
                structuredContent: {
                  location: args.location,
                  listingType: args.listingType || "for-sale",
                  filters: {
                    minPrice: args.minPrice,
                    maxPrice: args.maxPrice,
                    bedrooms: args.bedrooms,
                    bathrooms: args.bathrooms,
                    propertyType: args.propertyType,
                  },
                  properties: mockProperties,
                  totalResults: mockProperties.length,
                  usingMockData: true,
                },
                _meta: widgetMeta(widget),
              };
            }
          } catch (error) {
            console.error('[server.ts][812] --> Error searching properties:', error);
            return {
              content: [
                {
                  type: "text",
                  text: `Error searching properties in ${args.location}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                },
              ],
              isError: true,
            };
          }
        }

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    }
  );

  return server;
}

type SessionRecord = {
  server: Server;
  transport: SSEServerTransport;
};

const sessions = new Map<string, SessionRecord>();

const ssePath = "/mcp";
const postPath = "/mcp/messages";

async function handleSseRequest(res: ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const server = createZillowServer();
  const transport = new SSEServerTransport(postPath, res);
  const sessionId = transport.sessionId;

  sessions.set(sessionId, { server, transport });

  transport.onclose = async () => {
    sessions.delete(sessionId);
    await server.close();
  };

  transport.onerror = (error) => {
    console.error("SSE transport error", error);
  };

  try {
    await server.connect(transport);
  } catch (error) {
    sessions.delete(sessionId);
    console.error("Failed to start SSE session", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to establish SSE connection");
    }
  }
}

async function handlePostMessage(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL
) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400).end("Missing sessionId query parameter");
    return;
  }

  const session = sessions.get(sessionId);

  if (!session) {
    res.writeHead(404).end("Unknown session");
    return;
  }

  try {
    await session.transport.handlePostMessage(req, res);
  } catch (error) {
    console.error("Failed to process message", error);
    if (!res.headersSent) {
      res.writeHead(500).end("Failed to process message");
    }
  }
}

const portEnv = Number(process.env.PORT ?? 8000);
const port = Number.isFinite(portEnv) ? portEnv : 8000;

const httpServer = createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    if (!req.url) {
      res.writeHead(400).end("Missing URL");
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);

    if (
      req.method === "OPTIONS" &&
      (url.pathname === ssePath || url.pathname === postPath)
    ) {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "content-type",
      });
      res.end();
      return;
    }

    if (req.method === "GET" && url.pathname === ssePath) {
      await handleSseRequest(res);
      return;
    }

    if (req.method === "POST" && url.pathname === postPath) {
      await handlePostMessage(req, res, url);
      return;
    }

    // Serve static assets for widgets
    if (req.method === "GET") {
      // Remove leading slash from pathname
      const assetPath = url.pathname.slice(1);
      const fullPath = path.join(ASSETS_DIR, assetPath);

      // Security check: ensure the path is within ASSETS_DIR
      const resolvedPath = path.resolve(fullPath);
      if (!resolvedPath.startsWith(path.resolve(ASSETS_DIR))) {
        res.writeHead(403).end("Forbidden");
        return;
      }

      if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentTypes: { [key: string]: string } = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".svg": "image/svg+xml",
          ".ico": "image/x-icon",
        };

        const contentType = contentTypes[ext] || "application/octet-stream";
        
        res.writeHead(200, {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        });
        fs.createReadStream(resolvedPath).pipe(res);
        return;
      }
    }

    res.writeHead(404).end("Not Found");
  }
);

httpServer.on("clientError", (err: Error, socket) => {
  console.error("HTTP client error", err);
  socket.end("HTTP/1.1 400 Bad Request\r\n\r\n");
});

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Zillow MCP server listening on http://0.0.0.0:${port}`);
  console.log(`  SSE stream: GET http://0.0.0.0:${port}${ssePath}`);
  console.log(
    `  Message post endpoint: POST http://localhost:${port}${postPath}?sessionId=...`
  );
});

