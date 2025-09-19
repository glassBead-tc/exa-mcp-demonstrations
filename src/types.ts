// Exa API Types
export interface ExaSearchRequest {
  query: string;
  type: string;
  category?: string;
  includeDomains?: string[];
  excludeDomains?: string[];
  startPublishedDate?: string;
  endPublishedDate?: string;
  numResults: number;
  contents: {
    text: {
      maxCharacters?: number;
    } | boolean;
    livecrawl?: 'always' | 'fallback' | 'preferred';
    subpages?: number;
    subpageTarget?: string[];
  };
}

export interface ExaCrawlRequest {
  ids: string[];
  contents: {
    text: {
      maxCharacters?: number;
    } | boolean;
    livecrawl?: 'always' | 'fallback' | 'preferred';
  };
}

export interface ExaCrawlResponse {
  results: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface ExaSearchResult {
  id: string;
  title: string;
  url: string;
  publishedDate: string;
  author: string;
  text: string;
  image?: string;
  favicon?: string;
  score?: number;
}

export interface ExaSearchResponse {
  requestId: string;
  autopromptString: string;
  resolvedSearchType: string;
  results: ExaSearchResult[];
}

// Tool Types
export interface SearchArgs {
  query: string;
  numResults?: number;
  livecrawl?: 'always' | 'fallback' | 'preferred';
}

export interface ToolContent {
  type: 'text';
  text: string;
}

export interface ToolResponse {
  content: ToolContent[];
  isError?: boolean;
}