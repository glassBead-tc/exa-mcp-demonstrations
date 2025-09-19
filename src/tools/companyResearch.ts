import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerCompanyResearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "company_research_exa",
    "Research companies using Exa AI - finds comprehensive information about businesses, organizations, and corporations. Provides insights into company operations, news, financial information, and industry analysis.",
    {
      companyName: z.string().describe("Name of the company to research"),
      numResults: z.number().optional().describe("Number of search results to return (default: 5)")
    },
    async ({ companyName, numResults }) => {
      const requestId = `company_research_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'company_research_exa');
      
      logger.start(companyName);
      
      const searchRequest: ExaSearchRequest = {
        query: `${companyName} company business corporation information news financial`,
        type: "neural",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        },
        includeDomains: ["bloomberg.com", "reuters.com", "crunchbase.com", "sec.gov", "linkedin.com", "forbes.com", "businesswire.com", "prnewswire.com"]
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "company research",
        resultsLabel: "company research results",
        emptyResultsMessage: "No company information found. Please try a different company name.",
        errorMessage: "Company research error: Failed to retrieve results from Exa."
      });
    }
  );
}