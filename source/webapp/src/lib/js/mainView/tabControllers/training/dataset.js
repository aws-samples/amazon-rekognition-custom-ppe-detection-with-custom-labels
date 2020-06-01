// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import AppUtils from '../../../shared/appUtils.js';

class CropUtils {
  static async nocrop(dataUrl) {
    return new Promise((resolve, reject) => {
      const mime = 'image/jpeg';
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve({
          coords: {
            x: 0,
            y: 0,
            w: img.width,
            h: img.height,
          },
          blob,
          mime,
        }), mime);
      };
      img.onerror = () =>
        reject(new Error('fail to load image'));
      img.src = dataUrl;
    });
  }

  static async crop(dataUrl, x, y, w, h) {
    return new Promise((resolve, reject) => {
      const mime = 'image/jpeg';
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        /* make sure it is not out-of-bound */
        const x0 = Math.min(Math.max(x * img.width, 0), img.width);
        const y0 = Math.min(Math.max(y * img.height, 0), img.height);
        const w0 = w * img.width;
        const h0 = h * img.height;
        canvas.width = w0;
        canvas.height = h0;
        canvas.getContext('2d').drawImage(img, x0, y0, w0, h0, 0, 0, w0, h0);
        canvas.toBlob(blob => resolve({
          coords: {
            x: x0,
            y: y0,
            w: w0,
            h: h0,
          },
          blob,
          mime,
        }), mime);
      };
      img.onerror = () =>
        reject(new Error('fail to load image'));
      img.src = dataUrl;
    });
  }

  static scale(dataUrl, factor) {
    return new Promise((resolve, reject) => {
      const mime = 'image/jpeg';
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(img.width * factor);
        canvas.height = Math.floor(img.height * factor);
        console.log(`scale: ${img.width} x ${img.height} -->  ${canvas.width} x ${canvas.height}`);
        canvas.getContext('2d')
          .drawImage(img, 0, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => resolve(blob), mime);
      };
      img.onerror = () =>
        reject(new Error('fail to load image'));
      img.src = dataUrl;
    });
  }
}

export class DatasetEntry {
  constructor(data) {
    this.$id = `person-${AppUtils.randomHexstring()}`;
    this.$data = data;
    this.$data.vest = DatasetEntry.Enum.NotLabeled;
    this.$data.dataUrl = window.URL.createObjectURL(this.$data.blob);
  }

  static get Enum() {
    return {
      NotLabeled: -1,
      Vest: 0,
      NoVest: 1,
    };
  }

  get id() {
    return this.$id;
  }

  get name() {
    return this.$data.name;
  }

  get mime() {
    return this.$data.mime;
  }

  get blob() {
    return this.$data.blob;
  }

  get confidence() {
    return this.$data.confidence;
  }

  get dataUrl() {
    return this.$data.dataUrl;
  }

  get width() {
    return this.$data.coords.w;
  }

  get height() {
    return this.$data.coords.h;
  }

  get vest() {
    return this.$data.vest;
  }

  set vest(val) {
    this.$data.vest = val;
  }

  setVest(val) {
    this.vest = val;
  }

  createCard(w = 96, h = 96) {
    const wxh = `${Number.parseFloat(this.width).toFixed(2)} x ${Number.parseFloat(this.height).toFixed(2)}`;
    const background = $('<div/>').addClass('btn-bg')
      .css('width', w)
      .css('height', h)
      .css('background-image', `url("${this.dataUrl}")`)
      .append($('<i/>').addClass('far fa-check-circle btn-overlay-i text-light')
        .css('font-size', '2.5rem'));
    const btn = $('<button/>').addClass('btn btn-light btn-shrink p-0 m-0 mr-1 mb-1')
      .attr('type', 'button')
      .attr('title', wxh)
      .attr('data-id', this.id)
      .attr('draggable', true)
      .attr('data-toggle', 'button')
      .attr('data-placement', 'bottom')
      .attr('aria-pressed', false)
      .css('width', w)
      .css('height', h)
      .append(background)
      .tooltip();

    btn.on('dragstart', (event) => {
      console.log(`dragstart ${btn.data('id')}`);
      btn.tooltip('hide');
      event.originalEvent.dataTransfer.setData('text/plain', btn.data('id'));
    });
    return btn;
  }

  // https://docs.aws.amazon.com/rekognition/latest/customlabels-dg/limits.html
  async scaleToFit(minW = 72, minH = 72) {
    if (this.width >= minW && this.height >= minH) {
      return this.blob;
    }
    const scale = Math.max(minW / this.width, minH / this.height);
    return CropUtils.scale(this.dataUrl, scale);
  }
}

export class Dataset {
  constructor(params = {}, canUse = false) {
    if (!params.name || !params.manifest || typeof params.total !== 'number') {
      throw new Error('invalid params');
    }
    this.$bucket = params.bucket || SolutionManifest.S3.Bucket;
    this.$name = params.name;
    this.$manifest = params.manifest;
    this.$total = params.total;
    this.$canUse = canUse; // indicated dataset exists on Custom Labels console and can be used
  }

  get bucket() {
    return this.$bucket;
  }

  get name() {
    return this.$name;
  }

  set name(val) {
    this.$name = val;
  }

  get manifest() {
    return this.$manifest;
  }

  set manifest(val) {
    this.$manifest = val;
  }

  get total() {
    return this.$total;
  }

  set total(val) {
    if (typeof val !== 'number' && val <= 0) {
      throw new Error('invalid total value');
    }
    this.$total = val;
  }

  get canUse() {
    return this.$canUse;
  }

  set canUse(val) {
    this.$canUse = !!val;
  }
}

export default class DatasetHelper {
  static async createDatasetEntry(file, data) {
    const dataUrl = await file.getDataUrl();
    const cropped = (data)
      ? await CropUtils.crop(dataUrl, data.BoundingBox.Left, data.BoundingBox.Top, data.BoundingBox.Width, data.BoundingBox.Height)
      : await CropUtils.nocrop(dataUrl);

    let name = file.displayName;
    name = name.substring(name.lastIndexOf('/') + 1, name.lastIndexOf('.'));
    const coords = [
      Number.parseFloat(cropped.coords.x).toFixed(2),
      Number.parseFloat(cropped.coords.y).toFixed(2),
      Number.parseFloat(cropped.coords.w).toFixed(2),
      Number.parseFloat(cropped.coords.h).toFixed(2),
    ].join(',');
    name = `${name}-${coords}.jpg`;
    return new DatasetEntry({
      ...cropped,
      name,
      confidence: Number.parseFloat(Number.parseFloat((data || {}).Confidence || 1.0).toFixed(2)),
    });
  }

  static async createDataset(data, canUse = false) {
    return new Dataset(data, canUse);
  }
}
