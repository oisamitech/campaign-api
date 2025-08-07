import fs from 'node:fs';
import path from 'node:path';
import database from './connection';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function createMigrationsTable() {
	await database.pool.execute(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function getAppliedMigrations(): Promise<string[]> {
	const [rows] = await database.pool.execute(
		'SELECT name FROM migrations ORDER BY id ASC',
	);
	return (rows as { name: string }[]).map((row) => row.name);
}

async function applyMigration(fileName: string): Promise<void> {
	console.log(`Applying migration: ${fileName}`);

	const filePath = path.join(MIGRATIONS_DIR, fileName);
	const content = fs.readFileSync(filePath, 'utf8');

	const connection = await database.pool.getConnection();

	try {
		await connection.beginTransaction();

		// Execute the migration SQL
		await connection.query(content);

		// Record the migration
		await connection.execute('INSERT INTO migrations (name) VALUES (?)', [
			fileName,
		]);

		await connection.commit();
		console.log(`Migration ${fileName} applied successfully`);
	} catch (error) {
		await connection.rollback();
		console.error(`Failed to apply migration ${fileName}:`, error);
		throw error;
	} finally {
		connection.release();
	}
}

async function revertMigration(fileName: string): Promise<void> {
	console.log(`Reverting migration: ${fileName}`);

	// Extract the base name without extension
	const baseName = path.basename(fileName, '.sql');
	const downFilePath = path.join(MIGRATIONS_DIR, `${baseName}.down.sql`);

	// Check if down migration exists
	if (!fs.existsSync(downFilePath)) {
		console.error(`Down migration file not found: ${downFilePath}`);
		return;
	}

	const content = fs.readFileSync(downFilePath, 'utf8');
	const connection = await database.pool.getConnection();

	try {
		await connection.beginTransaction();

		// Execute the down migration SQL
		await connection.query(content);

		// Remove the migration record
		await connection.execute('DELETE FROM migrations WHERE name = ?', [
			fileName,
		]);

		await connection.commit();
		console.log(`Migration ${fileName} reverted successfully`);
	} catch (error) {
		await connection.rollback();
		console.error(`Failed to revert migration ${fileName}:`, error);
		throw error;
	} finally {
		connection.release();
	}
}

async function up() {
	await createMigrationsTable();

	// Get all migration files
	const files = fs
		.readdirSync(MIGRATIONS_DIR)
		.filter((file) => file.endsWith('.sql') && !file.endsWith('.down.sql'))
		.sort();

	// Get already applied migrations
	const appliedMigrations = await getAppliedMigrations();

	// Apply pending migrations
	for (const file of files) {
		if (!appliedMigrations.includes(file)) {
			await applyMigration(file);
		} else {
			console.log(`Migration ${file} already applied, skipping`);
		}
	}

	console.log('All migrations applied');
}

async function down() {
	await createMigrationsTable();

	// Get applied migrations in reverse order (newest first)
	const appliedMigrations = await getAppliedMigrations();
	appliedMigrations.reverse();

	if (appliedMigrations.length === 0) {
		console.log('No migrations to revert');
		return;
	}

	// Revert the most recent migration
	await revertMigration(appliedMigrations[0]);
	console.log('Latest migration reverted');
}

async function main() {
	const command = process.argv[2]?.toLowerCase();

	try {
		if (command === 'up') {
			await up();
		} else if (command === 'down') {
			await down();
		} else {
			console.error('Invalid command. Use "up" or "down"');
			process.exit(1);
		}
	} catch (error) {
		console.error('Migration failed:', error);
		process.exit(1);
	} finally {
		await database.pool.end();
	}
}

// Run the migrations if this file is executed directly
if (require.main === module) {
	main();
}

export { up, down };
