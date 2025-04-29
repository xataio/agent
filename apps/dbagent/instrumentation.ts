import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { ExportResult } from '@opentelemetry/core';
import { ConsoleSpanExporter, ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { OTLPHttpJsonTraceExporter, OTLPHttpProtoTraceExporter, registerOTel } from '@vercel/otel';
import { LangfuseExporter } from 'langfuse-vercel';
import { env } from '~/lib/env/server';

export function register() {
  const exporters: SpanExporter[] = [];

  if (env.OTEL_DEBUG === 'true') {
    console.log('ConsoleSpanExporter is enabled');
    exporters.push(new ConsoleSpanExporter());
  }

  if (env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    let headers: Record<string, string> | undefined = env.OTEL_EXPORTER_OTLP_HEADERS;
    if (env.OTEL_EXPORTER_OTLP_KEY) {
      if (!headers) {
        headers = {};
      }
      headers['Authorization'] = `Bearer ${env.OTEL_EXPORTER_OTLP_KEY}`;
    }

    const protocol = env.OTEL_EXPORTER_OTLP_PROTOCOL || 'http/json';
    const config = {
      url: env.OTEL_EXPORTER_OTLP_ENDPOINT,
      headers
    };

    // Add otel logging
    diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR); // set diaglog level to DEBUG when debugging

    console.log('OTEL exporter is enabled');
    const exporter =
      protocol === 'http/json' ? new OTLPHttpJsonTraceExporter(config) : new OTLPHttpProtoTraceExporter(config);
    exporters.push(exporter);
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

  const serviceName = 'xata-agent';
  registerOTel({
    serviceName: serviceName,
    traceExporter: composedExporter(exporters),
    attributes: {
      [ATTR_SERVICE_NAME]: serviceName
    }
  });
}

function composedExporter(exporters: SpanExporter[]) {
  if (exporters.length === 0) {
    return undefined;
  }
  if (exporters.length === 1) {
    return exporters[0];
  }

  return {
    export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
      console.log('Exporting spans', spans.length);
      for (const exporter of exporters) {
        exporter.export(spans, resultCallback);
      }
    },

    shutdown(): Promise<void> {
      console.log('Shutting down exporters');
      return Promise.all(exporters.map((exporter) => exporter.shutdown())).then(() => undefined);
    },

    forceFlush(): Promise<void> {
      console.log('Flushing exporters');
      return Promise.all(exporters.map((exporter) => exporter.forceFlush?.())).then(() => undefined);
    }
  } as SpanExporter;
}
