/**
 * Shared axios configuration utilities
 */

import axiosBase from 'axios';
import axiosRetry from 'axios-retry';
import { DEFAULT_RETRY_COUNT, DEFAULT_RETRY_BASE_DELAY } from './constants.mjs';

/**
 * Create exponential backoff delay for retries
 * @param {number} retryNumber
 * @returns {number} delay in milliseconds
 */
export function createRetryDelay(retryNumber = 0) {
  const seconds = Math.pow(2, retryNumber) * DEFAULT_RETRY_BASE_DELAY;
  const randomMs = DEFAULT_RETRY_BASE_DELAY * Math.random();
  return seconds + randomMs;
}

/**
 * Create axios instance with retry configuration
 * @param {number} retries Number of retries (default: DEFAULT_RETRY_COUNT)
 * @returns {object} Configured axios instance
 */
export function createAxiosWithRetry(retries = DEFAULT_RETRY_COUNT) {
  const axios = axiosBase.create();

  axiosRetry(axios, {
    retries,
    retryDelay: createRetryDelay,
  });

  return axios;
}

/**
 * Create basic auth token
 * @param {string} login
 * @param {string} password
 * @returns {string} Base64 encoded token
 */
export function createBasicAuthToken(login, password) {
  const bearerBuffer = Buffer.from(login + ':' + password, 'utf-8');
  return bearerBuffer.toString('base64');
}

/**
 * Create axios config with basic auth
 * @param {string} login
 * @param {string} password
 * @returns {object} Axios config object
 */
export function createBasicAuthConfig(login, password) {
  const token = createBasicAuthToken(login, password);
  return {
    headers: {
      'Authorization': `Basic ${token}`
    }
  };
}
