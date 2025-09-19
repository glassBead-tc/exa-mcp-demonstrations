import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerWikipediaSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "wikipedia_search_exa",
    "Search Wikipedia articles using Exa AI - finds comprehensive, factual information from Wikipedia entries. Ideal for research, fact-checking, and getting authoritative information on various topics.",
    {
      query: z.string().describe("Wikipedia search query (topic, person, place, concept, etc.)"),
      numResults: z.number().optional().describe("Number of Wikipedia articles to return (default: 5)")
    },
    async ({ query, numResults }) => {
      const requestId = `wikipedia_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'wikipedia_search_exa');
      
      logger.start(query);
      
      const searchRequest: ExaSearchRequest = {
        query: `${query} Wikipedia`,
        type: "neural",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        },
        includeDomains: ["wikipedia.org"]
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "Wikipedia search",
        resultsLabel: "Wikipedia articles",
        emptyResultsMessage: "No Wikipedia articles found. Please try a different query.",
        errorMessage: "Wikipedia search error: Failed to retrieve results from Exa."
      });
    }
  );
}