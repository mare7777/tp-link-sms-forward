import logger from './logger.mjs'

const TELEGRAM_API_BASE_URL = 'https://api.telegram.org'

function maskFrom(from) {
  if (!from) return 'unknown'
  const value = String(from)
  if (value.length <= 4) return value
  return `${value.slice(0, 2)}***${value.slice(-2)}`
}

export default class TelegramClient {
  constructor(config = {}) {
    this.enabled = Boolean(config.telegram_enabled)
    this.botToken = config.telegram_bot_token
    this.chatId = config.telegram_chat_id
    this.maxRetries = config.telegram_max_retries ?? 3
    this.initialBackoffMs = config.telegram_retry_initial_backoff_ms ?? 1000
    this.maxBackoffMs = config.telegram_retry_max_backoff_ms ?? 10000
    this.timeoutMs = config.telegram_timeout_ms ?? 10000
  }

  canSend() {
    if (!this.enabled) {
      return false
    }

    if (!this.botToken || !this.chatId) {
      logger.notice('Telegram enabled but missing token/chat_id; skip sending')
      return false
    }

    return true
  }

  async sendSmsNotification(sms, context = {}) {
    if (!this.canSend()) {
      return { sent: false, skipped: true }
    }

    let attempt = 0
    let lastError

    while (attempt <= this.maxRetries) {
      try {
        await this.sendOnce(sms)
        logger.info('Telegram sent', {
          order: context.order,
          from: maskFrom(sms.from),
          attempt: attempt + 1,
        })
        return { sent: true }
      } catch (error) {
        lastError = error
        attempt += 1
        if (attempt > this.maxRetries) {
          break
        }

        const backoff = Math.min(this.initialBackoffMs * (2 ** (attempt - 1)), this.maxBackoffMs)
        logger.notice('Telegram send failed, retry scheduled', {
          order: context.order,
          from: maskFrom(sms.from),
          attempt,
          retryInMs: backoff,
          error: error.message,
        })
        await new Promise(resolve => setTimeout(resolve, backoff))
      }
    }

    logger.error('Telegram send failed after retries', {
      order: context.order,
      from: maskFrom(sms.from),
      attempts: attempt,
      error: lastError?.message,
    })
    return { sent: false, skipped: false, error: lastError }
  }

  async sendOnce(sms) {
    const endpoint = `${TELEGRAM_API_BASE_URL}/bot${this.botToken}/sendMessage`
    const text = this.buildMessage(sms)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: this.chatId,
        text,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!response.ok) {
      const bodyText = await response.text()
      throw new Error(`Telegram API ${response.status}: ${bodyText.slice(0, 300)}`)
    }

    const body = await response.json()
    if (!body.ok) {
      throw new Error(`Telegram API error: ${body.description || 'unknown error'}`)
    }
  }

  buildMessage(sms) {
    return [
      '[Router SMS]',
      `From: ${sms.from}`,
      `Received: ${sms.receivedTime}`,
      '',
      sms.content,
    ].join('\n')
  }
}
