async function tick() {
  try {
    const response = await fetch('http://localhost:4001/api/priv/schedule-tick', {
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

// Run tick every 10 seconds
const INTERVAL_MS = 10000;
console.log(`Starting scheduler with ${INTERVAL_MS}ms interval`);

setInterval(tick, INTERVAL_MS);

// Run immediately on start
void tick();
