// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import AppUtils from '../../../shared/appUtils.js';
import {
  AWSConsoleRekogntion,
  AWSConsoleS3,
} from '../../../shared/awsConsole.js';
import ProjectVersion from '../../../shared/projectVersion.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class TrainModelSlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    this.$dataset = undefined;
    this.$projectVersion = ProjectVersion.getSingleton();
  }

  get dataset() {
    return this.$dataset;
  }

  set dataset(val) {
    this.$dataset = val;
  }

  get projectVersion() {
    return this.$projectVersion;
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Done: 'train:slide:control:done',
          Cancel: 'train:slide:control:cancel',
        },
      },
    };
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }

    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.ModelTrainingDesc);
    const controls = this.createSlideControls();
    const projectInfo = this.createProjectInformation();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(projectInfo)))
      .append($('<div/>').addClass('col-12 p-0 m-0 mt-4')
        .append($('<div/>').addClass('col-9 p-0 m-2 mx-auto')
          .append(controls)));

    this.slide.append(row);
    return super.show();
  }

  createFormItem(name, value, type, url) {
    const id = AppUtils.randomHexstring();
    const item = $('<div/>').addClass('form-group row')
      .append($('<div/>').addClass('input-group col-8 d-flex ml-auto my-2')
        .append($('<div/>').addClass('input-group-prepend')
          .append($('<label/>').addClass('input-group-text')
            .attr('for', id)
            .append(name)))
        .append($('<select/>').addClass('custom-select')
          .attr('id', id)
          .attr('data-type', type)
          .append($('<option/>')
            .attr('selected', true)
            .attr('value', value)
            .append(value))))
      .append($('<div/>').addClass('col-3 p-0 m-0 d-flex my-auto')
        .append($('<a/>').addClass('btn btn-sm btn-link')
          .attr('href', url)
          .attr('target', '_blank')
          .append(Localization.Tooltips.ViewOnAWSConsole)));
    return item;
  }

  createProjectInformation() {
    let console = AWSConsoleRekogntion.getProjectLink(SolutionManifest.CustomLabels.Project.Name);
    const project = this.createFormItem(Localization.Messages.ProjectName, SolutionManifest.CustomLabels.Project.Name, 'project', console);

    console = AWSConsoleS3.getS3Link(this.dataset.bucket, this.dataset.manifest);
    const dataset = this.createFormItem(Localization.Messages.SelectedDataset, this.dataset.name, 'dataset', console);

    const form = $('<form/>')
      .addClass('col-9 mx-auto')
      .append(project)
      .append(dataset);
    return form;
  }

  createSlideControls() {
    const row = $('<div/>').addClass('no-gutters');
    const cancel = $('<button/>').addClass('btn btn-light ml-1')
      .attr('data-control-type', 'back')
      .html(Localization.Buttons.Cancel);
    const start = $('<button/>').addClass('btn btn-success ml-1')
      .attr('data-control-type', 'train')
      .html(Localization.Buttons.StartTraining);
    const controls = $('<form/>').addClass('form-inline controls')
      .append($('<div/>').addClass('ml-auto')
        .append(cancel)
        .append(start));

    cancel.off('click').on('click', async (event) =>
      this.slide.trigger(TrainModelSlideComponent.Events.Slide.Control.Cancel));

    start.off('click').on('click', async (event) => {
      this.loading(true);
      const model = await this.projectVersion.newModelVersion({
        training: {
          bucket: this.dataset.bucket,
          key: this.dataset.manifest,
        },
        testing: {
          autoCreate: true,
        },
      }).catch(e => e);
      this.loading(false);
      if (model instanceof Error) {
        return this.showAlert(model.message);
      }
      const message = Localization.Messages.ModelCreated.replace('{{MODELVERSION}}', model.version);
      await this.showMessage(this.slide, 'success', Localization.Alerts.Success, message);
      return this.slide.trigger(TrainModelSlideComponent.Events.Slide.Control.Done, [model]);
    });

    controls.submit(event =>
      event.preventDefault());

    return row.append(controls);
  }

  setData(val) {
    this.dataset = val;
    if ((val || {}).name) {
      const option = this.slide.find('select[data-type="dataset"]').children('option:selected');
      option.val(val.name).html(val.name);
    }
  }

  clearData() {
    this.dataset = undefined;
    return super.clearData();
  }
}
