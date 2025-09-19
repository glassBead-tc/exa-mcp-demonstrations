import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerCompetitorFinderTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "competitor_finder_exa",
    "Find competitors for a business using Exa AI - identifies similar companies, competitive landscape analysis, and market positioning. Helps discover direct and indirect competitors in any industry.",
    {
      companyName: z.string().describe("Name of the company to find competitors for"),
      industry: z.string().optional().describe("Industry sector (optional, helps narrow search)"),
      numResults: z.number().optional().describe("Number of competitors to find (default: 5)")
    },
    async ({ companyName, industry, numResults }) => {
      const requestId = `competitor_finder_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'competitor_finder_exa');
      
      logger.start(`${companyName} ${industry ? `in ${industry}` : ''}`);
      
      const searchQuery = industry
        ? `${companyName} competitors similar companies ${industry} industry competitive landscape`
        : `${companyName} competitors similar companies competitive landscape market`;

      const searchRequest: ExaSearchRequest = {
        query: searchQuery,
        type: "neural",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        }
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "competitor analysis",
        resultsLabel: "competitor analysis results",
        emptyResultsMessage: "No competitor information found. Please try a different company name or industry.",
        errorMessage: "Competitor finder error: Failed to retrieve results from Exa."
      });
    }
  );
}