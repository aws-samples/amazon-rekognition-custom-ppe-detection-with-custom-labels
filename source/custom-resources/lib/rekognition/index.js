// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

async function findProject(projectName) {
  let response;
  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  do {
    response = await rekog.describeProjects({
      MaxResults: 20,
      NextToken: (response || {}).NextToken,
    }).promise();

    const project = response.ProjectDescriptions.find(x =>
      x.ProjectArn.split('/')[1] === projectName);
    if (project) {
      return project;
    }
  } while ((response || {}).NextToken);
  return undefined;
}

async function createProject(projectName) {
  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  return rekog.createProject({
    ProjectName: projectName,
  }).promise().catch((e) => {
    if (e.code === 'ResourceAlreadyExistsException') {
      return findProject(projectName);
    }
    throw e;
  });
}

async function stopProjectVersions(projectName) {
  const project = await findProject(projectName);
  if (!project) {
    return undefined;
  }

  let response;
  const rekog = new AWS.Rekognition({
    apiVersion: '2016-06-27',
  });
  do {
    response = await rekog.describeProjectVersions({
      ProjectArn: project.ProjectArn,
      MaxResults: 20,
      NextToken: (response || {}).NextToken,
    }).promise();
    await Promise.all(response.ProjectVersionDescriptions.map(x =>
      rekog.stopProjectVersion({
        ProjectVersionArn: x.ProjectVersionArn,
      }).promise().catch(e => e)));
  } while ((response || {}).NextToken);
  return response;
}

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
    x0.storeResponseData('Name', data.ProjectName);

    if (x0.isRequestType('Create')) {
      const response = await createProject(data.ProjectName);
      x0.storeResponseData('Arn', response.ProjectArn);
      x0.storeResponseData('Status', 'SUCCESS');
    } else if (x0.isRequestType('Delete')) {
      // stop any running models
      await stopProjectVersions(data.ProjectName);
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
