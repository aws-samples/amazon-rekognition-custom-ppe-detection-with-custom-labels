// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const AWS = require('aws-sdk');
const {
  mxBaseResponse,
} = require('../shared/mxBaseResponse');

class X0 extends mxBaseResponse(class {}) {}

/**
 * @function CognitoRegisterUser
 * @param {object} event
 * @param {object} context
 */
exports.CognitoRegisterUser = async (event, context) => {
  const x0 = new X0(event, context);
  try {
    if (x0.isRequestType('Delete')) {
      x0.storeResponseData('Status', 'SKIPPED');
      return x0.responseData;
    }

    const data = event.ResourceProperties.Data;
    const missing = [
      'UserPoolId',
      'Email',
    ].filter(x => data[x] === undefined);
    if (missing.length) {
      throw new Error(`missing ${missing.join(', ')}`);
    }

    const user = data.Email.split('@').shift();
    const cognito = new AWS.CognitoIdentityServiceProvider({
      apiVersion: '2016-04-18',
    });
    await cognito.adminCreateUser({
      UserPoolId: data.UserPoolId,
      Username: user,
      DesiredDeliveryMediums: [
        'EMAIL',
      ],
      UserAttributes: [
        {
          Name: 'email',
          Value: data.Email,
        },
        {
          Name: 'email_verified',
          Value: 'true',
        },
      ],
    }).promise();
    x0.storeResponseData('Username', user);
    x0.storeResponseData('Status', 'SUCCESS');
    return x0.responseData;
  } catch (e) {
    e.message = `CognitoRegisterUser: ${e.message}`;
    throw e;
  }
};
