/**
 * Input validation utilities
 */

import { PHONE_MIN_LENGTH, PHONE_MAX_LENGTH, SMS_MAX_LENGTH } from './constants.mjs';

/**
 * Validate phone number format
 * @param {string} phoneNumber
 * @returns {boolean}
 */
export function isValidPhoneNumber(phoneNumber) {
  if (!phoneNumber || typeof phoneNumber !== 'string') {
    return false;
  }

  // Allow international format with optional + and digits
  const phoneRegex = new RegExp(`^\\+?[0-9]{${PHONE_MIN_LENGTH},${PHONE_MAX_LENGTH}}$`);
  return phoneRegex.test(phoneNumber.trim());
}

/**
 * Validate SMS content
 * @param {string} content
 * @returns {object} { valid: boolean, error?: string }
 */
export function validateSmsContent(content) {
  if (!content || typeof content !== 'string') {
    return { valid: false, error: 'SMS content is required and must be a string' };
  }

  const trimmedContent = content.trim();

  if (trimmedContent.length === 0) {
    return { valid: false, error: 'SMS content cannot be empty' };
  }

  // Standard SMS length is 160 characters, extended up to SMS_MAX_LENGTH
  if (trimmedContent.length > SMS_MAX_LENGTH) {
    return { valid: false, error: `SMS content exceeds maximum length of ${SMS_MAX_LENGTH} characters` };
  }

  return { valid: true };
}

/**
 * Sanitize error message for client response
 * Removes stack traces and sensitive information
 * @param {Error} error
 * @returns {object}
 */
export function sanitizeError(error) {
  const errorResponse = {
    name: error.name || 'Error',
    message: 'An error occurred while processing your request'
  };

  // Provide more specific messages for known error types
  if (error.message && error.message.includes('status code 403')) {
    errorResponse.message = 'Authentication failed. Please check your credentials.';
  } else if (error.message && error.message.includes('status code 500')) {
    errorResponse.message = 'Router error. The router may be busy or unreachable.';
  } else if (error.message && error.message.includes('ECONNREFUSED')) {
    errorResponse.message = 'Cannot connect to router. Please check the URL and network connection.';
  } else if (error.message && error.message.includes('timeout')) {
    errorResponse.message = 'Request timeout. The router did not respond in time.';
  }

  return errorResponse;
}

/**
 * Validate configuration object
 * @param {object} config
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  const errors = [];

  if (!config) {
    return { valid: false, errors: ['Configuration is required'] };
  }

  // Check required fields for router connection
  if (!config.url || typeof config.url !== 'string') {
    errors.push('Router URL is required');
  }

  if (!config.login || typeof config.login !== 'string') {
    errors.push('Router login is required');
  }

  if (!config.password || typeof config.password !== 'string') {
    errors.push('Router password is required');
  }

  // Validate URL format
  if (config.url) {
    try {
      new URL(config.url);
    } catch (e) {
      errors.push('Router URL is not a valid URL');
    }
  }

  // Check API configuration if present
  if (config.api_listen_port !== undefined) {
    const port = parseInt(config.api_listen_port);
    if (isNaN(port) || port < 1 || port > 65535) {
      errors.push('API listen port must be between 1 and 65535');
    }
  }

  if (config.api_users !== undefined && typeof config.api_users !== 'object') {
    errors.push('API users must be an object');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
