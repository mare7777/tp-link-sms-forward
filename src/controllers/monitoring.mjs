/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: Monitoring
 */

/**
 * @swagger
 * path:
 *  /monitoring/health:
 *    get:
 *      summary: Lightweight health endpoint for container liveness/readiness checks
 *      description:
 *        Returns process-level health information without contacting the router.
 *      tags: [Monitoring]
 *      responses:
 *        "200":
 *          description: Service is healthy
 *  /monitoring/metrics:
 *    get:
 *      summary: Prometheus metrics endpoint WIP
 *      description:
 *        Monitoring
 *      tags: [Monitoring]
 *      responses:
 *        "200":
 *          description: Monitoring data
 */

import express from 'express';

const router = express.Router();

function buildHealthPayload() {
  return {
    status: 200,
    data: {
      ok: true,
      service: 'api-bridge',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  };
}

router.get('/health', async function (req, res) {
  res.json(buildHealthPayload());
});

router.get('/metrics', async function (req, res) {
  res.send('WIP');
});

export default router;
