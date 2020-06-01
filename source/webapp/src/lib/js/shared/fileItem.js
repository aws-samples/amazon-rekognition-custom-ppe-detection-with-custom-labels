// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import AppUtils from './appUtils.js';
import S3Utils from './s3utils.js';

class BaseFile {
  constructor(name, group) {
    this.$fileId = `file-${AppUtils.randomHexstring()}`;
    this.$displayName = name;
    this.$bucket = SolutionManifest.S3.Bucket;
    let trimmed = name.replace(/^\/*/g, '');
    this.$key = (group)
      ? [
        group.replace(/^\/*|\/*$/g, ''),
        trimmed,
      ].join('/')
      : [
        this.$fileId,
        trimmed,
      ].join('/');
    trimmed = trimmed.substring(trimmed.lastIndexOf('/') + 1);
    this.$basename = trimmed.substring(0, trimmed.lastIndexOf('.'));
  }

  static get Constants() {
    return {
      Multipart: {
        PartSize: 5 * 1024 * 1024,
        MaxConcurrentUpload: 4,
      },
    };
  }

  static get Events() {
    return {
      File: {
        Remove: 'file:remove',
      },
    };
  }

  get displayName() {
    return this.$displayName;
  }

  get fileId() {
    return this.$fileId;
  }

  get bucket() {
    return this.$bucket;
  }

  set bucket(val) {
    this.$bucket = val;
  }

  get key() {
    return this.$key;
  }

  set key(val) {
    this.$key = val;
  }

  get basename() {
    return this.$basename;
  }

  static canSupport(file) {
    if (!file) {
      return false;
    }
    if (typeof file === 'string') {
      const ext = file.substring(file.lastIndexOf('.'), file.length).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png';
    }
    const mime = (file || {}).type || (file || {}).mime;
    if (mime) {
      return mime === 'image/jpeg' || mime === 'image/png';
    }
    return BaseFile.canSupport((file || {}).name || (file || {}).key);
  }
}

export default class FileItem extends BaseFile {
  constructor(name, file, group) {
    super(name, group);
    this.$file = file;
    this.$dataUrl = undefined;
    this.$thumbnail = undefined;
    this.$analysis = undefined;
    this.$metric = undefined;
    this.$labels = [];
  }

  get file() {
    return this.$file;
  }

  get dataUrl() {
    return this.$dataUrl;
  }

  set dataUrl(val) {
    this.$dataUrl = val;
  }

  get thumbnail() {
    return this.$thumbnail;
  }

  set thumbnail(val) {
    this.$thumbnail = val;
  }

  get analysis() {
    return this.$analysis;
  }

  set analysis(val) {
    this.$analysis = val;
  }

  get metric() {
    return this.$metric;
  }

  set metric(val) {
    this.$metric = val;
  }

  get labels() {
    return this.$labels;
  }

  set labels(val) {
    this.$labels = val;
  }

  setAnalysis(val) {
    this.analysis = val;
  }

  setMetric(metric) {
    this.metric = {
      ...metric,
    };
  }

  signUrl() {
    return S3Utils.signUrl(this.bucket, this.key);
  }

  signJsonOutUrl() {
    const replaced = this.key.substring(0, this.key.lastIndexOf('.'));
    return S3Utils.signUrl(this.bucket, `${replaced}.json`);
  }

  async createCard(w = 96, h = 96) {
    if (!this.thumbnail) {
      await this.getDataUrl();
    }
    const image = $('<div/>').addClass('ml-1 mb-1 img-card')
      .css('background-image', `url("${this.thumbnail}")`)
      .css('background-repeat', 'no-repeat')
      .css('background-size', 'cover')
      .css('background-position', 'center')
      .css('width', w)
      .css('height', h)
      .attr('data-toggle', 'tooltip')
      .attr('data-placement', 'bottom')
      .attr('title', this.displayName)
      .tooltip();
    return image;
  }

  async getDataUrl() {
    if (this.dataUrl) {
      return this.dataUrl;
    }

    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = e => reject(e);
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(this.file);
    });
    const thumbnail = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 96;
        const scaleH = Math.max(Math.floor(img.width / 96), 1);
        canvas.height = Math.floor(img.height / scaleH);
        canvas.getContext('2d')
          .drawImage(img,
            0, 0, img.width, img.height,
            0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = () => {
        reject(new Error(`fail to load ${this.displayName}`));
      };
      img.src = dataUrl;
    });
    this.dataUrl = dataUrl;
    this.thumbnail = thumbnail;
    return this.dataUrl;
  }

  async upload(bucket, key) {
    if (bucket) {
      this.bucket = bucket;
    }
    if (key) {
      this.key = key;
    }
    const s3 = S3Utils.getInstance();
    return s3.upload({
      Bucket: this.bucket,
      Key: this.key,
      ContentType: this.file.type,
      Body: this.file,
    }, {
      partSize: FileItem.Constants.Multipart.PartSize,
      queueSize: FileItem.Constants.Multipart.MaxConcurrentUpload,
    }).promise();
  }
}
