// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';

export class AWSConsoleS3 {
  static getS3Link(bucket, key) {
    return (key)
      ? `https://s3.console.aws.amazon.com/s3/object/${bucket}/${key}?region=${SolutionManifest.Region}`
      : `https://s3.console.aws.amazon.com/s3/buckets/${bucket}/?region=${SolutionManifest.Region}`;
  }
}

export class AWSConsoleRekogntion {
  static getDatasetLink(name) {
    return `https://${SolutionManifest.Region}.console.aws.amazon.com/rekognition/custom-labels#/datasets/${name}`;
  }

  static getProjectLink(name) {
    return `https://${SolutionManifest.Region}.console.aws.amazon.com/rekognition/custom-labels#/projects/${name}`;
  }

  static getModelLink(name, model) {
    return `https://${SolutionManifest.Region}.console.aws.amazon.com/rekognition/custom-labels#/projects/${name}/models/${model}`;
  }
}
