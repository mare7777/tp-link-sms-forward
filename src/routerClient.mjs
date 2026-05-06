import Encryption from './routerEncryption.mjs'
import { TP_ACT, RouterProtocol } from './routerProtocol.mjs'
import { httpClient, isRetryableError } from './httpClient.mjs'
import logger from './logger.mjs'

/**
 * Enables communication with mr600 router
 */
class RouterClient {
  httpClient = httpClient;
  encryption = null;  // Will be instantiated per client
  protocol = new RouterProtocol();

  sessionId = null; // session is obtained via authentication and included in each request via cookie
  tokenId = null; // token is obtained after authenticated and included as its own http header

  constructor(url, login, password) {
    this.url = url;
    this.login = login;
    this.password = password;
    this.encryption = new Encryption();  // Create instance per client
  }

  get isAuthenticated() {
    return this.sessionId != null;
  }

  get isReady() {
    return this.tokenId != null;
  }

  /**
   * Perform actions to be fully authenticated an ready
   */
  connect() {
    return this.fetchEncryptionParams()
      // parse encryption data from params
      .then(response => this.parseEncryptionParams(response.data))
      // configure encryption with params
      .then(encryptionSettings => this.reconfigureEncryption(encryptionSettings))
      // authenticate with user / password
      .then(_ => this.authenticate())
      // extract and store session cookie
      .then(response => this.extractSessionIdFromAuthenticationResponse(response))
      // we need to fetch a token for remote command
      .then(_ => this.fetchTokenId())
      // extract and store token header
      .then(response => this.extractTokenIdFromResponse(response))
      .then(() => logger.info('api_bridge.connect.success'))
    ;
  }

  reset() {
    this.sessionId = null;
    this.tokenId = null;
  }

  fetchEncryptionParams() {
    // POST without data
    const parmUrl = this.url + '/cgi/getParm';
    return this.httpClient.post(parmUrl, null, {
      headers: {
        "Referer": this.url, // we need a referer to pass referer check
      },
      'axios-retry': {
        retries: 3, // i don't think there is a reason for this request to fail but anyway, we allow a retry
        retryCondition: isRetryableError,
      },
    });
  }

  /**
   * Parse encryption parameters form a getParm response
   *
   * @param {string} message Http response data from a call to getParm endpoint
   */
  parseEncryptionParams(message) {
    // extract encryption parameters from the kv payload
    const eeExtractor = /ee="(\d+)"/; // integer
    const nnExtractor = /nn="([0-9A-F]+)"/; // hex encoded
    const seqExtractor = /seq="(\d+)"/; // integer

    const eeFound = message.match(eeExtractor);
    const nnFound = message.match(nnExtractor);
    const seqFound = message.match(seqExtractor);

    const ee = eeFound[1]; // exponent
    const nn = nnFound[1]; // public key
    const seq = seqFound[1]; // sequence included in authentication signature

    logger.debug("Received encryption params", {ee, seq});  // Don't log full public key

    return {ee, nn, seq};
  }

  /**
   * Configure RSA encryption (for authentications) and generate local AES key (for remote commands encryption)
   *
   * @param {*} encryptionSettings 
   */
  reconfigureEncryption(encryptionSettings) {
    this.encryption.setSeq(encryptionSettings.seq);
    this.encryption.setRSAKey(encryptionSettings.nn, encryptionSettings.ee);
    this.encryption.genAESKey();

    // Only log in debug mode, never in production
    logger.debug("Encryption configured");
  }

  /**
   * Send authentication request to mr600
   */
  authenticate() {
    this.encryption.setHash(this.login, this.password);
    // generate auth payload
    const auth = this.encryption.AESEncrypt(this.login + '\n' + this.password, true); // true = encrypt as login
    logger.debug("Sending authentication request");  // Don't log encrypted payload

    const loginUrl = this.url + '/cgi/login?data=' + encodeURIComponent(auth.data) + '&sign=' + auth.sign + '&Action=1&LoginStatus=0';
    return this.httpClient.post(loginUrl, null, {
      headers: {
          "Referer": this.url, // we need a referer to pass referer check
      },
      'axios-retry': {
          retries: 3, // we want this request to be retried because occasionally router send a 500 when reconnecting after an expired session
          retryCondition: isRetryableError,
      },
    });
  }

  /**
   * Extract the cookie from response headers of an authentication response
   */
  extractSessionIdFromAuthenticationResponse(response) {
    const retCodeMatch = String(response.data).match(/\$\.ret=(\d+);/);
    if (!retCodeMatch || retCodeMatch[1] !== '0') {
      throw new Error(`Authentication rejected by router (ret=${retCodeMatch ? retCodeMatch[1] : 'unknown'})`);
    }

    const setCookieHeader = response.headers['set-cookie'][0];
    const sessionIdRegex = /JSESSIONID=([a-f0-9]+)/;
    const sessionIdMatch = setCookieHeader.match(sessionIdRegex);
    if (!sessionIdMatch) {
      throw new Error('Router did not return a valid session cookie');
    }
    this.sessionId = sessionIdMatch[1];
    logger.debug("Session cookie received");  // Don't log actual session ID
  }

  /**
   * Fetch token Id
   */
  fetchTokenId() {
    // fetch the homepage now that we have the cookie
    const homeUrl = this.url + "/";
    return this.httpClient.get(homeUrl, {
      headers: {
        "Referer": this.url, // we need a referer to pass referer check
        "Cookie": "loginErrorShow=1; JSESSIONID=" + this.sessionId, // JSESSIONID required to get the homepage with the tokenid
      },
    });
  }

  extractTokenIdFromResponse(response) {
    // extract token id from response content
    const tokenIdRegex = /var token="([a-f0-9]+)"/;
    this.tokenId = response.data.match(tokenIdRegex)[1];
    logger.debug("Token ID received");  // Don't log actual token
  }

  // encrypt the frame
  encryptDataFrame(dataFrame) {
    logger.debug('Encrypting: ', dataFrame);
    let stmp = this.encryption.AESEncrypt(dataFrame);
    return 'sign=' + stmp.sign + '\r\ndata=' + stmp.data + '\r\n';
  }

  async execute(request, allowReconnectionOnError = true) {
    // auto connect if not ready
    if (this.isReady === false) {
      await this.connect();
    }

    const dataFrame = this.protocol.makeDataFrame(request);
    const encryptedPayload = this.encryptDataFrame(dataFrame);
    
    const cgiUrl = this.url + "/cgi_gdpr";
    return this.httpClient.post(cgiUrl, encryptedPayload, {
      headers: {
        "Referer": this.url,
        "Cookie": "loginErrorShow=1; JSESSIONID=" + this.sessionId,
        "TokenID": this.tokenId,
        "Content-Type": 'text/plain',
      }
    }).then(response => {
      const decryptedPayload = this.encryption.AESDecrypt(response.data);
      const decodedPayload = this.protocol.fromDataFrame(decryptedPayload);
      return this.protocol.prettifyResponsePayload(decodedPayload);
    }).catch((exception) => {
      // highly possible we got logout by inactivity or admin logged himself on UI
      // when our token/cookie becomes invalid all our next commands give 500
      if (exception.message === 'Request failed with status code 500' && allowReconnectionOnError === true) {
        this.reset();
        return this.execute(request, false);
      } else {
        // chain
        throw exception;
      }
    });
  }

  disconnect() {
    const disconnectPayload = {
      method: TP_ACT.ACT_CGI,
      controller: '/cgi/logout',
    }
    
    return this.execute(disconnectPayload);
  }
}

export default RouterClient
