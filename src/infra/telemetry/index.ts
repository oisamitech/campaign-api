import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { registerInstrumentations } from '@opentelemetry/instrumentation'
import { FastifyInstrumentation } from '@opentelemetry/instrumentation-fastify'
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http'
import { B3Propagator } from '@opentelemetry/propagator-b3'
import { Resource } from '@opentelemetry/resources'
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base'
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node'
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

export function otelSetup(): void {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: 'campaign-api',
    }),
  })

  const traceExporter = new OTLPTraceExporter({
    url: process.env.OPEN_TELEMETRY_EXPORTER_URL,
  })

  provider.addSpanProcessor(new BatchSpanProcessor(traceExporter))

  provider.register({
    propagator: new B3Propagator(),
  })

  // Register your auto-instrumentors
  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [
      new HttpInstrumentation({}),
      new FastifyInstrumentation(),
    ],
  })
}

if (process.env.OPEN_TELEMETRY_IS_ENABLED === 'true') {
  console.log('OPEN_TELEMETRY_IS_ENABLED is true')
  otelSetup()
}
