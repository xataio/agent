import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { ExportResult } from '@opentelemetry/core';
import { OTLPTraceExporter as OTLPGrpcTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPTraceExporter as OTLPHttpJsonTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPTraceExporter as OTLPHttpProtoTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor, ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { LangfuseExporter } from 'langfuse-vercel';
import { z } from 'zod';

const schema = z.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
  OTEL_EXPORTER_OTLP_PROTOCOL: z.enum(['http/json', 'http/protobuf', 'grpc']).optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.record(z.string(), z.string()).optional(),
  OTEL_EXPORTER_OTLP_KEY: z.string().optional(),
  OTEL_SERVICE_NAME: z.string().default('xata-agent'),
  OTEL_DEBUG: z.string(z.enum(['true', 'false'])).default('false'),

  LANGFUSE_HOST: z.string().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),
  LANGFUSE_DEBUG: z.string(z.enum(['true', 'false'])).default('false')
});

/* eslint-disable no-process-env */
const env = schema.parse(process.env);

function otelExporter(
  protocol: 'http/json' | 'http/protobuf' | 'grpc',
  config: {
    url: string;
    headers?: Record<string, string>;
  }
): SpanExporter {
  switch (protocol) {
    case 'http/json':
      return new OTLPHttpJsonTraceExporter(config);
    case 'http/protobuf':
      return new OTLPHttpProtoTraceExporter(config);
    case 'grpc':
      return new OTLPGrpcTraceExporter(config);
    default:
      throw new Error(`Unsupported protocol: ${protocol}`);
  }
}

function createExporter(): SpanExporter | undefined {
  const exporters: SpanExporter[] = [];

  const level = env.OTEL_DEBUG === 'true' ? DiagLogLevel.DEBUG : DiagLogLevel.ERROR;
  diag.setLogger(new DiagConsoleLogger(), level); // set diaglog level to DEBUG when debugging

  if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    let headers: Record<string, string> | undefined = env.OTEL_EXPORTER_OTLP_HEADERS;
    if (env.OTEL_EXPORTER_OTLP_KEY) {
      if (!headers) {
        headers = {};
      }
      headers['Authorization'] = `Bearer ${env.OTEL_EXPORTER_OTLP_KEY}`;
    }

    exporters.push(
      otelExporter(env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/json', {
        url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
        headers
      })
    );
  }

  if (env.LANGFUSE_HOST && env.LANGFUSE_PUBLIC_KEY && env.LANGFUSE_SECRET_KEY) {
    exporters.push(
      new LangfuseExporter({
        baseUrl: env.LANGFUSE_HOST,
        publicKey: env.LANGFUSE_PUBLIC_KEY,
        secretKey: env.LANGFUSE_SECRET_KEY,
        debug: env.LANGFUSE_DEBUG === 'true'
      })
    );
  }

  if (env.OTEL_DEBUG === 'true') {
    exporters.push(new ConsoleSpanExporter());
  }

  if (exporters.length === 0) {
    return undefined;
  }

  return {
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
      for (const exporter of exporters) {
        exporter.export(spans, resultCallback);
      }
    },

    async shutdown(): Promise<void> {
      return await Promise.all(exporters.map((exporter) => exporter.shutdown())).then(() => undefined);
    },

    async forceFlush(): Promise<void> {
      return await Promise.all(exporters.map((exporter) => exporter.forceFlush?.())).then(() => undefined);
    }
  } as SpanExporter;
}

const traceExporter = createExporter();
const contextManager = new AsyncLocalStorageContextManager();
contextManager.enable();

const sdk = new NodeSDK({
  contextManager,
  traceExporter,
  spanProcessor: traceExporter ? new BatchSpanProcessor(traceExporter) : undefined,
  instrumentations: [getNodeAutoInstrumentations()]
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(
      () => {},
      (error) => console.error('OTel shutdown error', error)
    )
    .finally(() => process.exit(0));
});
