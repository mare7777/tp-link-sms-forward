#!/usr/bin/env node
import fs from 'fs'
import minimist from 'minimist'
import smtpServerLib from 'smtp-server';
import mailparser from 'mailparser';
import logger from './src/logger.mjs'
import { createAxiosWithRetry, createBasicAuthConfig } from './src/axiosConfig.mjs'

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

const axiosConfig = createBasicAuthConfig(config.sms_gateway_login, config.sms_gateway_password);

function sendSms(to, content) {
  const params = new URLSearchParams();
  params.append('to', to);
  params.append('content', content);

  logger.info('Sending SMS', params);

  return axios.post(config.sms_gateway_url + "/api/v1/sms/outbox", params, axiosConfig);
}

function streamToString (stream) {
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

const regex = new RegExp("^\\+?[0-9]+@" + config.sms_gateway_domain + "$","g");

const server = new smtpServerLib.SMTPServer({
    secure: false,
    authOptional: true,
    banner: 'SMTP gateway for SMS API',
    onData(stream, session, callback) {
      const destAddress = session.envelope.rcptTo[0].address;
      const destNumber = destAddress.split('@')[0];

      let content;
      streamToString(stream)
        .then(string => {
          logger.info("Received SMTP payload", {smtpPayload: string});
          return string;
        })
        .then(string => mailparser.simpleParser(string, {}))
        .then(result => sendSms(destNumber, content = result.text.trim()))
        .then(() => {
          logger.info("SMS sent successfully", {to: destNumber, content});
          callback();
        })
        .catch((error) => {
          logger.error("Could not send SMS", error)
          return callback(
            new Error("Could not send SMS")
          );
        });
    },
    onRcptTo(address, _, callback) {
      if (!address.address.match(regex)) {
        return callback(
          new Error("Only xxxxxxxxxx@" + config.sms_gateway_domain + " is allowed to receive mail")
        );
      }
      return callback(); // Accept the address
    }
  });

server.on("error", err => {
  logger.error(err.message);
});
  
server.listen(config.sms_gateway_listen_port, config.sms_gateway_listen_host);