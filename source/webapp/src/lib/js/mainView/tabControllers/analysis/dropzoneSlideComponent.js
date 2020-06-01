// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../../shared/localization.js';
import ApiHelper from '../../../shared/apiHelper.js';
import AppUtils from '../../../shared/appUtils.js';
import ProjectVersion from '../../../shared/projectVersion.js';
import LocalCache from '../../../shared/localCache.js';
import mxDropzone from '../../../mixins/mxDropzone.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class DropzoneSlideComponent extends mxDropzone(BaseSlideComponent) {
  constructor() {
    super();
    this.slide.append(this.createLoading());
    this.$projectVersion = ProjectVersion.getSingleton();
    this.$localCache = LocalCache.getSingleton();
    this.$selectedModel = undefined;
    /* set prefix for uploading images to S3 */
    this.group = [
      'analyzed-data',
      new Date().toISOString().replace(/[:.-]/g, ''),
    ].join('/');
  }

  static get Events() {
    return {
      Slide: {
        Media: {
          Selected: 'dropzone:slide:media:selected',
        },
      },
    };
  }

  get projectVersion() {
    return this.$projectVersion;
  }

  get localCache() {
    return this.$localCache;
  }

  get selectedModel() {
    return this.$selectedModel;
  }

  set selectedModel(val) {
    this.$selectedModel = val;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    await this.projectVersion.startTimer();

    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.DropzoneDesc);
    const modelSelection = await this.createModelSelection();
    const dropzone = this.createDropzone(Localization.Messages.DropFilesHere);

    const cards = $('<div/>').addClass('cards row no-gutters');
    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(description))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(modelSelection))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(dropzone)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(cards)))
      .append(this.createLoading());

    this.slide.append(row);
    await this.projectVersionChangedEvent();
    return super.show();
  }

  async createModelSelection() {
    const id = AppUtils.randomHexstring();
    const select = $('<select/>').addClass('custom-select avail-models')
      .attr('id', id);
    select.off('change').change(async () => {
      const modelVersion = select.children('option:selected').val();
      this.selectedModel = await this.projectVersion.saveSelectedModelVersion(modelVersion);
    });

    this.projectVersion.modelVersions.forEach((model, idx) => {
      this.addModelOption(model, select);
    });

    // make sure to select the most proper one.
    let selected;
    const current = await this.projectVersion.getSelectedModelVersion();
    if (current && current.canStop()) {
      selected = select.find(`option[value="${current.version}"]`).val();
    }
    if (!selected) {
      selected = select.find('option:not([disabled]):first').val();
    }
    if (!selected) {
      selected = select.find('option:first').val();
    }
    select.val(selected).change();

    return $('<form/>').addClass('col-6 mx-auto')
      .append($('<div/>').addClass('form-group')
        .append($('<div/>').addClass('input-group')
          .append($('<div/>').addClass('input-group-prepend')
            .append($('<label/>').addClass('input-group-text')
              .attr('for', id)
              .append(Localization.Messages.AvailableModels)))
          .append(select)));
  }

  async processDropEvent(event) {
    if (!this.selectedModel || !this.selectedModel.canStop()) {
      this.shake(this.slide);
      return this.showAlert(Localization.Alerts.ModelNotRunning);
    }
    return super.processDropEvent(event);
  }

  async processEachFileItem(file) {
    const [
      card,
      result,
    ] = await Promise.all([
      file.createCard(),
      this.startAnalysis(file),
    ]);
    file.setAnalysis(result);
    card.off('click').on('click', () =>
      this.slide.trigger(DropzoneSlideComponent.Events.Slide.Media.Selected, [file]));
    this.slide.find('.cards').append(card);
    return result;
  }

  async startAnalysis(file) {
    if (!this.selectedModel.canStop()) {
      throw new Error('model not running');
    }

    const t0 = new Date().getTime();
    let response = await file.upload();
    const t1 = new Date().getTime();
    response = await ApiHelper.startAnalysis({
      arn: this.selectedModel.arn,
      bucket: response.Bucket,
      key: response.Key,
      id: file.fileId,
    });
    const t2 = new Date().getTime();
    file.setMetric({
      upload: {
        startTime: t0,
        endTime: t1,
      },
      analysis: {
        startTime: t1,
        endTime: t2,
      },
    });
    return response;
  }

  getSelectContainer() {
    return this.slide.find('select.avail-models');
  }

  async addModelOption(model, parent) {
    const select = parent || this.getSelectContainer();
    const found = select.find(`option[value="${model.version}"]`);
    if (!found.length) {
      const option = $('<option/>').attr('value', model.version)
        .append(model.version);
      if (!model.canStop()) {
        option.attr('disabled', '');
      }
      select.append(option);
    }
    return select;
  }

  async updateModelOption(model, parent) {
    const select = parent || this.getSelectContainer();
    const found = select.find(`option[value="${model.version}"]`);
    if (found) {
      if (model.canStop()) {
        found.removeAttr('disabled');
      } else {
        found.attr('disabled', '');
      }
    }
    return select;
  }

  async removeModelOption(model, parent) {
    const select = parent || this.getSelectContainer();
    const found = select.find(`option[value="${model.version}"]`);
    if (found) {
      found.remove();
    }
    return select;
  }

  async projectVersionChangedEvent() {
    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.NewAdded, async (event, model) =>
      this.addModelOption(model));

    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.Changed, async (event, model) =>
      this.updateModelOption(model));

    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.Removed, async (event, model) =>
      this.removeModelOption(model));
  }
}
