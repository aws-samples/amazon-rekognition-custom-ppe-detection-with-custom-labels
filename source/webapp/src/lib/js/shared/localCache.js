// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import S3Utils from './s3utils.js';

export default class LocalCache {
  constructor(tableName) {
    this.monkeyPatch();
    this.$tableName = tableName || LocalCache.Constants.Database.Table;
    this.$db = undefined;
  }

  static getSingleton() {
    if (!(window.AWSomeNamespace || {}).LocalCacheSingleton) {
      window.AWSomeNamespace = {
        ...window.AWSomeNamespace,
        LocalCacheSingleton: new LocalCache(),
      };
    }
    return window.AWSomeNamespace.LocalCacheSingleton;
  }

  static get Constants() {
    return {
      Database: {
        Name: 'custom-ppe-detection',
        Table: 'settings',
        Version: 1,
      },
    };
  }

  get db() {
    return this.$db;
  }

  set db(val) {
    this.$db = val;
  }

  get tableName() {
    return this.$tableName;
  }

  isSupported() {
    return !!window.indexedDB;
  }

  monkeyPatch() {
    /* remove cross-browser prefixing */
    if (!window.indexedDB) {
      window.indexedDB = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
    }
    if (!window.IDBTransaction) {
      window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
    }
    if (!window.IDBKeyRange) {
      window.IDBKeyRange = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    }
  }

  async open() {
    if (!this.isSupported()) {
      throw new Error('indexedDB not supported');
    }
    if (this.db) {
      return this.db;
    }
    this.db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(LocalCache.Constants.Database.Name, LocalCache.Constants.Database.Version);
      request.onerror = (e) => {
        console.error(e);
        reject(e);
      };

      request.onsuccess = () =>
        resolve(request.result);

      request.onupgradeneeded = event =>
        event.target.result.createObjectStore(this.tableName);
    });
    return this.db;
  }

  async close() {
    if (!this.db) {
      return;
    }
    this.db.close();
    this.db = undefined;
  }

  async openStore(rw = 'readwrite') {
    if (!this.db) {
      await this.open();
    }
    return this.db.transaction([this.tableName], rw).objectStore(this.tableName);
  }

  async getItem(key) {
    const store = await this.openStore()
      .catch(e => undefined);
    return (!store)
      ? undefined
      : new Promise((resolve) => {
        const request = store.get(key);
        request.onerror = (e) => {
          console.error(`getItem.onerror: ${e.message}`);
          resolve(undefined);
        };
        request.onsuccess = event =>
          resolve(event.target.result);
      });
  }

  async putItem(key, blob) {
    const store = await this.openStore()
      .catch(e => undefined);
    return (!store)
      ? undefined
      : new Promise((resolve) => {
        const request = store.put(blob, key);
        request.onerror = (e) => {
          console.error(`putItem.onerror: ${e.message}`);
          resolve(undefined);
        };
        request.onsuccess = event =>
          resolve(event.target.result);
      });
  }

  async getImageURL(id, params) {
    let blob = await this.getItem(id);
    if (!blob) {
      blob = params.url
        ? await this.getImageHttp(params.url)
        : await this.getImageS3(params.bucket, params.key);
      await this.putItem(id, blob);
    }
    return URL.createObjectURL(blob);
  }

  async getImageS3(bucket, key) {
    const response = await S3Utils.getObject(bucket, key);
    return new Blob([response.Body.buffer], {
      type: response.ContentType,
    });
  }

  async getImageHttp(url) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';
      xhr.onload = (response) => {
        if (xhr.status === 200) {
          resolve(xhr.response);
        } else if (xhr >= 400) {
          reject(new Error(`${xhr.status} - ${xhr.responseURL}`));
        }
      };
      xhr.onerror = () => resolve(false);
      xhr.onabort = e => reject(e);
      return xhr.send();
    });
  }
}
