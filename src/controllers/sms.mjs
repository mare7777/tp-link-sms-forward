/**
 * @swagger
 *  components:
 *    schemas:
 *      InboxSms:
 *        type: object
 *        required:
 *          - index
 *          - from
 *          - content
 *          - receivedTime
 *          - unread
 *        properties:
 *          index:
 *            type: integer
 *            description: SMS id as stored in the router
 *          from:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of sender
 *          content:
 *            type: string
 *            description: SMS content
 *          receivedTime:
 *            type: datetime
 *            description: Date and time of reception
 *          unread:
 *            type: boolean
 *            description: Whether the SMS is marked unread
 *        example:
 *            index: 35
 *            from: '+33123456789'
 *            content: 'Test content'
 *            receivedTime: '2020-07-16 23:04:16'
 *            unread: true
 *      OutboxSms:
 *        type: object
 *        required:
 *          - index
 *          - to
 *          - content
 *          - sendTime
 *        properties:
 *          index:
 *            type: integer
 *            description: SMS id as stored in the router
 *          to:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of receiver
 *          content:
 *            type: string
 *            description: SMS content
 *          sendTime:
 *            type: datetime
 *            description: Date and time of sending
 *        example:
 *            index: 35
 *            to: '+33123456789'
 *            content: 'Test content'
 *            sent: '2020-07-16 23:04:16'
 *      OutboxNewSms:
 *        type: object
 *        required:
 *          - to
 *          - content
 *        properties:
 *          to:
 *            type: string
 *            format: phonenumber
 *            description: Phone number of receiver
 *          content:
 *            type: string
 *            description: SMS content
 *        example:
 *            to: '+33123456789'
 *            content: 'Test content'
 */

/**
 * @swagger
 * tags:
 *   name: SMS
 *   description: SMS Management
 */

/**
 * @swagger
 * path:
 *  /sms/inbox:
 *    get:
 *      summary: Get Received SMS (last 8 max received SMS)
 *      description:
 *        Returns a list of the last 8 received SMS, optionally filtered by unread status, sorted by most recent first.
 *        Only the last 8 elements are reported because the bridge does not support pagination at the router's end.
 *
 *        Messages could be missed if this endpoint is polled and more than 8 messages are received. To poll messages
 *        from this endpoint without missing any, one should poll with filter unread=true and mark already read SMS using a PATCH request.
 *
 *        Please note that the order of the results is important if other endpoints are to be called.
 *      tags: [SMS]
 *      parameters:
 *        - in: query
 *          name: unread
 *          schema:
 *             type: boolean
 *          required: false
 *          description: Filter on this unread value, true = only unread SMS, false = only read SMS. Due to protocol limitations, reported results for filter unread=false are inaccurate. Filter unread=true does not have this issue and reports correctly the last 8 unread SMS.
 *        - in: query
 *          name: since
 *          schema:
 *             type: string
 *             format: date-time
 *          required: false
 *          description: Return only SMS received strictly after this ISO-8601 datetime.
 *        - in: query
 *          name: fingerprint
 *          schema:
 *             type: string
 *          required: false
 *          description: Return only SMS coming after this fingerprint in the current stable ordering.
 *        - in: query
 *          name: unseenOnly
 *          schema:
 *             type: boolean
 *          required: false
 *          description: If true, return only messages not yet seen by this bridge instance, based on message fingerprint cache.
 *      responses:
 *        "200":
 *          description: List of inbox SMS
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/InboxSms'
 *  /sms/inbox/{smsOrderNumber}:
 *    patch:
 *      summary: Mark SMS as read for the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after an unfiltered call to GET /sms/inbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/inbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 *    delete:
 *      summary: Delete the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after an unfiltered call to GET /sms/inbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/inbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 *  /sms/outbox:
 *    get:
 *      summary: Get Sent SMS (last 8 max sent SMS)
 *      tags: [SMS]
 *      responses:
 *        "200":
 *          description: List of sent SMS
 *          content:
 *            application/json:
 *              schema:
 *                $ref: '#/components/schemas/OutboxSms'
 *    post:
 *      summary: Send new SMS
 *      description: Submit new SMS for the router to send. Accepting json object or form-urlencoded.
 *      tags: [SMS]
 *      consumes:
 *       - "application/json"
 *       - "application/x-www-form-urlencoded"
 *      produces:
 *       - "application/json"
 *      requestBody:
 *        description: "SMS object that needs to be sent"
 *        required: true
 *        content:
 *          application/json:
 *            schema:
 *              $ref: '#/components/schemas/OutboxNewSms'
 *          application/x-www-form-urlencoded:
 *            schema:
 *              $ref: '#/components/schemas/OutboxNewSms'
 *  /sms/outbox/{smsOrderNumber}:
 *    delete:
 *      summary: Delete the n-th SMS in the last 8 SMS
 *      description: Difficult endpoint to use because of the stateful nature of the protocol at router's end. This endpoint must be called only after a call to GET /sms/outbox.
 *      tags: [SMS]
 *      parameters:
 *        - name: "smsOrderNumber"
 *          in: "path"
 *          description: SMS order number in the max 8 SMS returned from /sms/outbox. It is not the SMS id.". First is 1 not 0. Range is 1 to 8 included.
 *          required: true
 *          type: "integer"
 */

import express from 'express';
import { TP_ACT, TP_CONTROLLERS } from '../routerProtocol.mjs'
import { isValidPhoneNumber, validateSmsContent, sanitizeError } from '../validation.mjs'
import { ROUTER_INDEX_DEFAULT, ROUTER_STACK_DEFAULT } from '../constants.mjs'

const router = express.Router();

const payloadResetInboxCursor = {
  method: TP_ACT.ACT_SET,
  controller: TP_CONTROLLERS.LTE_SMS_RECVMSGBOX,
  attrs: {'PageNumber': 1},
}

const payloadInbox = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
  attrs: ['index', 'from', 'content', 'receivedTime', 'unread'],
};

const payloadInboxUnread = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_UNREADMSGENTRY,
  attrs: ['index', 'from', 'content', 'receivedTime', 'unread'],
};

const payloadResetOutboxCursor = {
  method: TP_ACT.ACT_SET,
  controller: TP_CONTROLLERS.LTE_SMS_SENDMSGBOX,
  attrs: {'PageNumber': 1},
}

const payloadOutbox = {
  method: TP_ACT.ACT_GL,
  controller: TP_CONTROLLERS.LTE_SMS_SENDMSGENTRY,
  attrs: ['index', 'to', 'content', 'sendTime'],
};


const seenInboxFingerprints = new Set();
const MAX_SEEN_FINGERPRINTS = 256;

function toIsoDateTime(routerDateTime) {
  if (typeof routerDateTime !== 'string') {
    return null;
  }

  const match = routerDateTime.match(/^(\d{4})-(\d{2})-(\d{2})\s(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

function buildInboxFingerprint(entry) {
  return [entry.index, entry.from, entry.content, entry.receivedTime].map((v) => v ?? '').join('|');
}

function normalizeInboxEntry(entry) {
  const fingerprint = buildInboxFingerprint(entry);

  return {
    ...entry,
    receivedTimeIso: toIsoDateTime(entry.receivedTime),
    fingerprint,
  };
}

function compareInboxEntriesDesc(left, right) {
  const leftIso = left.receivedTimeIso;
  const rightIso = right.receivedTimeIso;

  if (leftIso && rightIso && leftIso !== rightIso) {
    return rightIso.localeCompare(leftIso);
  }

  if (left.index !== right.index) {
    return right.index - left.index;
  }

  return left.fingerprint.localeCompare(right.fingerprint);
}

function addToSeenCache(entries) {
  for (const entry of entries) {
    seenInboxFingerprints.add(entry.fingerprint);
    if (seenInboxFingerprints.size > MAX_SEEN_FINGERPRINTS) {
      const oldestFingerprint = seenInboxFingerprints.values().next().value;
      seenInboxFingerprints.delete(oldestFingerprint);
    }
  }
}

router.get('/inbox', async function (req, res) {
  const client = req.app.get('router_client');

  client.execute([payloadResetInboxCursor, payloadInbox])
    .then((response) => {
      response.data = response.data.map(normalizeInboxEntry).sort(compareInboxEntriesDesc);

      // apply filters
      if (typeof req.query.unread != 'undefined') {
        const unreadFilter = req.query.unread == 'true';
        response.data = response.data.filter(entry => entry.unread == unreadFilter);
      }

      if (typeof req.query.since !== 'undefined') {
        const sinceEpoch = Date.parse(req.query.since);
        if (Number.isNaN(sinceEpoch)) {
          res.status(400).json({status: 400, error: 'Invalid since query parameter. Expected ISO-8601 datetime.'});
          return null;
        }

        response.data = response.data.filter((entry) => {
          if (!entry.receivedTimeIso) {
            return false;
          }
          return Date.parse(entry.receivedTimeIso) > sinceEpoch;
        });
      }

      if (typeof req.query.fingerprint !== 'undefined') {
        const pivotIndex = response.data.findIndex((entry) => entry.fingerprint === req.query.fingerprint);
        response.data = pivotIndex >= 0 ? response.data.slice(0, pivotIndex) : response.data;
      }

      if (req.query.unseenOnly == 'true') {
        response.data = response.data.filter((entry) => !seenInboxFingerprints.has(entry.fingerprint));
      }

      addToSeenCache(response.data);

      return response;
    })
    .then((response) => {
      if (!response) {
        return;
      }

      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

router.patch('/inbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadMarkRead = {
    method: TP_ACT.ACT_SET,
    controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
    attrs: {'unread': 0},
  };

  client.execute(payloadMarkRead)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

router.delete('/inbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadDelete = {
    method: TP_ACT.ACT_DEL,
    controller: TP_CONTROLLERS.LTE_SMS_RECVMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
  };

  client.execute(payloadDelete)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

router.get('/outbox', async function (req, res) {
  const client = req.app.get('router_client');

  client.execute([payloadResetOutboxCursor, payloadOutbox])
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

router.post('/outbox', async function (req, res) {
  if (typeof req.body.to == 'undefined' || typeof req.body.content == 'undefined') {
    res.status(400).json({status: 400, error: 'Missing required fields: to and content'});
    return;
  }

  const to = req.body.to;
  const content = req.body.content;

  // Validate phone number
  if (!isValidPhoneNumber(to)) {
    res.status(400).json({status: 400, error: 'Invalid phone number format'});
    return;
  }

  // Validate SMS content
  const contentValidation = validateSmsContent(content);
  if (!contentValidation.valid) {
    res.status(400).json({status: 400, error: contentValidation.error});
    return;
  }

  const client = req.app.get('router_client');

  const payloadSendSms = {
    method: TP_ACT.ACT_SET,
    controller: TP_CONTROLLERS.LTE_SMS_SENDNEWMSG,
    attrs: {
      'index': ROUTER_INDEX_DEFAULT,
      'to': to,
      'textContent': content.trim(),
    }
  };

  client.execute(payloadSendSms)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

router.delete('/outbox/:smsOrderNumber(\\d+)', async function (req, res) {
  const client = req.app.get('router_client');

  const smsOrderNumber = parseInt(req.params['smsOrderNumber']);

  const payloadDelete = {
    method: TP_ACT.ACT_DEL,
    controller: TP_CONTROLLERS.LTE_SMS_SENDMSGENTRY,
    stack: smsOrderNumber + ',0,0,0,0,0',
  };

  client.execute(payloadDelete)
    .then((response) => {
      res.json({status: 200, data: response.data});
    })
    .catch((exception) => {
      const sanitized = sanitizeError(exception);
      res.status(500).json({status: 500, error: sanitized.message});
    });
});

export default router;
