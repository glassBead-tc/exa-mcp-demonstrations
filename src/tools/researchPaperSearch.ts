import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaSearchRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runSearchTool } from "../utils/exaEffect.js";

export function registerResearchPaperSearchTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "research_paper_search_exa",
    "Search for academic papers and research using Exa AI - specializes in finding scholarly articles, research papers, and academic content. Returns detailed information about research findings and academic sources.",
    {
      query: z.string().describe("Research paper search query"),
      numResults: z.number().optional().describe("Number of research papers to return (default: 5)")
    },
    async ({ query, numResults }) => {
      const requestId = `research_paper_search_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'research_paper_search_exa');
      
      logger.start(query);
      
      const searchRequest: ExaSearchRequest = {
        query: `${query} academic paper research study`,
        type: "neural",
        numResults: numResults || API_CONFIG.DEFAULT_NUM_RESULTS,
        contents: {
          text: {
            maxCharacters: API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        },
        includeDomains: ["arxiv.org", "scholar.google.com", "researchgate.net", "pubmed.ncbi.nlm.nih.gov", "ieee.org", "acm.org"]
      };

      return runSearchTool({
        logger,
        request: searchRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "research papers",
        resultsLabel: "research papers",
        emptyResultsMessage: "No research papers found. Please try a different query.",
        errorMessage: "Research paper search error: Failed to retrieve results from Exa."
      });
    }
  );
}