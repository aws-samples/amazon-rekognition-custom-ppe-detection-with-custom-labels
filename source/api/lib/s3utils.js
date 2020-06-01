// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');

class S3Utils {
  static get Constants() {
    return {
      Expiration: 60 * 60 * 2,
    };
  }

  static getInstance(params) {
    return new AWS.S3({
      apiVersion: '2006-03-01',
      computeChecksums: true,
      signatureVersion: 'v4',
      s3DisableBodySigning: false,
      ...params,
    });
  }

  static signUrl(bucket, key) {
    return S3Utils.getInstance().getSignedUrl('getObject', {
      Bucket: bucket,
      Key: key,
      Expires: S3Utils.Constants.Expiration,
    });
  }

  static async getObject(bucket, key) {
    return S3Utils.getInstance().getObject({
      Bucket: bucket,
      Key: key,
    }).promise();
  }

  static async upload(bucket, key, body, options) {
    return S3Utils.getInstance().upload({
      Bucket: bucket,
      Key: key,
      Body: body,
      ...options,
    }).promise();
  }

  static async listObjects(bucket, prefix) {
    const collection = [];
    const s3 = S3Utils.getInstance();
    let response;
    do {
      response = await s3.listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 100,
        ContinuationToken: (response || {}).NextContinuationToken,
      }).promise();
      collection.splice(collection.length, 0, ...response.Contents);
    } while ((response || {}).NextContinuationToken);
    return collection;
  }

  static async selectS3Content(bucket, key, query) {
    return new Promise((resolve, reject) => {
      /* escape single quote character */
      const escaped = query.replace(/'/g, '\'\'');
      const s3 = S3Utils.getInstance();
      s3.selectObjectContent({
        Bucket: bucket,
        Key: key,
        ExpressionType: 'SQL',
        Expression: escaped,
        InputSerialization: {
          JSON: {
            Type: 'DOCUMENT',
          },
        },
        OutputSerialization: {
          JSON: {
            RecordDelimiter: ';',
          },
        },
      }, (e, response) => {
        if (e) {
          reject(e);
          return;
        }

        const stream = response.Payload;
        let payload = '';
        stream.on('error', e0 =>
          reject(e0));
        stream.on('end', () =>
          resolve(payload.split(';').filter(x => x).map(x => JSON.parse(x))));
        stream.on('data', (evt) => {
          if (evt.Records) {
            payload += evt.Records.Payload.toString();
          }
        });
      });
    });
  }
}

module.exports = {
  S3Utils,
};
