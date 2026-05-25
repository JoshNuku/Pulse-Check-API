import express from 'express';
import cors from 'cors';
import monitorRouter from './routes/monitorRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', monitorRouter);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'CritMon Watchdog Sentinel API',
    version: '1.0.0',
  });
});

// Global Error Handler
app.use(errorHandler);

export default app;