// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  CloudFormationResponse,
} = require('./lib/shared/cfResponse');

exports.handler = async (event, context) => {
  console.log(`\nconst event = ${JSON.stringify(event, null, 2)};\nconst context = ${JSON.stringify(context, null, 2)}`);
  const cfn = new CloudFormationResponse(event, context);
  let response;
  try {
    const resource = event.ResourceType.split(':').pop();
    let handler;
    switch (resource) {
      /* rekognition */
      case 'CreateCustomLabelsProject':
        handler = require('./lib/rekognition').CreateCustomLabelsProject;
        break;
      /* s3 */
      case 'PostUpdateBucketCORS':
        handler = require('./lib/s3').PostUpdateBucketCORS;
        break;
      /* web */
      case 'CopyWebContent':
        handler = require('./lib/web').CopyWebContent;
        break;
      case 'PostCreateSolutionManifest':
        handler = require('./lib/web').PostCreateSolutionManifest;
        break;
      /* cognito */
      case 'CognitoRegisterUser':
        handler = require('./lib/cognito').CognitoRegisterUser;
        break;
      default:
        break;
    }
    if (!handler) {
      throw Error(`${resource} not implemented`);
    }
    response = await handler(event, context);
    console.log(`response = ${JSON.stringify(response, null, 2)}`);
    return cfn.send(response);
  } catch (e) {
    console.error(e);
    return cfn.send(e);
  }
};
