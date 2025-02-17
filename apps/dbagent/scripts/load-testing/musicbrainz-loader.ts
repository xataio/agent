/* eslint-disable no-process-env */
import pg from 'pg';
import { setTimeout as sleep } from 'timers/promises';

interface QueryStats {
  queryCount: number;
  startTime: number;
}

function createConnection(): Promise<any> {
  console.log('Connecting to database:', process.env.DATABASE_URL);

  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Allow self-signed certificates
    }
  });

  return client
    .connect()
    .then(() => client)
    .catch((err: Error) => {
      console.error('Error connecting to database:', err);
      throw err;
    });
}

function getQueries(): string[] {
  return [
    `SELECT * 
     FROM musicbrainz.artist 
     WHERE id = 12345`,
    `SELECT * FROM musicbrainz.track where recording = ${Math.floor(Math.random() * 10000)}`,
    `SELECT * FROM musicbrainz.track where name='${Math.random().toString(36).substring(2, 8)}'`,
    `SELECT * FROM musicbrainz.artist where name='${Math.random().toString(36).substring(2, 8)}'`,
    `SELECT * FROM musicbrainz.artist where comment like '%hello%'`,
    `SELECT * FROM musicbrainz.artist where comment like '%${Math.random().toString(36).substring(2, 8)}%'`
  ];
}

function getRandomDelay(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function printStats(stats: QueryStats): void {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  console.log(
    `Executed query ${stats.queryCount}. `,
    `Time elapsed: ${elapsed.toFixed(2)}s. `,
    `Queries/second: ${(stats.queryCount / elapsed).toFixed(2)}`
  );
}

async function executeLoadTest(
  durationSeconds: number = 300,
  minDelay: number = 100, // milliseconds
  maxDelay: number = 2000 // milliseconds
): Promise<void> {
  const client = await createConnection();
  const stats: QueryStats = {
    queryCount: 0,
    startTime: Date.now()
  };

  console.log('Starting load test...');

  try {
    while ((Date.now() - stats.startTime) / 1000 < durationSeconds) {
      const queries = getQueries();
      const query = queries[Math.floor(Math.random() * queries.length)];

      try {
        await client.query(query);
        stats.queryCount++;
        printStats(stats);
      } catch (err) {
        console.error('Error executing query:', err);
      }

      // Random delay before next query
      const delay = getRandomDelay(minDelay, maxDelay);
      await sleep(delay);
    }
  } catch (err) {
    console.error('Load test error:', err);
  } finally {
    await client.end();
    console.log(`\nLoad test completed. Total queries executed: ${stats.queryCount}`);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nReceived SIGINT. Shutting down...');
  process.exit(0);
});

// Run the load test
const DURATION_SECONDS = 3600; // 1 hour
const MIN_DELAY_MS = 100; // 0.1 seconds
const MAX_DELAY_MS = 2000; // 2 seconds

executeLoadTest(DURATION_SECONDS, MIN_DELAY_MS, MAX_DELAY_MS).catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
