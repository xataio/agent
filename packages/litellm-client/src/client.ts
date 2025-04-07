import { FetchImpl, getFetchImplementation } from './utils/fetch';

import { operationsByTag } from './generated/components';
import { FetcherExtraProps } from './generated/fetcher';
import { RequiredKeys } from './utils/types';

export type LiteLLMClientConfig = {
  baseUrl: string;
  apiKey: string;
  clientName?: string;
  fetch?: FetchImpl;
};

const LITELLM_DEFAULT_BASE_URL = 'http://localhost:4000';

const buildApiClient = () =>
  class {
    constructor(options: LiteLLMClientConfig) {
      const baseUrl = options.baseUrl ?? LITELLM_DEFAULT_BASE_URL;
      const apiKey = options.apiKey ?? getAPIKey();
      if (!baseUrl) {
        throw new Error('baseUrl is required');
      }
      if (!apiKey) {
        throw new Error('Could not resolve a valid apiKey');
      }

      const extraProps: ApiExtraProps = {
        baseUrl: baseUrl,
        fetcher: getFetchImplementation(options.fetch),
        apiKey
      };

      return new Proxy(this, {
        get: (_target, namespace: keyof typeof operationsByTag) => {
          if (operationsByTag[namespace] === undefined) {
            return undefined;
          }

          return new Proxy(
            {},
            {
              get: (_target, operation: keyof (typeof operationsByTag)[keyof typeof operationsByTag]) => {
                if (operationsByTag[namespace][operation] === undefined) {
                  return undefined;
                }

                const method = operationsByTag[namespace][operation] as any;

                return async (params: Record<string, unknown>) => {
                  return await method({ ...params, ...extraProps });
                };
              }
            }
          );
        }
      });
    }
  } as unknown as { new (options?: LiteLLMClientConfig): ApiProxy };

export class LiteLLMClient extends buildApiClient() {}

type ApiProxy = {
  [Tag in keyof typeof operationsByTag]: {
    [Method in keyof (typeof operationsByTag)[Tag]]: (typeof operationsByTag)[Tag][Method] extends infer Operation extends
      (...args: any) => any
      ? Omit<Parameters<Operation>[0], keyof ApiExtraProps> extends infer Params
        ? RequiredKeys<Params> extends never
          ? (params?: Params & UserProps) => ReturnType<Operation>
          : (params: Params & UserProps) => ReturnType<Operation>
        : never
      : never;
  };
};

type UserProps = {
  headers?: Record<string, unknown>;
};

type ApiExtraProps = FetcherExtraProps;

function getAPIKey() {
  return process.env.LITELM_API_KEY || 'sk-1234';
}
