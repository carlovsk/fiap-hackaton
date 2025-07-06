// src/monitoring/metrics.ts
import express from 'express';
import client from 'prom-client';
import { logger } from '../utils/logger';

const app = express();
const collectDefaultMetrics = client.collectDefaultMetrics;

collectDefaultMetrics(); // CPU, memory, event loop, etc.

export function startMetricsServer(port: number = Number(process.env.METRICS_PORT) || 8080) {
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.send(await client.register.metrics());
  });

  app.listen(port, () => {
    logger('monitoring:metrics').debug(`Metrics server running on :${port}/metrics`);
  });
}
