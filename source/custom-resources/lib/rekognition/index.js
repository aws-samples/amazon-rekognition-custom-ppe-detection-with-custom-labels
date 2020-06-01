// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

/**
 * @function CreateCustomLabelsProject
 * @param {object} event
 * @param {object} context
 */
exports.CreateCustomLabelsProject = async (event, context) => {
  try {
    const x0 = new X0(event, context);
    const data = event.ResourceProperties.Data;
    if (!data.ProjectName) {
      throw new Error('ProjectName must be defined');
    }

    const params = {
      ProjectName: data.ProjectName,
    };
    x0.storeResponseData('Name', params.ProjectName);
    if (x0.isRequestType('Create')) {
      const instance = new AWS.Rekognition({
        apiVersion: '2016-06-27',
      });
      const response = await instance.createProject(params).promise().catch((e) => {
        if (e.code !== 'ResourceAlreadyExistsException') {
          throw e;
        }
      });
      x0.storeResponseData('Arn', response.ProjectArn);
      x0.storeResponseData('Status', 'SUCCESS');
    } else {
      x0.storeResponseData('Status', 'SKIPPED');
    }
    return x0.responseData;
  } catch (e) {
    e.message = `CreateProject: ${e.message}`;
    throw e;
  }
};
