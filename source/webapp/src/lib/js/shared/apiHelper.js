// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import AppUtils from './appUtils.js';
import DatasetHelper from '../mainView/tabControllers/training/dataset.js';

export default class ApiHelper {
  static get Endpoints() {
    return {
      Datasets: `${SolutionManifest.ApiEndpoint}/datasets`,
      Models: `${SolutionManifest.ApiEndpoint}/models`,
      Model: `${SolutionManifest.ApiEndpoint}/model`,
      Analyze: `${SolutionManifest.ApiEndpoint}/analyze`,
    };
  }

  static async startAnalysis(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Analyze, query, body);
  }

  static async getDatasets(query) {
    const bucket = SolutionManifest.S3.Bucket;
    const response = await AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Datasets, {
      ...query,
      bucket,
    });

    return Promise.all(response.map(x =>
      DatasetHelper.createDataset({
        ...x,
        bucket,
      }, true)));
  }

  static async createModelVersion(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Model, query, body);
  }

  static async startModelVersion(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Model, query, body);
  }

  static async stopModelVersion(body, query) {
    return AppUtils.authHttpRequest('POST', ApiHelper.Endpoints.Model, query, body);
  }

  static async getTrainingModels(query) {
    return AppUtils.authHttpRequest('GET', ApiHelper.Endpoints.Models, query);
  }
}
