import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerWebSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "web_search_exa",
    "Search the web using Exa AI - performs real-time web searches and can scrape content from specific URLs. Supports configurable result counts and returns the content from the most relevant websites.",
    {
      query: z.string().describe("Search query"),
      numResults: z.number().optional().describe("Number of search results to return (default: 5)")
    },
    async ({ query, numResults }) => {
      const requestId = `web_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'web_search_exa');
      logger.start(query);

      const searchRequest: ExaSearchRequest = {
        query,
        type: "auto",
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
        resultsLabel: "results",
        emptyResultsMessage: "No search results found. Please try a different query.",
        errorMessage: "Search error: Failed to retrieve results from Exa."
      });
    }
  );
}