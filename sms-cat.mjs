#!/usr/bin/env node

import fs from 'fs'
import minimist from 'minimist'
import logger from './src/logger.mjs'
import { createAxiosWithRetry, createBasicAuthConfig } from './src/axiosConfig.mjs'
import { ERROR_RETRY_DELAY, HTTP_STATUS } from './src/constants.mjs'

const axios = createAxiosWithRetry();
let configFilePath = 'config.json';

const argv = minimist(process.argv.slice(2), {
  string: '_', // prevent string to number conversion
});

if (typeof argv['config'] !== 'undefined') {
  configFilePath = argv['config'];
}

let config ;
try {
  let rawConfig = fs.readFileSync(configFilePath);
  config = JSON.parse(rawConfig);
} catch(exception) {
  console.error('config file ' + configFilePath + ' could not be read');
  process.exit(1);
}


class SmsPoller {
  constructor(config, callback) {
    this.pollingPeriod = config.pollingPeriod;
    this.url = config.url;
    this.callback = callback;
    this.axiosConfig = createBasicAuthConfig(config.login, config.password);
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
        logger.error("Error while connecting, retrying in " + (ERROR_RETRY_DELAY/1000) + " seconds. " + exception.message);
        await new Promise(resolve => setTimeout(resolve, ERROR_RETRY_DELAY));
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
      await new Promise(resolve => setTimeout(resolve, 1000));
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
      await new Promise(resolve => setTimeout(resolve, this.pollingPeriod));
      await waitingForUnreadProcessing;
      await this.poll();
    }
  }
    
  async processUnreadSms(unreadSms) {
    const start = async () => {
      await this.asyncForEach(unreadSms, async (element) => {
        try {
          await axios.patch(this.url + "/api/v1/sms/inbox/" + element.order, null, this.axiosConfig);
        } catch(exception) {
          // catch network errors
          logger.error("Error while processing SMS. " + exception.message);
        }
        
        let smsData = {
          from: element.from,
          content: element.content,
          receivedTime: element.receivedTime,
        };
        this.callback(smsData);
      });
    }
    return start();
  }

  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }
}

function on_sms_received(sms) {
  logger.info("Received SMS", {sms});
}

const poller = new SmsPoller({
  pollingPeriod: config.api_client_polling_delay,
  url: config.api_client_url,
  login: config.api_client_login,
  password: config.api_client_password,
}, on_sms_received);

await poller.poll();