export type RequestInit = {
  body?: any;
  headers?: Record<string, string>;
  method?: string;
  signal?: any;
};

export type Response = {
  ok: boolean;
  status: number;
  url: string;
  json(): Promise<any>;
  text(): Promise<string>;
  headers?:
    | {
        get(name: string): string | null;
      }
    | undefined;
};

// Typed only the subset of the spec we actually use (to be able to build a simple mock)
export type FetchImpl = (url: string, init?: RequestInit) => Promise<Response>;

export function formEncoded<T extends Record<string, string>>(data: T): string {
  return Object.entries(data)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

export function getFetchImplementation(userFetch?: FetchImpl) {
  // @ts-ignore - fetch might not be a global
  const globalFetch = typeof fetch !== 'undefined' ? fetch : undefined;
  // @ts-ignore - globalThis might not be a global
  const globalThisFetch = typeof globalThis !== 'undefined' ? globalThis.fetch : undefined;
  const fetchImpl: FetchImpl | undefined = (userFetch as any) ?? (globalFetch as any) ?? (globalThisFetch as any);
  if (!fetchImpl) {
    /** @todo add a link after docs exist */
    throw new Error(`Couldn't find a global \`fetch\`. Pass a fetch implementation explicitly.`);
  }
  return fetchImpl;
}
