#!/usr/bin/env node

import crypto from 'crypto'
import minimist from 'minimist'
import logger from './src/logger.mjs'
import { createAxiosWithRetry, createBasicAuthConfig } from './src/axiosConfig.mjs'
import { ERROR_RETRY_DELAY, HTTP_STATUS } from './src/constants.mjs'
import { loadConfig } from './src/config.mjs'

const axios = createAxiosWithRetry();
let configFilePath = 'config.json';

const argv = minimist(process.argv.slice(2), {
  string: '_', // prevent string to number conversion
});

if (typeof argv['config'] !== 'undefined') {
  configFilePath = argv['config'];
}

let config;
try {
  config = loadConfig(configFilePath);
} catch(exception) {
  console.error(exception.message);
  process.exit(1);
}


class SmsPoller {
  constructor(config, callback) {
    this.pollingPeriod = config.pollingPeriod;
    this.pollingJitterMs = config.pollingJitterMs || 0;
    this.errorRetryDelay = config.errorRetryDelay || ERROR_RETRY_DELAY;
    this.url = config.url;
    this.callback = callback;
    this.axiosConfig = createBasicAuthConfig(config.login, config.password);
    this.markReadConcurrency = 3;
    this.markReadRetryDelay = 2000;
    this.maxMarkReadRetry = 5;
    this.markReadRetryQueue = [];
    this.markReadRetryTimer = null;
    this.markReadProcessing = false;
    this.dedupCacheTtlMs = 10 * 60 * 1000;
    this.dedupCache = new Map();
  }

  getNextPollingDelay() {
    const maxJitter = Math.max(0, this.pollingJitterMs);
    const jitter = maxJitter > 0 ? Math.floor(Math.random() * (maxJitter + 1)) : 0;
    return this.pollingPeriod + jitter;
  }

  async wait(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // noinspection InfiniteRecursionJS
  async poll() {
    let continueWhile = true;
    let response;
    while (continueWhile) {
      try {
        response = await axios.get(this.url + "/api/v1/sms/inbox", this.axiosConfig);
        continueWhile = false;
      } catch(exception) {
        // catch network errors
        logger.error("Error while connecting, retrying in " + (this.errorRetryDelay/1000) + " seconds. " + exception.message);
        await this.wait(this.errorRetryDelay);
      }
    }

    if (response.status === HTTP_STATUS.BAD_GATEWAY) {
      // Status 502 is a connection timeout error,
      // may happen when the connection was pending for too long,
      // and the remote server or a proxy closed it
      // let's reconnect
      await this.poll();
    } else if (response.status !== HTTP_STATUS.OK) {
      // An error - let's show it
      logger.notice("Received abnormal response " + response.statusText);
      // Reconnect in one second
      await this.wait(this.errorRetryDelay);
      await this.poll();
    } else {
      // we need to number the messages so we can mark them read later if needed
      let message = await response.data;
      let i = 1;
      let numberedMessages = message.data.map(element => {
          element.order = i++;
          return element;
      });

      // filter on unread messages
      let unread = numberedMessages.filter(sms => sms.unread == true);

      const waitingForUnreadProcessing = this.processUnreadSms(unread);

      // Call poll() again to get the next message
      await this.wait(this.getNextPollingDelay());
      await waitingForUnreadProcessing;
      await this.poll();
    }
  }
    
  async processUnreadSms(unreadSms) {
    for (const element of unreadSms) {
      const smsData = {
        from: element.from,
        content: element.content,
        receivedTime: element.receivedTime,
      };

      if (this.shouldForward(smsData)) {
        this.callback(smsData);
        logger.info("SMS forwarded", { sms: smsData });
      } else {
        logger.notice("Duplicate SMS skipped", { sms: smsData });
      }
    }

    await this.markUnreadAsRead(unreadSms);
  }

  shouldForward(smsData) {
    this.cleanupDedupCache();
    const key = this.getSmsDedupKey(smsData);
    const now = Date.now();
    if (this.dedupCache.has(key)) {
      return false;
    }
    this.dedupCache.set(key, now + this.dedupCacheTtlMs);
    return true;
  }

  cleanupDedupCache() {
    const now = Date.now();
    for (const [key, expiry] of this.dedupCache.entries()) {
      if (expiry <= now) {
        this.dedupCache.delete(key);
      }
    }
  }

  getSmsDedupKey(smsData) {
    const payload = `${smsData.from}|${smsData.receivedTime}|${smsData.content}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async markUnreadAsRead(unreadSms) {
    await this.runWithConcurrency(unreadSms, this.markReadConcurrency, async (element) => {
      await this.markOneAsRead(element, 0);
    });
  }

  async markOneAsRead(element, attempt) {
    try {
      await axios.patch(this.url + "/api/v1/sms/inbox/" + element.order, null, this.axiosConfig);
      logger.info("SMS marked as read", { order: element.order, from: element.from });
    } catch(exception) {
      logger.error("Error marking SMS as read. " + exception.message, { order: element.order, attempt: attempt + 1 });
      this.enqueueMarkReadRetry(element, attempt + 1);
    }
  }

  enqueueMarkReadRetry(element, attempt) {
    if (attempt > this.maxMarkReadRetry) {
      logger.error("Exceeded max retries for mark-as-read", { order: element.order, from: element.from });
      return;
    }

    this.markReadRetryQueue.push({ element, attempt });
    if (!this.markReadRetryTimer) {
      this.markReadRetryTimer = setTimeout(() => {
        this.markReadRetryTimer = null;
        this.processMarkReadRetryQueue();
      }, this.markReadRetryDelay);
    }
  }

  async processMarkReadRetryQueue() {
    if (this.markReadProcessing || this.markReadRetryQueue.length === 0) {
      return;
    }

    this.markReadProcessing = true;
    const batch = this.markReadRetryQueue.splice(0, this.markReadRetryQueue.length);
    await this.runWithConcurrency(batch, this.markReadConcurrency, async ({ element, attempt }) => {
      await this.markOneAsRead(element, attempt);
    });
    this.markReadProcessing = false;

    if (this.markReadRetryQueue.length > 0 && !this.markReadRetryTimer) {
      this.markReadRetryTimer = setTimeout(() => {
        this.markReadRetryTimer = null;
        this.processMarkReadRetryQueue();
      }, this.markReadRetryDelay);
    }
  }

  async runWithConcurrency(array, concurrency, callback) {
    let cursor = 0;
    const worker = async () => {
      while (cursor < array.length) {
        const currentIndex = cursor++;
        await callback(array[currentIndex], currentIndex, array);
      }
    };
    const workerCount = Math.min(concurrency, array.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);
  }

  shutdown() {
    if (this.markReadRetryTimer) {
      clearTimeout(this.markReadRetryTimer);
      this.markReadRetryTimer = null;
    }
  }
}

function on_sms_received(sms) {
  logger.info("Received SMS", {sms});
}

const poller = new SmsPoller({
  pollingPeriod: config.api_client_polling_delay,
  pollingJitterMs: config.api_client_polling_jitter_ms,
  url: config.api_client_url,
  login: config.api_client_login,
  password: config.api_client_password,
}, on_sms_received);

await poller.poll();
