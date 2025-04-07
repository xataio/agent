import { FetchImpl, getFetchImplementation } from '../utils/fetch';
import { compactObject } from '../utils/lang';

export type FetcherExtraProps = {
  baseUrl?: string;
  apiKey?: string;
  fetcher?: FetchImpl;
};

export type ErrorWrapper<TError> = TError | { status: 'unknown'; payload: string };

export type FetcherOptions<TBody, THeaders, TQueryParams, TPathParams> = {
  url: string;
  method: string;
  body?: TBody;
  headers?: THeaders;
  queryParams?: TQueryParams;
  pathParams?: TPathParams;
  signal?: AbortSignal;
} & FetcherExtraProps;

export async function fetch<
  TData,
  TError,
  TBody extends Record<string, unknown> | FormData | undefined | null,
  THeaders extends Record<string, unknown>,
  TQueryParams extends Record<string, unknown>,
  TPathParams extends Record<string, unknown>
>({
  url,
  method,
  body,
  headers,
  pathParams,
  queryParams,
  signal,
  apiKey,
  baseUrl,
  fetcher
}: FetcherOptions<TBody, THeaders, TQueryParams, TPathParams>): Promise<TData> {
  const fetchImpl = getFetchImplementation(fetcher);

  try {
    const requestHeaders: HeadersInit = compactObject({
      'Content-Type': 'application/json',
      Authorization: apiKey ? `Bearer ${apiKey}` : undefined,
      ...headers
    });

    /**
     * As the fetch API is being used, when multipart/form-data is specified
     * the Content-Type header must be deleted so that the browser can set
     * the correct boundary.
     * https://developer.mozilla.org/en-US/docs/Web/API/FormData/Using_FormData_Objects#sending_files_using_a_formdata_object
     */
    if (requestHeaders['Content-Type']?.toLowerCase().includes('multipart/form-data')) {
      delete requestHeaders['Content-Type'];
    }

    const payload =
      body instanceof FormData
        ? body
        : requestHeaders['Content-Type'] === 'application/json'
          ? JSON.stringify(body)
          : (body as unknown as string);

    const fullUrl = `${baseUrl ?? ''}${resolveUrl(url, queryParams, pathParams)}`;

    const response = await fetchImpl(fullUrl, {
      signal,
      method: method.toUpperCase(),
      body: payload,
      headers: requestHeaders
    });

    if (!response.ok) {
      let error: ErrorWrapper<TError>;
      try {
        error = await response.json();
      } catch (e) {
        error = {
          status: 'unknown' as const,
          payload: e instanceof Error ? `Unexpected error (${e.message})` : 'Unexpected error'
        };
      }
      throw error;
    }

    if (response.headers?.get('content-type')?.includes('json')) {
      return await response.json();
    } else {
      return (await response.text()) as unknown as TData;
    }
  } catch (e) {
    const errorObject: Error = {
      name: 'unknown' as const,
      message: e instanceof Error ? `Network error (${e.message})` : 'Network error'
    };
    throw errorObject;
  }
}

const resolveUrl = (url: string, queryParams: Record<string, any> = {}, pathParams: Record<string, any> = {}) => {
  let query = new URLSearchParams(queryParams).toString();
  if (query) query = `?${query}`;
  return url.replace(/\{\w*\}/g, (key) => pathParams[key.slice(1, -1)] ?? '') + query;
};
