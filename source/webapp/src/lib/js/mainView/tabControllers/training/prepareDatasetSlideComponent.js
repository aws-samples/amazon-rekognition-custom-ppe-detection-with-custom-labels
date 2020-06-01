// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../../shared/localization.js';
import ApiHelper from '../../../shared/apiHelper.js';
import mxDropzone from '../../../mixins/mxDropzone.js';
import BaseSlideComponent from '../baseSlideComponent.js';
import DatasetHelper from './dataset.js';

export default class PrepareDatasetSlideComponent extends mxDropzone(BaseSlideComponent) {
  constructor() {
    super();
    this.$dataset = [];
    this.group = [
      'prepare-data',
      new Date().toISOString().replace(/[:.-]/g, ''),
    ].join('/');
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Startover: 'prepare:slide:control:startover',
          Next: 'prepare:slide:control:Next',
        },
      },
    };
  }

  get dataset() {
    return this.$dataset;
  }

  set dataset(val) {
    this.$dataset = val;
  }

  getData() {
    return this.dataset;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.PrepareDatasetDesc);

    const dropzone = this.createDropzone(Localization.Messages.DropTrainingImagesHere);
    const processList = this.createProcessingList();
    const controls = this.createSlideControls();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(description))
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(dropzone)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-2 mx-auto')
          .append(processList))
        .append($('<div/>').addClass('col-9 p-0 m-2 mx-auto')
          .append(controls)));

    this.slide.append(row);
    return super.show();
  }

  async processEachFileItem(file) {
    const [
      result,
    ] = await Promise.all([
      this.startLabelDetection(file),
    ]);

    const item = await this.createListItem(file, result);
    const num = this.slide.find('.item-list').append(item).children().length;
    if (num > 0) {
      this.slide.find('[data-control-type="next"]').removeAttr('disabled');
    }
    return result;
  }

  async startLabelDetection(file) {
    let response;
    const t0 = new Date().getTime();
    response = await file.upload();

    const t1 = new Date().getTime();
    response = await ApiHelper.startAnalysis({
      bucket: response.Bucket,
      key: response.Key,
      id: file.fileId,
    }, {
      labelOnly: true,
    });

    const t2 = new Date().getTime();
    // crop person
    file.setMetric({
      upload: {
        startTime: t0,
        endTime: t1,
      },
      labelDetection: {
        startTime: t1,
        endTime: t2,
      },
    });
    return response;
  }

  createProcessingList() {
    const row = $('<div/>').addClass('item-list row no-gutters');
    return row;
  }

  createSlideControls() {
    const row = $('<div/>').addClass('no-gutters');
    const startover = $('<button/>').addClass('btn btn-light ml-1')
      .attr('data-control-type', 'startover')
      .html(Localization.Buttons.Startover);
    const next = $('<button/>').addClass('btn btn-success ml-1')
      .attr('disabled', 'disabled')
      .attr('data-control-type', 'next')
      .html(Localization.Buttons.Next);
    const controls = $('<form/>').addClass('form-inline controls')
      .append($('<div/>').addClass('ml-auto')
        .append(startover)
        .append(next));

    startover.off('click').on('click', async (event) =>
      this.slide.trigger(PrepareDatasetSlideComponent.Events.Slide.Control.Startover));

    next.off('click').on('click', async (event) =>
      this.slide.trigger(PrepareDatasetSlideComponent.Events.Slide.Control.Next, [this.dataset]));

    controls.submit(event =>
      event.preventDefault());

    return row.append(controls);
  }

  async createListItem(file, data) {
    const persons = data.Labels.filter(label => label.Name === 'Person');
    const promises = [];
    for (let i = 0; i < persons.length; i++) {
      for (let j = 0; j < persons[i].Instances.length; j++) {
        promises.push(DatasetHelper.createDatasetEntry(file, persons[i].Instances[j]));
      }
    }
    const bodies = await Promise.all(promises);
    const card = await file.createCard(56, 56);
    const li = $('<div/>').addClass('col-3 d-inline-flex p-0 border mr-2 mb-2')
      .append(card.removeClass('ml-1 mb-1 img-card'))
      .append($('<span/>').addClass('lead align-self-center mx-2')
        .append(`${bodies.length} people extracted`));
    this.dataset.splice(this.dataset.length, 0, ...bodies);
    return li;
  }

  clearData() {
    this.slide.find('.item-list').children().remove();
    this.dataset.length = 0;
    return super.clearData();
  }
}
