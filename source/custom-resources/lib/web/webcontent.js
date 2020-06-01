// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const HTTPS = require('https');
const URL = require('url');
const MIME = require('mime');
const ZIP = require('adm-zip');

const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class WebContent extends mxBaseResponse(class {}) {
  constructor(event, context) {
    super(event, context);
    /* sanity check */
    const data = event.ResourceProperties.Data;
    this.sanityCheck(data);

    this.$data = data;
    this.$data.packageUrl = URL.parse(`https://${data.Source.Bucket}.s3.amazonaws.com/${data.Source.Key}`);
  }

  sanityCheck(data) {
    let missing = [
      'SolutionId',
      'Source',
      'Destination',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
    missing = [
      'Bucket',
      'Key',
    ].filter(x => data.Source[x] === undefined);
    if (missing.length) {
      throw new Error(`missing Source.${missing.join(', ')}`);
    }
    missing = [
      'Bucket',
    ].filter(x => data.Destination[x] === undefined);
    if (missing.length) {
      throw new Error(`missing Destination.${missing.join(', ')}`);
    }
  }

  get data() {
    return this.$data;
  }

  get solutionId() {
    return this.$data.SolutionId;
  }

  get source() {
    return this.$data.Source;
  }

  get packageUrl() {
    return this.$data.packageUrl;
  }

  get destination() {
    return this.$data.Destination;
  }

  async downloadHTTP() {
    const promise = new Promise((resolve, reject) => {
      const buffers = [];

      const request = HTTPS.request(this.packageUrl, (response) => {
        response.on('data', chunk =>
          buffers.push(chunk));

        response.on('end', () => {
          if (response.statusCode >= 400) {
            reject(new Error(`${response.statusCode} ${response.statusMessage} ${this.packageUrl.format()}`));
            return;
          }
          resolve(Buffer.concat(buffers));
        });
      });

      request.on('error', e =>
        reject(e));

      request.end();
    });

    return promise;
  }

  async downloadS3() {
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      computeChecksums: true,
      signatureVersion: 'v4',
      s3DisableBodySigning: false,
    });
    return s3.getObject(this.source).promise();
  }

  async downloadPackage() {
    let response;
    try {
      response = await this.downloadS3();
      console.log(`Downloaded package via s3://${this.source.Bucket}/${this.source.Key}`);
      return response.Body;
    } catch (e) {
      console.log(`Failed to download package via s3://${this.source.Bucket}/${this.source.Key}. Try HTTP GET ${this.packageUrl.format()}`);
      response = await this.downloadHTTP();
      return response;
    }
  }

  async copyFiles(buffer) {
    const unzip = new ZIP(buffer);
    const files = [];
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      computeChecksums: true,
      signatureVersion: 'v4',
      s3DisableBodySigning: false,
    });
    const promises = unzip.getEntries().filter(x => !x.isDirectory).map((entry) => {
      files.push(entry.entryName);
      return s3.putObject({
        Bucket: this.destination.Bucket,
        Key: entry.entryName,
        ContentType: MIME.getType(entry.entryName),
        ServerSideEncryption: 'AES256',
        Body: unzip.readFile(entry.entryName),
      }).promise();
    });
    console.log(`copyFiles = ${JSON.stringify(files, null, 2)}`);
    const responses = await Promise.all(promises);
    if (responses.length !== files.length) {
      throw new Error(`mismatch # of files: ${responses.length}/${files.length}`);
    }
    return files;
  }

  /**
   * @function create
   * @description copy webapp to the web bucket
   */
  async create() {
    const files = await this.copyFiles(await this.downloadPackage());
    this.storeResponseData('Uploaded', files.length);
    this.storeResponseData('LastUpdated', new Date().toISOString());
    this.storeResponseData('Status', 'SUCCESS');
    return this.responseData;
  }

  /**
   * @function purge
   * @description not implememted (not needed)
   */
  async purge() {
    this.storeResponseData('Status', 'SKIPPED');
    return this.responseData;
  }
}

module.exports = {
  WebContent,
};
