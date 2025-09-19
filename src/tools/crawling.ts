import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_CONFIG } from "./config.js";
import { ExaCrawlRequest } from "../types.js";
import { createRequestLogger } from "../utils/logger.js";
import { runCrawlTool } from "../utils/exaEffect.js";

export function registerCrawlingTool(server: McpServer, config?: { exaApiKey?: string }): void {
  server.tool(
    "crawling_exa",
    "Extract and crawl content from specific URLs using Exa AI - retrieves full text content, metadata, and structured information from web pages. Ideal for extracting detailed content from known URLs.",
    {
      url: z.string().describe("URL to crawl and extract content from"),
      maxCharacters: z.number().optional().describe("Maximum characters to extract (default: 3000)")
    },
    async ({ url, maxCharacters }) => {
      const requestId = `crawling_exa-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logger = createRequestLogger(requestId, 'crawling_exa');
      
      logger.start(url);
      
      const crawlRequest: ExaCrawlRequest = {
        ids: [url],
        contents: {
          text: {
            maxCharacters: maxCharacters || API_CONFIG.DEFAULT_MAX_CHARACTERS
          },
          livecrawl: 'preferred'
        }
      };

      return runCrawlTool({
        logger,
        request: crawlRequest,
        apiKey: config?.exaApiKey,
        requestLabel: "crawl request",
        emptyResultsMessage: "No content found for the provided URL.",
        errorMessage: "Crawling error: Failed to retrieve results from Exa.",
        successLog: () => "Successfully crawled content from URL"
      });
    }
  );
}