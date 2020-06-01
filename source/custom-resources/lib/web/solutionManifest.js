// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const MIME = require('mime');

const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class SolutionManifest extends mxBaseResponse(class {}) {
  constructor(event, context) {
    super(event, context);
    /* sanity check */
    if (!(event.ResourceProperties.Web || {}).Bucket) {
      throw new Error('missing Web.Bucket');
    }
    this.$web = event.ResourceProperties.Web;
    const data = event.ResourceProperties.Data;
    this.sanityCheck(data);
    this.$data = data;
    this.$data.S3.UseAccelerateEndpoint = data.S3.UseAccelerateEndpoint === 'true';
  }

  sanityCheck(data) {
    let missing = [
      'SolutionId',
      'Version',
      'StackName',
      'Region',
      'LastUpdated',
      'ApiEndpoint',
      'S3',
      'Cognito',
      'CustomLabels',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }
    missing = [
      'Bucket',
      'UseAccelerateEndpoint',
    ].filter(x => data.S3[x] === undefined);
    if (missing.length) {
      throw new Error(`missing S3.${missing.join(', ')}`);
    }
    missing = [
      'UserPoolId',
      'ClientId',
      'IdentityPoolId',
      'RedirectUri',
    ].filter(x => data.Cognito[x] === undefined);
    if (missing.length) {
      throw new Error(`missing Cognito.${missing.join(', ')}`);
    }
    missing = [
      'Name',
      'Arn',
    ].filter(x => data.CustomLabels.Project[x] === undefined);
    if (missing.length) {
      throw new Error(`missing CustomLabels.Project.${missing.join(', ')}`);
    }
  }

  get webBucket() {
    return this.$web.Bucket;
  }

  get data() {
    return this.$data;
  }

  static get Constants() {
    return {
      ManifestFilename: 'solution-manifest.js',
    };
  }

  get contentBucket() {
    return this.$contentBucket;
  }

  get manifest() {
    return this.$manifest;
  }

  /**
   * @function makeManifest
   * @description generate manifest content. These are the parameters that have to be provided
   * for web app to initially connect to the backend.
   */
  makeManifest() {
    return Buffer.from(`const SolutionManifest = ${JSON.stringify(this.data, null, 2)};\n\nexport default SolutionManifest;\n`);
  }

  /**
   * @function copyManifest
   * @description create and install solution-manifest.js
   */
  async copyManifest() {
    const key = SolutionManifest.Constants.ManifestFilename;
    const manifest = this.makeManifest();
    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      computeChecksums: true,
      signatureVersion: 'v4',
      s3DisableBodySigning: false,
    });
    return s3.putObject({
      Bucket: this.webBucket,
      Key: key,
      ContentType: MIME.getType(key),
      ServerSideEncryption: 'AES256',
      Body: manifest,
    }).promise();
  }

  /**
   * @function create
   * @description subscribe a list of emails to SNS topic
   */
  async create() {
    await this.copyManifest();
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
  SolutionManifest,
};
