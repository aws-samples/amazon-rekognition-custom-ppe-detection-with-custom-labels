// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const PATH = require('path');
const {
  Jimp,
} = require('image-utils');

const {
  S3Utils,
} = require('./s3utils');

const {
  mxValidation,
} = require('./mxValidation');

class ApiRequest extends mxValidation(class {}) {
  constructor(event, context) {
    super();
    this.$event = event;
    this.$context = context;
    this.$accountId = context.invokedFunctionArn.split(':')[4];
    const identity = ((event.requestContext || {}).identity || {}).cognitoIdentityId
      || (event.queryStringParameters || {}).requester;
    this.$cognitoIdentityId = (identity)
      ? decodeURIComponent(identity)
      : undefined;

    try {
      this.$body = JSON.parse(this.$event.body);
    } catch (e) {
      this.$body = {};
    }
  }

  static get Methods() {
    return {
      OPTIONS: 'OPTIONS',
      GET: 'GET',
      POST: 'POST',
    };
  }

  static get Constants() {
    return {
      AllowMethods: Object.values(ApiRequest.Methods),
      AllowHeaders: [
        'Authorization',
        'Host',
        'Content-Type',
        'X-Amz-Date',
        'X-Api-Key',
        'X-Amz-Security-Token',
        'x-amz-content-sha256',
        'x-amz-user-agent',
      ],
      Manifest: 'manifests/output/output.manifest',
      ManifestJson: 'manifests/output/output.manifest.json',
      Label: {
        HasVest: 'vest',
        NoVest: 'novest',
      },
    };
  }

  static get Operations() {
    return {
      Datasets: 'datasets',
      Models: 'models',
      Model: 'model',
      Analyze: 'analyze',
    };
  }

  static get Actions() {
    return {
      Model: {
        Create: 'create',
        Start: 'start',
        Stop: 'stop',
      },
    };
  }

  get event() {
    return this.$event;
  }

  get context() {
    return this.$context;
  }

  get accountId() {
    return this.$accountId;
  }

  get cognitoIdentityId() {
    return this.$cognitoIdentityId;
  }

  get method() {
    return this.event.httpMethod;
  }

  get path() {
    return this.event.path;
  }

  get headers() {
    return this.event.headers;
  }

  get queryString() {
    return this.event.queryStringParameters;
  }

  get pathParameters() {
    return this.event.pathParameters;
  }

  get body() {
    return this.$body;
  }

  opSupported() {
    const op = (this.pathParameters || {}).operation;
    if (!this.testOperation(op)) {
      return false;
    }
    return !!(Object.values(ApiRequest.Operations)
      .find(x => x === op));
  }

  validateIdentity() {
    return !(this.cognitoIdentityId && !this.testCognitoIdentityId(this.cognitoIdentityId));
  }

  async onOPTIONS() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    return this.onSucceeded();
  }

  async onGET() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    const op = this.pathParameters.operation;
    if (op === ApiRequest.Operations.Datasets) {
      return this.onGetDatasets();
    }
    if (op === ApiRequest.Operations.Models) {
      return this.onGetModels();
    }
    if (op === ApiRequest.Operations.Model) {
      return this.onGetModel();
    }
    if (op === ApiRequest.Operations.Analyze) {
      return this.onGetAnalysis();
    }
    throw new Error('operation not supported');
  }

  async onPOST() {
    if (!this.validateIdentity()) {
      throw new Error('invalid user id');
    }
    if (!this.opSupported()) {
      throw new Error('operation not supported');
    }
    const op = this.pathParameters.operation;
    if (op === ApiRequest.Operations.Datasets) {
      return this.onPostDatasets();
    }
    if (op === ApiRequest.Operations.Model) {
      return this.onPostModel();
    }
    if (op === ApiRequest.Operations.Analyze) {
      return this.onPostAnalysis();
    }
    throw new Error('operation not supported');
  }

  async onSucceeded(payload) {
    return {
      statusCode: 200,
      headers: this.getCORS(payload),
      body: (!payload || typeof payload === 'string')
        ? payload
        : JSON.stringify(payload),
    };
  }

  async onError(e) {
    const payload = {
      ErrorMessage: `${this.method} ${this.path} - ${e.message || e.code || 'unknown error'}`,
    };
    console.error(e);
    return {
      statusCode: 400,
      headers: this.getCORS(payload),
      body: payload,
    };
  }

  getCORS(data) {
    const h0 = this.headers || {};
    return {
      'Content-Type': (!data || typeof data === 'string')
        ? 'text/plain'
        : 'application/json',
      'Access-Control-Allow-Methods': ApiRequest.Constants.AllowMethods.join(', '),
      'Access-Control-Allow-Headers': ApiRequest.Constants.AllowHeaders.join(', '),
      'Access-Control-Allow-Origin': h0.Origin || h0.origin || h0['X-Forwarded-For'] || '*',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  async onGetDatasets() {
    const bucket = (this.queryString || {}).bucket;
    if (!this.testBucket(bucket)) {
      throw new Error('invalid bucket');
    }
    return this.onSucceeded(await this.getRelevantDatasets(bucket));
  }

  async onGetModels() {
    let arn = (this.queryString || {}).arn;
    if (!arn) {
      throw new Error('missing arn');
    }
    arn = decodeURIComponent(arn);
    if (!this.testProjectArn(arn)) {
      throw new Error('invalid arn');
    }

    let modelVersion = (this.queryString || {}).modelVersion;
    if (modelVersion) {
      modelVersion = decodeURIComponent(modelVersion);
      if (!this.testProjectVersion(modelVersion)) {
        throw new Error('invalid modelVersion');
      }
    }
    return this.onSucceeded(await this.describeProjectVersions(arn, modelVersion));
  }

  async onGetModel() {
    throw new Error('operation not supported');
  }

  async onGetAnalysis() {
    throw new Error('operation not supported');
  }

  async onPostDatasets() {
    throw new Error('operation not supported');
  }

  async onPostModel() {
    const data = this.body || {};
    if (data.action === ApiRequest.Actions.Model.Create) {
      return this.onCreateNewModel();
    }
    if (data.action === ApiRequest.Actions.Model.Start) {
      return this.onStartModel();
    }
    if (data.action === ApiRequest.Actions.Model.Stop) {
      return this.onStopModel();
    }
    throw new Error('action not supported');
  }

  async onCreateNewModel() {
    const data = this.body || {};
    if (!data.arn || !data.training || !data.testing) {
      throw new Error('invalid input');
    }
    if (!data.training.bucket || !data.training.key) {
      throw new Error('invalid training input');
    }
    if (!((data.testing.bucket && data.testing.key)
    || data.testing.autoCreate !== undefined)) {
      throw new Error('invalid testing input');
    }
    if (!this.testProjectArn(data.arn)) {
      throw new Error('invalid arn');
    }
    if (!this.testBucket(data.training.bucket)) {
      throw new Error('invalid bucket');
    }
    if (data.testing.bucket && !this.testBucket(data.training.bucket)) {
      throw new Error('invalid bucket');
    }
    if (data.testing.autoCreate !== undefined && typeof data.testing.autoCreate !== 'boolean') {
      throw new Error('invalid testing param');
    }
    const params = this.makeProjectVersionParams(data);
    return this.onSucceeded(await this.createProjectVersion(params));
  }

  async onStartModel() {
    const data = this.body || {};
    if (!data.arn) {
      throw new Error('invalid input');
    }
    if (!this.testProjectVersionArn(data.arn)) {
      throw new Error('invalid arn');
    }
    if (data.inference && typeof data.inferences !== 'number') {
      throw new Error('invalid inference');
    }
    return this.onSucceeded(await this.startProjectVersion({
      ProjectVersionArn: data.arn,
      MinInferenceUnits: data.inference || 1,
    }));
  }

  async onStopModel() {
    const data = this.body || {};
    if (!data.arn) {
      throw new Error('invalid input');
    }
    if (!this.testProjectVersionArn(data.arn)) {
      throw new Error('invalid arn');
    }
    return this.onSucceeded(await this.stopProjectVersion({
      ProjectVersionArn: data.arn,
    }));
  }

  async onPostAnalysis() {
    const data = this.body;
    if (!(data.bucket && data.key)) {
      throw new Error('\'bucket\' and \'key\' must be specified');
    }

    if (!this.testBucket(data.bucket)) {
      throw new Error('invalid bucket');
    }

    const image = await this.loadImage(data.bucket, data.key);

    let response = await this.detectLabels(image);
    if ((this.queryString || {}).labelOnly !== 'true') {
      const arn = data.arn || process.env.ENV_CUSTOM_LABEL_MODEL_ARN;
      response = await this.batchDetectCustomLabelsVest(image, arn, response);
    }

    const parsed = PATH.parse(data.key);
    const key = PATH.join(parsed.dir, `${parsed.name}.json`);
    await this.upload(data.bucket, key, response, 'application/json');
    return this.onSucceeded(response);
  }

  async loadImage(bucket, key) {
    const buffer = (await S3Utils.getObject(bucket, key)).Body;
    const image = await new Promise((resolve) => {
      Jimp.read(buffer)
        .then(img => resolve(img))
        .catch(e => resolve(e));
    });
    if (image instanceof Error) {
      throw new Error(image);
    }
    return image;
  }

  async detectLabels(image) {
    const scaleW = (image.bitmap.width > 1920)
      ? 1920 / image.bitmap.width
      : 1;
    const scaleH = (image.bitmap.height > 1080)
      ? 1080 / image.bitmap.height
      : 1;
    const scale = Math.min(scaleW, scaleH);
    const downscaled = await image.clone().scale(scale).getBufferAsync(Jimp.MIME_PNG);

    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.detectLabels({
      Image: {
        Bytes: downscaled,
      },
      MaxLabels: 100,
      MinConfidence: 70,
    }).promise();
  }

  async batchDetectCustomLabelsVest(image, arn, data) {
    const persons = data.Labels.filter(label => label.Name === 'Person');
    let w = 0, h = 0, x = 0, y = 0;
    for (let i = 0; i < persons.length; i++) {
      for (let j = 0; j < persons[i].Instances.length; j++) {
        const item = persons[i].Instances[j];
        // strange: has been boundingbox with negative value
        item.BoundingBox.Left = item.BoundingBox.Left < 0
          ? 0
          : item.BoundingBox.Left;
        item.BoundingBox.Top = item.BoundingBox.Top < 0
          ? 0
          : item.BoundingBox.Top;
        w = Math.floor(item.BoundingBox.Width * image.bitmap.width);
        h = Math.floor(item.BoundingBox.Height * image.bitmap.height);
        x = Math.floor(item.BoundingBox.Left * image.bitmap.width);
        y = Math.floor(item.BoundingBox.Top * image.bitmap.height);
        // prevent out of bound
        if ((w + x) > image.bitmap.width) {
          w = image.bitmap.width - x;
        }
        if ((h + y) > image.bitmap.height) {
          h = image.bitmap.height - y;
        }
        console.log(`${image.bitmap.width} x ${image.bitmap.height} = ${w},${h},${x},${y}`);

        const cropped = image.clone().crop(x, y, w, h);
        const result = await this.detectCustomLabels(cropped, arn).catch(() => undefined);
        // merge result to the response
        if (result && result.CustomLabels) {
          const customLabel = result.CustomLabels.shift();
          if (customLabel) {
            item.HasVest = {
              Value: customLabel.Name === ApiRequest.Constants.Label.HasVest,
              Confidence: customLabel.Confidence,
            };
          }
        }
      }
    }
    return data;
  }

  async detectCustomLabels(image, arn) {
    console.log(`detectCustomLabels: ${image.bitmap.width} x ${image.bitmap.height}`);

    // min. 64x64 pixels
    const scaleW = (image.bitmap.width < 64)
      ? 64 / image.bitmap.width
      : 1;
    const scaleH = (image.bitmap.height < 64)
      ? 64 / image.bitmap.height
      : 1;
    const scale = Math.max(scaleW, scaleH);
    const buffer = await image.scale(scale).getBufferAsync(Jimp.MIME_JPEG);
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.detectCustomLabels({
      Image: {
        Bytes: buffer,
      },
      ProjectVersionArn: arn,
    }).promise().catch((e) => {
      console.error(e);
      throw e;
    });
  }

  async upload(bucket, key, data, mime) {
    const options = (mime)
      ? {
        ContentType: mime,
      }
      : undefined;
    const body = (typeof data === 'string')
      ? data
      : JSON.stringify(data, null, 2);
    return S3Utils.upload(bucket, key, body, options);
  }

  async getRelevantDatasets(bucket) {
    const s3 = S3Utils.getInstance();
    const response = await s3.listObjectsV2({
      Bucket: bucket,
      Delimiter: '/',
      Prefix: 'datasets/',
      MaxKeys: 100,
    }).promise();

    console.log(JSON.stringify(response.CommonPrefixes, null, 2));
    const responses = await Promise.all((response.CommonPrefixes || []).map(x =>
      this.checkDatasetManifest(bucket, x.Prefix)));
    return responses.filter(x => x);
  }

  async checkDatasetManifest(bucket, prefix) {
    console.log(`${bucket} ${prefix}`);
    const manifest = PATH.join(prefix, ApiRequest.Constants.Manifest);
    const manifestJson = PATH.join(prefix, ApiRequest.Constants.ManifestJson);
    const sql = 'select count(*) as total from s3object[*] s';
    const responses = await Promise.all([
      S3Utils.getObject(bucket, manifestJson).catch(e => e),
      S3Utils.selectS3Content(bucket, manifest, sql).catch(e => e),
    ]);

    if (responses[0] instanceof Error) {
      responses[0].message = `(${manifestJson}) ${responses[0].message}`;
      console.error(responses[0]);
      return undefined;
    }
    if (responses[1] instanceof Error) {
      responses[1].message = `(${manifest}) ${responses[1].message}`;
      console.error(responses[1]);
      return undefined;
    }

    const parsed = JSON.parse(responses[0].Body);
    const labels = ((parsed || {}).labels || []).map(x => x.label);
    if (labels.findIndex(x => x === ApiRequest.Constants.Label.HasVest) < 0
    || labels.findIndex(x => x === ApiRequest.Constants.Label.NoVest) < 0) {
      return undefined;
    }

    const total = (responses[1].shift() || {}).total;
    if (!total) {
      return undefined;
    }

    const name = prefix.split('/').filter(x => x).pop();
    return {
      name,
      manifest,
      total,
    };
  }

  makeProjectVersionParams(data) {
    const testAssets = data.testing.autoCreate
      ? []
      : [{
        GroundTruthManifest: {
          S3Object: {
            Bucket: data.testing.bucket,
            Name: data.testing.key,
          },
        },
      }];

    let prefix = PATH.parse(data.training.key).dir;
    prefix = prefix.substring(prefix.indexOf('/') + 1, prefix.length);
    prefix = PATH.join('evaluation', prefix);

    return {
      ProjectArn: data.arn,
      VersionName: new Date().toISOString().replace(/[-:.]/g, ''),
      TrainingData: {
        Assets: [
          {
            GroundTruthManifest: {
              S3Object: {
                Bucket: data.training.bucket,
                Name: data.training.key,
              },
            },
          },
        ],
      },
      TestingData: {
        AutoCreate: data.testing.autoCreate,
        Assets: testAssets,
      },
      OutputConfig: {
        S3Bucket: data.training.bucket,
        S3KeyPrefix: prefix,
      },
    };
  }

  async createProjectVersion(params) {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.createProjectVersion(params).promise();
  }

  async startProjectVersion(params) {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.startProjectVersion(params).promise();
  }

  async stopProjectVersion(params) {
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    return rekog.stopProjectVersion(params).promise();
  }

  async describeProjectVersions(arn, modelVersion) {
    const models = [];
    let response;
    const rekog = new AWS.Rekognition({
      apiVersion: '2016-06-27',
    });
    do {
      response = await rekog.describeProjectVersions({
        ProjectArn: arn,
        VersionNames: modelVersion
          ? [modelVersion]
          : undefined,
        NextToken: (response || {}).NextToken,
      }).promise();
      models.splice(models.length, 0, ...response.ProjectVersionDescriptions);
    } while ((response || {}).NextToken);
    return models;
  }
}

module.exports = {
  ApiRequest,
};
