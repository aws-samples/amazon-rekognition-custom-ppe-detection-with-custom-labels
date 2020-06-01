// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

/**
 * @function PostUpdateBucketCORS
 * @param {object} event
 * @param {object} context
 */
exports.PostUpdateBucketCORS = async (event, context) => {
  const x0 = new X0(event, context);
  try {
    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }

    const data = event.ResourceProperties.Data;
    const missing = [
      'Bucket',
      'AllowedOrigins',
      'AllowedMethods',
      'AllowedHeaders',
      'ExposeHeaders',
      'MaxAgeSeconds',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }

    const s3 = new AWS.S3({
      apiVersion: '2006-03-01',
      computeChecksums: true,
      signatureVersion: 'v4',
      s3DisableBodySigning: false,
    });
    await s3.putBucketCors({
      Bucket: data.Bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: data.AllowedOrigins,
            AllowedMethods: data.AllowedMethods,
            AllowedHeaders: data.AllowedHeaders,
            ExposeHeaders: data.ExposeHeaders,
            MaxAgeSeconds: Number.parseInt(data.MaxAgeSeconds, 10),
          },
        ],
      },
    }).promise();
    x0.storeResponseData('Status', 'SUCCESS');
    return x0.responseData;
  } catch (e) {
    e.message = `PostUpdateBucketCORS: ${e.message}`;
    throw e;
  }
};
