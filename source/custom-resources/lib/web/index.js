// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

/**
 * @function CopyWebContent
 * @param {object} event
 * @param {object} context
 */
exports.CopyWebContent = async (event, context) => {
  try {
    const {
      WebContent,
    } = require('./webcontent');
    const web = new WebContent(event, context);
    return web.isRequestType('Delete')
      ? web.purge()
      : web.create();
  } catch (e) {
    e.message = `CopyWebContent: ${e.message}`;
    throw e;
  }
};

/**
 * @function PostCreateSolutionManifest
 * @param {object} event
 * @param {object} context
 */
exports.PostCreateSolutionManifest = async (event, context) => {
  try {
    const {
      SolutionManifest,
    } = require('./solutionManifest');
    const manifest = new SolutionManifest(event, context);
    return manifest.isRequestType('Delete')
      ? manifest.purge()
      : manifest.create();
  } catch (e) {
    e.message = `PostCreateSolutionManifest: ${e.message}`;
    throw e;
  }
};
