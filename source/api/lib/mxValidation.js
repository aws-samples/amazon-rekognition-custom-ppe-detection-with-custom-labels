// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
const mxValidation = Base => class extends Base {
  testBucket(val = '') {
    return !(
      (val.length < 3 || val.length > 63)
      || /[^a-z0-9-.]/.test(val)
      || /^[^a-z0-9]/.test(val)
      || /\.{2,}/.test(val)
      || /^\d+.\d+.\d+.\d+$/.test(val)
    );
  }

  testUuid(val = '') {
    return /^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/.test(val);
  }

  testCognitoIdentityId(val = '') {
    return /^[a-z]{2,}-[a-z]{2,}-[0-9]{1}:[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$/.test(val);
  }

  testBase64JsonToken(val = '') {
    /* base64 token must be a JSON object */
    try {
      JSON.parse(Buffer.from(val, 'base64').toString());
      return true;
    } catch (e) {
      return false;
    }
  }

  testImageBlob(val = '') {
    return /^data:image\/(png|jpeg|jpg);base64,.{20,}/.test(val);
  }

  testS3Uri(val = '') {
    const {
      protocol,
      hostname: bkt,
    } = URL.parse(val);
    if (!bkt || !protocol || protocol.toLowerCase() !== 's3:') {
      return false;
    }
    return !(
      (bkt.length < 3 || bkt.length > 63)
      || /[^a-z0-9-.]/.test(bkt)
      || /^[^a-z0-9]/.test(bkt)
      || /\.{2,}/.test(bkt)
      || /^\d+.\d+.\d+.\d+$/.test(bkt)
    );
  }

  testEmailAddress(val = '') {
    return /^(([^<>()[\].,;:\s@"]+(\.[^<>()[\].,;:\s@"]+)*)|(".+"))@(([^<>()[\].,;:\s@"]+\.)+[^<>()[\].,;:\s@"]{2,})$/i.test(val);
  }

  testOperation(val = '') {
    return /^[a-zA-Z-]+$/.test(val);
  }

  testProjectArn(val = '') {
    return /^arn:aws:rekognition:[a-z\d-]+:\d{12}:project\/[a-zA-Z\d_-]+\/[a-zA-Z\d_-]+$/.test(val);
  }

  testProjectVersion(val = '') {
    return /^[a-zA-Z0-9_.-]+$/.test(val);
  }

  testProjectVersionArn(val = '') {
    return /^arn:aws:rekognition:[a-z\d-]+:\d{12}:project\/[a-zA-Z\d_-]+\/version\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(val);
  }
};

module.exports = {
  mxValidation,
};
