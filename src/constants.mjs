/**
 * Application-wide constants
 */

// SMS related constants
export const SMS_MAX_LENGTH = 1600;  // Maximum SMS content length
export const SMS_MAX_RESULTS = 8;     // Router returns max 8 SMS at a time
export const PHONE_MIN_LENGTH = 8;    // Minimum phone number length
export const PHONE_MAX_LENGTH = 15;   // Maximum phone number length

// Default retry settings
export const DEFAULT_RETRY_COUNT = 3;
export const DEFAULT_RETRY_BASE_DELAY = 1000;  // milliseconds

// Polling settings
export const DEFAULT_POLLING_DELAY = 5000;  // milliseconds
export const ERROR_RETRY_DELAY = 10000;     // milliseconds

// Rate limiting
export const SMS_RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute in milliseconds
export const SMS_RATE_LIMIT_MAX = 10;             // Max SMS per window
export const API_RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute in milliseconds
export const API_RATE_LIMIT_MAX = 60;             // Max API calls per window

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
  BAD_GATEWAY: 502
};

// Router protocol constants
export const ROUTER_STACK_DEFAULT = '0,0,0,0,0,0';
export const ROUTER_INDEX_DEFAULT = 1;
