import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerLinkedInSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "linkedin_search_exa",
    "Search LinkedIn profiles and companies using Exa AI - finds professional profiles, company pages, and business-related content on LinkedIn. Useful for networking, recruitment, and business research.",
    {
      query: z.string().describe("LinkedIn search query (e.g., person name, company, job title)"),
      searchType: z.enum(["profiles", "companies", "all"]).optional().describe("Type of LinkedIn content to search (default: all)"),
      numResults: z.number().optional().describe("Number of LinkedIn results to return (default: 5)")
    },
    async ({ query, searchType, numResults }) => {
      const requestId = `linkedin_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'linkedin_search_exa');
      
      logger.start(`${query} (${searchType || 'all'})`);
      
      let searchQuery = query;
      if (searchType === "profiles") {
        searchQuery = `${query} LinkedIn profile`;
      } else if (searchType === "companies") {
        searchQuery = `${query} LinkedIn company`;
      } else {
        searchQuery = `${query} LinkedIn`;
      }

      const searchRequest: ExaSearchRequest = {
        query: searchQuery,
        type: "neural",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        },
        includeDomains: ["linkedin.com"]
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "LinkedIn search",
        resultsLabel: "LinkedIn results",
        emptyResultsMessage: "No LinkedIn content found. Please try a different query.",
        errorMessage: "LinkedIn search error: Failed to retrieve results from Exa."
      });
    }
  );
}