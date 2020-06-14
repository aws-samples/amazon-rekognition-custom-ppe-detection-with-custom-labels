// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const {
  ApiRequest,
} = require('./lib');

exports.handler = async (event, context) => {
  console.log(`
    event = ${JSON.stringify(event, null, 2)}
    context = ${JSON.stringify(context, null, 2)}`);

  const request = new ApiRequest(event, context);
  if (request.method === ApiRequest.Methods.OPTIONS) {
    return request.onOPTIONS().catch(e =>
      request.onError(e));
  }
  if (request.method === ApiRequest.Methods.GET) {
    return request.onGET().catch(e =>
      request.onError(e));
  }
  if (request.method === ApiRequest.Methods.POST) {
    return request.onPOST().catch(e =>
      request.onError(e));
  }
  throw new Error(`${request.method} not supported`);
};
