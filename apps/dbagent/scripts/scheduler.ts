/* eslint-disable no-process-env */
const SCHEDULER_TICK_INTERVAL_SECONDS = parseInt(
  process.env.SCHEDULER_TICK_INTERVAL_SECONDS || (process.env.NODE_ENV === 'production' ? '60' : '10'),
  10
);
const PORT = process.env.PORT || 4001;

async function tick() {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/priv/schedule-tick`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    console.log('Scheduler tick completed successfully');
  } catch (error) {
    console.error('Error in scheduler tick:', error);
  }
}

// Read interval from environment (in seconds), default to 10 seconds
// Convert seconds to milliseconds for setInterval
const intervalMs = SCHEDULER_TICK_INTERVAL_SECONDS * 1000;
console.log(`Starting scheduler with ${SCHEDULER_TICK_INTERVAL_SECONDS}s interval (${intervalMs}ms)`);

setInterval(tick, intervalMs);
