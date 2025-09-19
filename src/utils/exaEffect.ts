import axios, { AxiosInstance } from "axios";
import { Effect, Data } from "effect";
import { API_CONFIG } from "../tools/config.js";
import {
  ExaCrawlRequest,
  ExaCrawlResponse,
  ExaSearchRequest,
  ExaSearchResponse,
  ToolResponse
} from "../types.js";
import { ToolLogger } from "./logger.js";

const DEFAULT_TIMEOUT = 25_000;

export class MissingExaApiKeyError extends Data.TaggedError("MissingExaApiKeyError")<{
  readonly message: string;
}> {}

export class ExaRequestError extends Data.TaggedError("ExaRequestError")<{
  readonly status: number | "unknown";
  readonly message: string;
}> {}

export class InvalidExaResponseError extends Data.TaggedError("InvalidExaResponseError")<{
  readonly message: string;
}> {}

export type ExaApiError = MissingExaApiKeyError | ExaRequestError | InvalidExaResponseError;

interface ExaRequestOptions {
  readonly apiKey?: string;
  readonly timeoutMs?: number;
}

export const performExaSearch = (
  request: ExaSearchRequest,
  options: ExaRequestOptions
): Effect.Effect<ExaSearchResponse, ExaApiError> =>
  makeExaPost<ExaSearchRequest, ExaSearchResponse>(API_CONFIG.ENDPOINTS.SEARCH, request, options);

export const performExaCrawl = (
  request: ExaCrawlRequest,
  options: ExaRequestOptions
): Effect.Effect<ExaCrawlResponse, ExaApiError> =>
  makeExaPost<ExaCrawlRequest, ExaCrawlResponse>(API_CONFIG.ENDPOINTS.CONTENTS, request, options);

const makeExaPost = <TRequest, TResponse>(
  endpoint: string,
  payload: TRequest,
  options: ExaRequestOptions
): Effect.Effect<TResponse, ExaApiError> =>
  Effect.gen(function*() {
    const apiKey = options.apiKey ?? process.env.EXA_API_KEY;

    if (!apiKey) {
      yield* Effect.fail(
        new MissingExaApiKeyError({
          message: "Exa API key is required. Provide it via config.exaApiKey or the EXA_API_KEY environment variable."
        })
      );
    }

    const axiosInstance = yield* Effect.sync((): AxiosInstance =>
      axios.create({
        baseURL: API_CONFIG.BASE_URL,
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "x-api-key": apiKey
        },
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT
      })
    );

    const response = yield* Effect.tryPromise({
      try: () =>
        axiosInstance.post<TResponse>(endpoint, payload, {
          timeout: options.timeoutMs ?? DEFAULT_TIMEOUT
        }),
      catch: (error) => {
        if (axios.isAxiosError(error)) {
          const status = error.response?.status ?? "unknown";
          const message =
            typeof error.response?.data?.message === "string"
              ? error.response.data.message
              : error.message;

          return new ExaRequestError({ status, message });
        }

        return new ExaRequestError({
          status: "unknown",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    });

    if (response.data == null) {
      yield* Effect.fail(
        new InvalidExaResponseError({
          message: "Received empty response from Exa API"
        })
      );
    }

    return response.data;
  });

export const toToolErrorResponse = (
  error: ExaApiError,
  fallbackMessage: string
): ToolResponse => {
  switch (error._tag) {
    case "MissingExaApiKeyError":
      return {
        content: [
          {
            type: "text",
            text: error.message
          }
        ],
        isError: true
      };
    case "ExaRequestError": {
      const statusLabel = error.status === "unknown" ? "unknown status" : `status ${error.status}`;
      return {
        content: [
          {
            type: "text",
            text: `Request to Exa failed (${statusLabel}): ${error.message}`
          }
        ],
        isError: true
      };
    }
    case "InvalidExaResponseError":
      return {
        content: [
          {
            type: "text",
            text: fallbackMessage
          }
        ],
        isError: true
      };
    default:
      return {
        content: [
          {
            type: "text",
            text: `Unexpected error: ${"message" in error ? error.message : fallbackMessage}`
          }
        ],
        isError: true
      };
  }
};

export const formatResults = (data: unknown): ToolResponse => ({
  content: [
    {
      type: "text",
      text: JSON.stringify(data, null, 2)
    }
  ]
});

interface SearchToolOptions {
  readonly logger: ToolLogger;
  readonly request: ExaSearchRequest;
  readonly apiKey?: string;
  readonly requestLabel?: string;
  readonly resultsLabel: string;
  readonly emptyResultsMessage: string;
  readonly errorMessage: string;
}

export const runSearchTool = ({
  logger,
  request,
  apiKey,
  requestLabel,
  resultsLabel,
  emptyResultsMessage,
  errorMessage
}: SearchToolOptions): Promise<ToolResponse> => {
  const labelSuffix = requestLabel ? ` for ${requestLabel}` : "";

  const effect = Effect.gen(function*() {
    yield* Effect.sync(() => logger.log(`Sending request to Exa API${labelSuffix}`));
    const response = yield* performExaSearch(request, { apiKey });
    yield* Effect.sync(() => logger.log(`Received response from Exa API${labelSuffix}`));

    if (!response.results || response.results.length === 0) {
      yield* Effect.sync(() => logger.log("Warning: Empty or invalid response from Exa API"));
      return {
        content: [
          {
            type: "text" as const,
            text: emptyResultsMessage
          }
        ]
      } satisfies ToolResponse;
    }

    yield* Effect.sync(() => logger.log(`Found ${response.results.length} ${resultsLabel}`));
    yield* Effect.sync(() => logger.complete());
    return formatResults(response);
  }).pipe(Effect.tapError((error) => Effect.sync(() => logger.error(error))));

  return Effect.runPromise(
    Effect.match(effect, {
      onFailure: (error) => toToolErrorResponse(error, errorMessage),
      onSuccess: (result) => result
    })
  );
};

interface CrawlToolOptions {
  readonly logger: ToolLogger;
  readonly request: ExaCrawlRequest;
  readonly apiKey?: string;
  readonly requestLabel?: string;
  readonly emptyResultsMessage: string;
  readonly errorMessage: string;
  readonly successLog?: (response: ExaCrawlResponse) => string;
}

export const runCrawlTool = ({
  logger,
  request,
  apiKey,
  requestLabel,
  emptyResultsMessage,
  errorMessage,
  successLog
}: CrawlToolOptions): Promise<ToolResponse> => {
  const labelSuffix = requestLabel ? ` for ${requestLabel}` : "";

  const effect = Effect.gen(function*() {
    yield* Effect.sync(() => logger.log(`Sending request to Exa API${labelSuffix}`));
    const response = yield* performExaCrawl(request, { apiKey });
    yield* Effect.sync(() => logger.log(`Received response from Exa API${labelSuffix}`));

    if (!response.results || response.results.length === 0) {
      yield* Effect.sync(() => logger.log("Warning: Empty or invalid response from Exa API"));
      return {
        content: [
          {
            type: "text" as const,
            text: emptyResultsMessage
          }
        ]
      } satisfies ToolResponse;
    }

    const successMessage = successLog ? successLog(response) : `Found ${response.results.length} results`;
    yield* Effect.sync(() => logger.log(successMessage));
    yield* Effect.sync(() => logger.complete());
    return formatResults(response);
  }).pipe(Effect.tapError((error) => Effect.sync(() => logger.error(error))));

  return Effect.runPromise(
    Effect.match(effect, {
      onFailure: (error) => toToolErrorResponse(error, errorMessage),
      onSuccess: (result) => result
    })
  );
};
