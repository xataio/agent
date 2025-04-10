import { defineConfig } from '@openapi-codegen/cli';
import { generateFetchers, generateSchemaTypes } from '@openapi-codegen/typescript';
import { OpenAPIObject } from 'openapi3-ts';

export default defineConfig({
  client: {
    from: {
      source: 'url',
      url: 'http://localhost:4000/openapi.json'
    },
    outputDir: 'src/generated',
    to: async (context) => {
      context.openAPIDocument = ignorePassThroughPaths(context.openAPIDocument);
      pathReturnFixCatchAll(context.openAPIDocument);

      fixAPIReturns(context.openAPIDocument, [
        {
          paths: ['/model/info/', '/v1/model/info'],
          methods: ['get'],
          responses: {
            '200': obj({ data: arrayOf(schemaRef('Deployment')) })
          }
        }
      ]);

      const filenamePrefix = '';
      const { schemasFiles } = await generateSchemaTypes(context, { filenamePrefix });
      await generateFetchers(context, { filenamePrefix, schemasFiles });
      console.log('done');
    }
  }
});

// remove all pass-through paths. We don't need them in the client and they are causing problems with the codegen
// because all ops have the same operationId
// pass-through paths can be identified by the path ending in {endpoint}
function ignorePassThroughPaths(openAPIObject: OpenAPIObject): OpenAPIObject {
  const paths = openAPIObject.paths;
  const filteredPaths = Object.keys(paths).filter((path) => !path.endsWith('{endpoint}'));
  return {
    ...openAPIObject,
    paths: Object.fromEntries(filteredPaths.map((path) => [path, paths[path]!]))
  };
}

// The OpenAPI declaration uses empty objects for some return types. Code-gen uses 'void' in that case.
// Replace them with an catch-all object type to make the generated code work.
function pathReturnFixCatchAll(openAPIObject: OpenAPIObject) {
  const catchAll = { type: 'object', properties: {}, additionalProperties: true };
  const methods = ['get', 'post', 'put', 'delete'];
  const JSON_CONTENT_TYPE = 'application/json';

  for (const pathItem of Object.values(openAPIObject.paths)) {
    for (const method of methods) {
      const methodItem = pathItem[method];
      if (!methodItem?.responses) continue;

      for (const responseItem of Object.values(methodItem.responses)) {
        const content = (responseItem as any).content;
        if (!content?.[JSON_CONTENT_TYPE]) continue;

        const schema = content[JSON_CONTENT_TYPE].schema;
        if (schema && Object.keys(schema).length === 0) {
          content[JSON_CONTENT_TYPE].schema = catchAll;
        }
      }
    }
  }
}

type ResponseUpdate = {
  paths: string[];
  methods: string[];
  responses: Record<string, any>;
};

// Fix some API returns for well known APIs.
function fixAPIReturns(openAPIObject: OpenAPIObject, apiUpdates: ResponseUpdate[]) {
  for (const update of apiUpdates) {
    for (const path of update.paths) {
      const pathItem = openAPIObject.paths[path];
      if (!pathItem) continue;

      for (const method of update.methods) {
        const methodItem = pathItem[method];
        if (!methodItem?.responses) continue;

        for (const [code, schema] of Object.entries(update.responses)) {
          const responseItem = methodItem.responses[code];
          if (responseItem) {
            const content = responseItem.content;
            if (content?.['application/json']) {
              content['application/json'].schema = schema;
            }
          }
        }
      }
    }
  }
}

function obj(properties: Record<string, any>) {
  return {
    type: 'object',
    properties,
    additionalProperties: true
  };
}

function arrayOf(type: any) {
  return {
    type: 'array',
    items: type
  };
}

function schemaRef(ref: string) {
  return { $ref: `#/components/schemas/${ref}` };
}
