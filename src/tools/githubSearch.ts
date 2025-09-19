import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerGithubSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "github_search_exa",
    "Search GitHub repositories and code using Exa AI - finds repositories, code snippets, documentation, and developer profiles on GitHub. Useful for finding open source projects, code examples, and technical resources.",
    {
      query: z.string().describe("GitHub search query (repository name, programming language, username, etc.)"),
      searchType: z.enum(["repositories", "code", "users", "all"]).optional().describe("Type of GitHub content to search (default: all)"),
      numResults: z.number().optional().describe("Number of GitHub results to return (default: 5)")
    },
    async ({ query, searchType, numResults }) => {
      const requestId = `github_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'github_search_exa');
      
      logger.start(`${query} (${searchType || 'all'})`);
      
      let searchQuery = query;
      if (searchType === "repositories") {
        searchQuery = `${query} GitHub repository`;
      } else if (searchType === "code") {
        searchQuery = `${query} GitHub code`;
      } else if (searchType === "users") {
        searchQuery = `${query} GitHub user profile`;
      } else {
        searchQuery = `${query} GitHub`;
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
        includeDomains: ["github.com"]
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "GitHub search",
        resultsLabel: "GitHub results",
        emptyResultsMessage: "No GitHub content found. Please try a different query.",
        errorMessage: "GitHub search error: Failed to retrieve results from Exa."
      });
    }
  );
}