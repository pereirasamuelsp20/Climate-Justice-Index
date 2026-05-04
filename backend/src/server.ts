import { app } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startCronJobs } from './services/cron.service.js';

const PORT = Number(env.PORT || 3000);

const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Server listening on port ${PORT} in ${env.NODE_ENV} mode.`);
  
  // Initialize Cron Jobs
  startCronJobs();
  logger.info('Background cron services initialized.');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});
