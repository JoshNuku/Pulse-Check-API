import app from './app.js';
import { config } from './config/env.js';
import { loadMonitorsFromDisk } from './store/monitorStore.js';
import { initializeRecovery } from './services/timerEngine.js';
import { startEmailWorker } from './services/emailWorker.js';

// 1. Startup State Loading and Recovery
loadMonitorsFromDisk();
initializeRecovery();

// 2. Start HTTP Listener
const server = app.listen(config.PORT, () => {

  console.log(`WATCHDOG SENTINEL API SERVER STARTED`);
  console.log(`Listening on port: ${config.PORT}`);
  console.log(`Environment: ${config.NODE_ENV}`);


  // Start the background email dispatcher loop
  startEmailWorker();
});

// 3. Graceful Shutdown Implementation
function handleShutdown(signal) {
  console.log(`\n[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    console.log('[Shutdown] HTTP Server closed.');
    console.log('[Shutdown] Graceful shutdown complete. Exiting.');
    process.exit(0);
  });

  // Force exit after 10s if operations hang
  setTimeout(() => {
    console.error('[Shutdown] Forcefully shutting down due to timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));