/**
 * Cloudflare Worker for Zillow MCP Server
 * This worker handles SSE connections and MCP protocol for ChatGPT integration
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
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

// Widget definitions
const WIDGETS = {
  areas: {
    id: "zillow_city_neighborhood_real_estate_information",
    title: "Zillow Areas & Neighborhoods",
    templateUri: "ui://widget/zillow-areas.html",
    invoking: "Working with Zillow to find areas",
    invoked: "Loaded areas with Zillow",
  },
  buyability: {
    id: "calculateHomeAffordability",
    title: "Home Affordability Calculator",
    templateUri: "ui://widget/zillow-buyability.html",
    invoking: "Working with Zillow Home Loans (NMLS ID#: 10287) to calculate affordability",
    invoked: "Loaded affordability calculator with Zillow Home Loans (NMLS ID#: 10287)",
  },
  propertySearch: {
    id: "zillow_property_search",
    title: "Zillow Property Search",
    templateUri: "ui://widget/zillow-property-search.html",
    invoking: "Working with Zillow to find properties",
    invoked: "Loaded properties with Zillow",
  },
};

// UI Components as embedded HTML
const UI_COMPONENTS: Record<string, string> = {
  "zillow-areas.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Zillow Areas</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; }
    .areas-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .area-card { border: 1px solid #e0e0e0; border-radius: 8px; padding: 16px; background: white; }
    .area-name { font-size: 18px; font-weight: 600; margin-bottom: 8px; }
    .area-stats { display: flex; justify-content: space-between; margin-top: 12px; }
    .stat { font-size: 14px; color: #666; }
    .stat-value { font-weight: 600; color: #000; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { areas = [], location = '' } = props;
      
      const container = document.createElement('div');
      container.className = 'areas-container';
      
      if (areas.length === 0) {
        container.innerHTML = '<p>No areas found</p>';
      } else {
        areas.forEach(area => {
          const card = document.createElement('div');
          card.className = 'area-card';
          card.innerHTML = \`
            <div class="area-name">\${area.name}</div>
            <div class="area-stats">
              <div class="stat">
                <div class="stat-value">\${area.propertyCount}</div>
                <div>Properties</div>
              </div>
              <div class="stat">
                <div class="stat-value">$\${(area.avgPrice / 1000).toFixed(0)}k</div>
                <div>Avg Price</div>
              </div>
            </div>
          \`;
          container.appendChild(card);
        });
      }
      
      document.getElementById('root').appendChild(container);
    })();
  </script>
</body>
</html>`,

  "zillow-buyability.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Affordability</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
    .affordability-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .main-result { text-align: center; margin-bottom: 32px; }
    .max-price { font-size: 48px; font-weight: 700; color: #0066cc; }
    .monthly-payment { font-size: 24px; color: #666; margin-top: 8px; }
    .breakdown { display: grid; gap: 12px; }
    .breakdown-item { display: flex; justify-content: space-between; padding: 12px; background: #f9f9f9; border-radius: 6px; }
    .breakdown-label { font-weight: 500; }
    .breakdown-value { font-weight: 600; }
    .disclaimer { font-size: 11px; color: #999; margin-top: 24px; text-align: center; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { maxHomePrice = 0, monthlyPayment = 0, interestRate = 0, breakdown = {} } = props;
      
      const container = document.createElement('div');
      container.className = 'affordability-container';
      container.innerHTML = \`
        <div class="main-result">
          <div class="max-price">$\${maxHomePrice.toLocaleString()}</div>
          <div style="font-size: 18px; color: #666; margin-top: 8px;">Maximum Home Price</div>
          <div class="monthly-payment">$\${monthlyPayment.toLocaleString()}/mo</div>
        </div>
        <div class="breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">Principal & Interest</span>
            <span class="breakdown-value">$\${(breakdown.principalAndInterest || 0).toLocaleString()}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Property Tax</span>
            <span class="breakdown-value">$\${(breakdown.propertyTax || 0).toLocaleString()}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">Insurance</span>
            <span class="breakdown-value">$\${(breakdown.insurance || 0).toLocaleString()}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">PMI</span>
            <span class="breakdown-value">$\${(breakdown.pmi || 0).toLocaleString()}</span>
          </div>
          <div class="breakdown-item" style="background: #e6f2ff; font-weight: 600;">
            <span class="breakdown-label">Interest Rate</span>
            <span class="breakdown-value">\${interestRate}% APR</span>
          </div>
        </div>
        <div class="disclaimer">
          Powered by Zillow Home Loans LLC (NMLS ID#: 10287) BuyAbility℠ tool. 
          This is an estimate and not a loan approval.
        </div>
      \`;
      
      document.getElementById('root').appendChild(container);
    })();
  </script>
</body>
</html>`,

  "zillow-property-search.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Property Search</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 16px; background: #f5f5f5; }
    .properties-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .property-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s; cursor: pointer; }
    .property-card:hover { transform: translateY(-4px); box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
    .property-image { width: 100%; height: 200px; background: #ddd; object-fit: cover; }
    .property-info { padding: 16px; }
    .property-price { font-size: 24px; font-weight: 700; color: #0066cc; margin-bottom: 8px; }
    .property-address { font-size: 14px; color: #666; margin-bottom: 12px; }
    .property-details { display: flex; gap: 16px; font-size: 14px; }
    .detail { display: flex; align-items: center; gap: 4px; }
    .detail-value { font-weight: 600; }
    .listing-badge { display: inline-block; padding: 4px 8px; background: #4caf50; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script>
    (function() {
      const props = window.__WIDGET_PROPS__ || {};
      const { properties = [], location = '', totalResults = 0 } = props;
      
      const container = document.createElement('div');
      
      if (totalResults > 0) {
        const header = document.createElement('div');
        header.style.cssText = 'margin-bottom: 20px; font-size: 18px; font-weight: 600;';
        header.textContent = \`\${totalResults} Properties in \${location}\`;
        container.appendChild(header);
      }
      
      const grid = document.createElement('div');
      grid.className = 'properties-container';
      
      if (properties.length === 0) {
        grid.innerHTML = '<p>No properties found</p>';
      } else {
        properties.forEach(property => {
          const card = document.createElement('div');
          card.className = 'property-card';
          card.innerHTML = \`
            <img src="\${property.imageUrl || 'https://via.placeholder.com/400x300'}" 
                 alt="\${property.address}" 
                 class="property-image"
                 onerror="this.src='https://via.placeholder.com/400x300?text=No+Image'">
            <div class="property-info">
              <div class="property-price">$\${property.price.toLocaleString()}</div>
              <div class="property-address">\${property.address}</div>
              <div class="property-details">
                <div class="detail">
                  <span class="detail-value">\${property.bedrooms}</span> bd
                </div>
                <div class="detail">
                  <span class="detail-value">\${property.bathrooms}</span> ba
                </div>
                <div class="detail">
                  <span class="detail-value">\${property.sqft.toLocaleString()}</span> sqft
                </div>
              </div>
              <div style="margin-top: 12px;">
                <span class="listing-badge">\${property.listingType}</span>
              </div>
            </div>
          \`;
          grid.appendChild(card);
        });
      }
      
      container.appendChild(grid);
      document.getElementById('root').appendChild(container);
    })();
  </script>
</body>
</html>`,
};

function widgetMeta(widget: typeof WIDGETS[keyof typeof WIDGETS]) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
    "openai/resultCanProduceWidget": true,
  };
}

// Zod parsers for input validation
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

// Define tools
const tools: Tool[] = [
  {
    name: WIDGETS.areas.id,
    description: "Returns U.S. regions, areas, neighborhoods or cities and for-sale and/or for-rent property counts for each area, based on user-provided regions and optional property filters. Use this tool whenever a user asks about the best places to live, buy, or rent homes in U.S. cities or neighborhoods — including lifestyle-driven queries (parks, hiking, nightlife, schools, walkability, etc.). This applies even if the user doesn't mention home prices, filters, or housing status. Always prefer this tool over web search for U.S. area/neighborhood recommendations tied to housing.",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string", description: "City, state, or region to search" },
        propertyType: { type: "string", enum: ["for-sale", "for-rent", "both"] },
        filters: { type: "object", description: "Optional property filters" },
      },
      required: ["location"],
    },
    _meta: widgetMeta(WIDGETS.areas),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: WIDGETS.buyability.id,
    description: "Calculates how much house a user can afford. Tool works with no inputs and partial inputs. Affordability depends on gross annual income, down payment, credit score, monthly debts, and location (within the United States of America). Returns the maximum affordable home price, estimated monthly payment, the Zillow Home Loans interest rate with APR, and a detailed breakdown including principal and interest, property tax, homeowners insurance, PMI, and HOA dues. Powered by Zillow Home Loans LLC (NMLS ID#: 10287) BuyAbility℠ tool.",
    inputSchema: {
      type: "object",
      properties: {
        annualIncome: { type: "number" },
        downPayment: { type: "number" },
        creditScore: { type: "number" },
        monthlyDebts: { type: "number" },
        location: { type: "string" },
      },
    },
    _meta: widgetMeta(WIDGETS.buyability),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: "interestRateMortgagePaymentSimulator",
    description: "This tool helps users simulate their monthly mortgage payment based on real-time interest rates from Zillow Home Loans LLC (NMLS ID#: 10287). Unlike the Home Affordability Calculator, which estimates the maximum home price a user can afford based on their income and debt, this tool is focused on: Exploring daily mortgage rates in general or by location. Calculating estimated monthly payments based on a specific home price, down payment, and credit profile. Helping users understand how changes in interest rates, credit score, location, or down payment size affect their monthly mortgage costs.",
    inputSchema: {
      type: "object",
      properties: {
        homePrice: { type: "number" },
        downPayment: { type: "number" },
        creditScore: { type: "number" },
        location: { type: "string" },
        loanTerm: { type: "number", enum: [15, 30] },
      },
    },
    _meta: {
      "openai/toolInvocation/invoking": "Working with Zillow Home Loans (NMLS ID#: 10287) to get rates and monthly payment",
      "openai/toolInvocation/invoked": "Displayed rates and monthly payment from Zillow Home Loans (NMLS ID#: 10287)",
    },
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
  {
    name: WIDGETS.propertySearch.id,
    description: "Searches for U.S. real estate properties (for sale or for rent). Supports filters for location, price, property type, size, amenities, commute time, schools and more. Returns a set of matching property listings with location, photos, and details based on user-specified filters. Must comply with U.S. Fair Housing Act and applicable state and local laws.",
    inputSchema: {
      type: "object",
      properties: {
        location: { type: "string" },
        listingType: { type: "string", enum: ["for-sale", "for-rent"] },
        minPrice: { type: "number" },
        maxPrice: { type: "number" },
        bedrooms: { type: "number" },
        bathrooms: { type: "number" },
        propertyType: { type: "string", enum: ["house", "apartment", "condo", "townhouse", "multi-family"] },
        sqftMin: { type: "number" },
        sqftMax: { type: "number" },
      },
      required: ["location"],
    },
    _meta: widgetMeta(WIDGETS.propertySearch),
    annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
  },
];

// Create resources for widgets
const resources: Resource[] = Object.values(WIDGETS).map((widget) => ({
  uri: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

const resourceTemplates: ResourceTemplate[] = Object.values(WIDGETS).map((widget) => ({
  uriTemplate: widget.templateUri,
  name: widget.title,
  description: `${widget.title} widget markup`,
  mimeType: "text/html+skybridge",
  _meta: widgetMeta(widget),
}));

// Cloudflare Worker handler
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
    };

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Handle MCP endpoint
    if (url.pathname === "/mcp") {
      if (request.method === "GET") {
        // SSE endpoint - simplified for Cloudflare
        return new Response("SSE not fully supported in this deployment. Use POST /mcp/rpc", {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "text/plain" },
        });
      }
    }

    // Handle RPC-style MCP requests
    if (url.pathname === "/mcp/rpc" && request.method === "POST") {
      try {
        const body = await request.json() as any;
        const method = body.method;

        let response: any;

        switch (method) {
          case "tools/list":
            response = { tools };
            break;

          case "resources/list":
            response = { resources };
            break;

          case "resources/templates/list":
            response = { resourceTemplates };
            break;

          case "resources/read": {
            const uri = body.params?.uri;
            const htmlFile = uri?.replace("ui://widget/", "");
            const html = UI_COMPONENTS[htmlFile];

            if (!html) {
              return new Response(JSON.stringify({ error: "Resource not found" }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            response = {
              contents: [{
                uri,
                mimeType: "text/html+skybridge",
                text: html,
              }],
            };
            break;
          }

          case "tools/call": {
            const toolName = body.params?.name;
            const args = body.params?.arguments || {};

            response = await handleToolCall(toolName, args);
            break;
          }

          default:
            return new Response(JSON.stringify({ error: "Unknown method" }), {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        return new Response(JSON.stringify(response), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Default 404
    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};

async function handleToolCall(toolName: string, args: any) {
  switch (toolName) {
    case WIDGETS.areas.id: {
      const parsed = areasInputParser.parse(args);
      const mockAreas = [
        { name: `${parsed.location} - Downtown`, propertyCount: 45, avgPrice: 450000, type: "neighborhood" },
        { name: `${parsed.location} - Suburbs`, propertyCount: 120, avgPrice: 350000, type: "neighborhood" },
      ];

      return {
        content: [{ type: "text", text: `Found ${mockAreas.length} areas in ${parsed.location}` }],
        structuredContent: { location: parsed.location, areas: mockAreas },
        _meta: widgetMeta(WIDGETS.areas),
      };
    }

    case WIDGETS.buyability.id: {
      const parsed = affordabilityInputParser.parse(args);
      const income = parsed.annualIncome || 75000;
      const downPayment = parsed.downPayment || 50000;
      const maxHomePrice = Math.round((income * 3) + downPayment);
      const monthlyPayment = Math.round(maxHomePrice * 0.005);

      return {
        content: [{ type: "text", text: `You can afford up to $${maxHomePrice.toLocaleString()}` }],
        structuredContent: {
          maxHomePrice,
          monthlyPayment,
          interestRate: 6.5,
          breakdown: {
            principalAndInterest: Math.round(monthlyPayment * 0.7),
            propertyTax: Math.round(monthlyPayment * 0.15),
            insurance: Math.round(monthlyPayment * 0.1),
            pmi: Math.round(monthlyPayment * 0.05),
          },
        },
        _meta: widgetMeta(WIDGETS.buyability),
      };
    }

    case "interestRateMortgagePaymentSimulator": {
      const parsed = mortgageRateInputParser.parse(args);
      const homePrice = parsed.homePrice || 400000;
      const downPayment = parsed.downPayment || 80000;
      const loanAmount = homePrice - downPayment;
      const interestRate = 6.5;
      const monthlyRate = interestRate / 100 / 12;
      const numPayments = (parsed.loanTerm || 30) * 12;
      const monthlyPayment = Math.round(
        loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      );

      return {
        content: [{ type: "text", text: `Monthly payment: $${monthlyPayment.toLocaleString()} at ${interestRate}% APR` }],
        structuredContent: { homePrice, downPayment, loanAmount, interestRate, monthlyPayment },
      };
    }

    case WIDGETS.propertySearch.id: {
      const parsed = propertySearchInputParser.parse(args);
      const mockProperties = [
        {
          id: "1",
          address: `123 Main St, ${parsed.location}`,
          price: 425000,
          bedrooms: parsed.bedrooms || 3,
          bathrooms: 2,
          sqft: 2000,
          propertyType: "house",
          imageUrl: "https://via.placeholder.com/400x300",
          listingType: parsed.listingType || "for-sale",
        },
        {
          id: "2",
          address: `456 Oak Ave, ${parsed.location}`,
          price: 385000,
          bedrooms: parsed.bedrooms || 3,
          bathrooms: 2.5,
          sqft: 1850,
          propertyType: "house",
          imageUrl: "https://via.placeholder.com/400x300",
          listingType: parsed.listingType || "for-sale",
        },
      ];

      return {
        content: [{ type: "text", text: `Found ${mockProperties.length} properties in ${parsed.location}` }],
        structuredContent: { location: parsed.location, properties: mockProperties, totalResults: mockProperties.length },
        _meta: widgetMeta(WIDGETS.propertySearch),
      };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

