import { FastifyOtelInstrumentation } from '@fastify/otel';
import { DiagConsoleLogger, DiagLogLevel, diag } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Resource, resourceFromAttributes } from '@opentelemetry/resources';
import {
	BatchSpanProcessor,
	ConsoleSpanExporter,
	SimpleSpanProcessor,
	SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import {
	ATTR_SERVICE_NAME,
	ATTR_SERVICE_VERSION,
	SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
	SEMRESATTRS_HOST_NAME,
	SEMRESATTRS_SERVICE_INSTANCE_ID,
} from '@opentelemetry/semantic-conventions';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { hostname } from 'node:os';

interface OtelConfig {
	enabled: boolean;
	serviceName: string;
	serviceVersion: string;
	environment: string;
	traceUrl?: string;
	sampleRatio: number;
	debug: boolean;
	headers?: Record<string, string>;
}

function validateAndGetConfig(): OtelConfig {
	const enabled = process.env.OTEL_ENABLED === 'true';

	if (!enabled) {
		return {
			enabled: false,
			serviceName: '',
			serviceVersion: '',
			environment: '',
			sampleRatio: 0,
			debug: false,
		};
	}

	const requiredEnvVars = ['OTEL_URL', 'OTEL_SERVICE_NAME', 'OTEL_ENABLED'];
	const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

	if (missingVars.length > 0) {
		throw new Error(
			`Missing required environment variables for OTEL: ${missingVars.join(', ')}`,
		);
	}

	return {
		enabled,
		serviceName: process.env.OTEL_SERVICE_NAME || '',
		serviceVersion: process.env.npm_package_version || '1.0.0',
		environment: process.env.NODE_ENV || 'development',
		traceUrl: process.env.OTEL_URL,
		sampleRatio: parseFloat(process.env.OTEL_SAMPLE_RATIO || '1.0'),
		debug: process.env.OTEL_DEBUG === 'true',
	};
}

function createResource(config: OtelConfig): Resource {
	const resourceAttributes = {
		[ATTR_SERVICE_NAME]: config.serviceName,
		[ATTR_SERVICE_VERSION]: config.serviceVersion,
		[SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: config.environment,
		[SEMRESATTRS_SERVICE_INSTANCE_ID]: randomUUID(),
		[SEMRESATTRS_HOST_NAME]: hostname(),
	};

	return resourceFromAttributes(resourceAttributes);
}

function setupTracing(
	config: OtelConfig,
	resource: Resource,
): NodeTracerProvider {
	const traceExporter = new OTLPTraceExporter({
		url: config.traceUrl,
		headers: config.headers,
		timeoutMillis: 30000,
		concurrencyLimit: 50,
	});

	const spanProcessors: SpanProcessor[] = [];

	// In debug mode, add a console exporter to facilitate debugging
	if (config.environment === 'development' && config.debug) {
		spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()));
	}

	// BatchSpanProcessor is optimized for production, sending spans in batches
	spanProcessors.push(
		new BatchSpanProcessor(traceExporter, {
			maxQueueSize: 2048,
			maxExportBatchSize: 512,
			exportTimeoutMillis: 30000,
			scheduledDelayMillis: 500,
		}),
	);

	const provider = new NodeTracerProvider({
		resource,
		spanProcessors,
	});

	provider.register({
		propagator: new W3CTraceContextPropagator(),
	});

	return provider;
}

function setupInstrumentations(
	config: OtelConfig,
	tracerProvider: NodeTracerProvider,
): void {
	const fastifyOtelInstrumentation = new FastifyOtelInstrumentation({
		servername: config.serviceName,
		registerOnInitialization: true,
	});

	fastifyOtelInstrumentation.setTracerProvider(tracerProvider);

	const instrumentations = [
		new HttpInstrumentation(),
		fastifyOtelInstrumentation,
	];

	registerInstrumentations({
		tracerProvider,
		instrumentations,
	});
}

// Dedicated function for graceful shutdown
function setupGracefulShutdown(provider: NodeTracerProvider): void {
	const shutdown = async () => {
		console.log('OTEL: Shutting down OpenTelemetry...');
		try {
			await provider.shutdown();
			console.log('OTEL: OpenTelemetry shut down completed');
		} catch (error) {
			console.error('OTEL: Error during OpenTelemetry shutdown', error);
		} finally {
			process.exit(0);
		}
	};

	// Handles SIGTERM (production) and SIGINT (development, Ctrl+C)
	process.on('SIGTERM', shutdown);
	process.on('SIGINT', shutdown);
}

export function otelSetup(): void {
	try {
		const config = validateAndGetConfig();

		if (!config.enabled) {
			console.log('OTEL: OpenTelemetry is disabled');
			return;
		}

		const logLevel = config.debug ? DiagLogLevel.DEBUG : DiagLogLevel.ERROR;
		diag.setLogger(new DiagConsoleLogger(), logLevel);

		console.log(
			`OTEL: Initializing OpenTelemetry for ${config.serviceName} v${config.serviceVersion} in ${config.environment}`,
		);

		const resource = createResource(config);
		const tracerProvider = setupTracing(config, resource);

		setupInstrumentations(config, tracerProvider);

		// Shutdown logic was moved to a dedicated function
		setupGracefulShutdown(tracerProvider);

		console.log('OTEL: OpenTelemetry initialized successfully');
	} catch (error) {
		console.error('OTEL: Failed to initialize OpenTelemetry:', error);
		// In production, we don't want OTEL failures to break the application
		if (process.env.NODE_ENV === 'production') {
			console.warn('OTEL: Continuing without OpenTelemetry in production');
		} else {
			throw error;
		}
	}
}

// Initialize OpenTelemetry configuration
otelSetup();
