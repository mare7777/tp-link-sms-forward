#!/usr/bin/env node

import minimist from 'minimist'
import express from 'express'
import nocache from 'nocache'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import expressBasicAuth from 'express-basic-auth'
import rateLimit from 'express-rate-limit'

import RouterClient from './src/routerClient.mjs'
import logger from './src/logger.mjs'
import { validateConfig } from './src/validation.mjs'
import { loadConfig } from './src/config.mjs'

let configFilePath = './config.json';

const argv = minimist(process.argv.slice(2));

if (typeof argv['config'] !== 'undefined') {
  configFilePath = argv['config'];
}


let config = {};

try {
  config = loadConfig(configFilePath);
} catch(exception) {
  logger.error(exception.message + ', exiting');
  process.exit(1);
}

// Validate configuration
const validation = validateConfig(config);
if (!validation.valid) {
  logger.error('Invalid configuration:');
  validation.errors.forEach(error => logger.error('  - ' + error));
  process.exit(1);
}

// Validate API-specific configuration
if (!config.api_listen_host || !config.api_listen_port) {
  logger.error('API configuration missing: api_listen_host and api_listen_port are required');
  process.exit(1);
}

if (!config.api_users || Object.keys(config.api_users).length === 0) {
  logger.error('API users configuration missing or empty: api_users is required for authentication');
  process.exit(1);
}

logger.info('Configuration validated successfully');

const app = express();

const client = new RouterClient(config.url, config.login, config.password);

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

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // support encoded bodies
app.use(nocache());
app.set('router_client', client);
app.disable('x-powered-by');

// Local container health checks should not depend on API auth credentials.
app.get('/healthz', (req, res) => {
  res.json(buildHealthPayload());
});

import smsRoutes from './src/controllers/sms.mjs';
import monitoringRoutes from './src/controllers/monitoring.mjs';

const authentication = expressBasicAuth({
  users: config.api_users,
  challenge: true,
});

// Rate limiting for SMS sending to prevent abuse
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each IP to 10 SMS requests per minute
  message: {
    status: 429,
    error: 'Too many SMS requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 requests per minute
  message: {
    status: 429,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/v1/sms/outbox', authentication, smsLimiter);  // Apply strict limit to SMS sending
app.use('/api/v1/sms', authentication, apiLimiter, smsRoutes);
app.use('/api/v1/monitoring', authentication, apiLimiter, monitoringRoutes);

const options = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Archer MR600 bridge API",
      version: "1.0.0",
      description: "Open Source API bridge for Archer MR600",
    },
    servers: [
      {
        url: `http://${config.api_listen_host}:${config.api_listen_port}/api/v1`
      }
    ]
  },
  apis: ['./src/controllers/*']
};

const specs = swaggerJsdoc(options);

app.use("/", swaggerUi.serve);
app.get(
  "/",
  swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API bridge for Archer MR600',
  })
);

// Global error handler - must be last middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    path: req.path,
    method: req.method
  });

  // Don't expose internal error details to client
  res.status(err.status || 500).json({
    status: err.status || 500,
    error: 'An internal error occurred'
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    status: 404,
    error: 'Route not found'
  });
});

app.listen(config.api_listen_port, config.api_listen_host, () => logger.info(`Api bridge listening at http://${config.api_listen_host}:${config.api_listen_port}`))