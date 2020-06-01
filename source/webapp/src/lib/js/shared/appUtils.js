// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import mxReadable from '../mixins/mxReadable.js';
import SigV4Client from './signer.js';

export default class AppUtils extends mxReadable(class {}) {
  static signRequest(method, endpoint, path, query, body) {
    const signer = new SigV4Client({
      accessKey: AWS.config.credentials.accessKeyId,
      secretKey: AWS.config.credentials.secretAccessKey,
      sessionToken: AWS.config.credentials.sessionToken,
      region: AWS.config.region,
      serviceName: 'execute-api',
      endpoint,
    });

    const response = signer.signRequest({
      method,
      path,
      headers: {
        'Content-Type': 'application/json',
      },
      queryParams: query,
      body: (typeof body === 'string') ? body : JSON.stringify(body),
    });

    return response;
  }

  static async authHttpRequest(method, endpoint, query = {}, body = '') {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();

      const {
        url, headers,
      } = AppUtils.signRequest(method, endpoint, '', query, body);

      request.open(method, url, true);

      Object.keys(headers).forEach((x) => {
        request.setRequestHeader(x, headers[x]);
      });

      request.withCredentials = false;

      request.onerror = e =>
        reject(new Error(`${request.status || 'Error'} - ${method} ${request.responseURL || endpoint}`));

      request.onabort = e =>
        reject(new Error(`${request.status || 'Error'} - ${method} ${request.responseURL || endpoint}`));

      request.onreadystatechange = () => {
        if (request.readyState === XMLHttpRequest.DONE) {
          if (request.status === 200) {
            resolve(JSON.parse(request.responseText));
          } else if (request.status >= 400) {
            reject(new Error(`${request.status || 'Error'} - ${method} ${request.responseURL || endpoint}`));
          }
        }
      };

      request.send((typeof body === 'string')
        ? body
        : JSON.stringify(body));
    });
  }

  static sanitize(str) {
    return str.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  static async pause(duration = 0) {
    return new Promise(resolve => setTimeout(() => resolve(), duration));
  }

  static uuid4(str) {
    const s0 = (str || CryptoJS.lib.WordArray.random(16)).toString();
    const matched = s0.match(/([0-9a-fA-F]{8})([0-9a-fA-F]{4})([0-9a-fA-F]{4})([0-9a-fA-F]{4})([0-9a-fA-F]{12})/);
    if (!matched) {
      throw new Error(`failed to generate uuid from '${s0}'`);
    }
    matched.shift();
    return matched.join('-').toLowerCase();
  }

  static randomHexstring() {
    const rnd = new Uint32Array(1);
    (window.crypto || window.msCrypto).getRandomValues(rnd);
    return rnd[0].toString(16);
  }

  static randomNumber(max = 1000, min = 0) {
    return Math.floor((Math.random() * (max - min + 1)) + min);
  }
}
