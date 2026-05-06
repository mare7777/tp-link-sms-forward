# MR600 UI Alignment

This project keeps the existing API bridge and polling design. It does not depend on the browser session to fetch SMS data.

## UI to API mapping

Starting point: the router home page after login.

Expected web flow:

1. Open `Advanced`
2. Open `SMS`
3. Open `Inbox`
4. Check rows whose status is `Unread`
5. Forward those messages to Telegram
6. Mark them as read only after Telegram delivery succeeds

Equivalent API behavior:

- Web UI `Inbox` maps to `GET /api/v1/sms/inbox`
- Web UI `Status = Unread` maps to `GET /api/v1/sms/inbox?unread=true`
- Successful Telegram delivery maps to `PATCH /api/v1/sms/inbox/:order`

## Polling behavior

`sms-cat.mjs` is the component that follows the UI semantics.

- It polls `GET /api/v1/sms/inbox?unread=true&unseenOnly=true`
- It resumes from the last processed cursor using `fingerprint` and `since`
- It sends only unread inbox messages to Telegram
- It keeps a message unread when Telegram delivery fails in `at_least_once` mode
- It marks a message as read only after the delivery step is treated as successful

## Verification checklist

Use this checklist when validating against the live router UI:

1. A new SMS appears in `Advanced > SMS > Inbox`
2. The same message is returned by `GET /api/v1/sms/inbox?unread=true`
3. `sms-cat.mjs` forwards it to Telegram
4. The message no longer appears as unread after the bridge marks it read
5. Already-read messages are not forwarded again

## Current constraint

The browser is used only for UI verification. The bridge does not read DOM content from the router page.
