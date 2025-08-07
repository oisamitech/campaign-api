// Need to first import
import './telemetry';

import { buildApp } from './app';
import { config } from './config';
import { testConnection } from './database/connection';

async function main() {
	try {
		// Test database connection
		const dbConnected = await testConnection();
		if (!dbConnected) {
			console.error('Failed to connect to database. Exiting...');
			process.exit(1);
		}

		// Build and start the application
		const app = await buildApp();

		// Start the server
		await app.listen({
			port: config.app.port,
			host: config.app.host,
		});

		console.log(
			`Server is running at http://${config.app.host}:${config.app.port}`,
		);
		console.log(
			`API documentation available at http://${config.app.host}:${config.app.port}/documentation`,
		);

		// Handle graceful shutdown
		const signals = ['SIGINT', 'SIGTERM'] as const;
		signals.forEach((signal) => {
			process.on(signal, async () => {
				console.log(`Received ${signal}, shutting down...`);

				await app.close();
				console.log('Server closed');

				process.exit(0);
			});
		});
	} catch (error) {
		console.error('Failed to start server:', error);
		process.exit(1);
	}
}

// Start the application
main();
