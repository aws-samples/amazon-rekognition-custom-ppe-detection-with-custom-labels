// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../shared/localization.js';
import ProjectVersion, { ModelVersion } from '../../shared/projectVersion.js';
import {
  AWSConsoleRekogntion,
} from '../../shared/awsConsole.js';
import AppUtils from '../../shared/appUtils.js';
import S3Utils from '../../shared/s3utils.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import mxAlert from '../../mixins/mxAlert.js';
import mxReadable from '../../mixins/mxReadable.js';
import BaseTab from './baseTab.js';

export default class ProjectTab extends mxReadable(mxAlert(mxSpinner(BaseTab))) {
  constructor(defaultTab = false) {
    super(Localization.Messages.ProjectTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `model-${AppUtils.randomHexstring()}`,
      },
    };
    this.$projectVersion = ProjectVersion.getSingleton();
    this.tabContent.append($('<div/>').addClass('container p-0 m-0 col-12')
      .append(this.createLoading()));
  }

  get ids() {
    return this.$ids;
  }

  get projectVersion() {
    return this.$projectVersion;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    await this.projectVersion.startTimer();

    const description = this.createDescription();
    const form = this.createProjectForm();
    const models = await this.createModelList();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(form)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append($('<span/>').addClass('lead my-2')
            .append(Localization.Messages.ModelList))
          .append(models)));

    await this.projectVersionChangedEvent();
    this.tabContent.append(row);
    return super.show();
  }

  async hide() {
    await super.hide();
    this.tabContent.append($('<div/>').addClass('container p-0 m-0 col-12')
      .append(this.createLoading()));
  }

  createDescription() {
    return $('<p/>').addClass('lead')
      .html(Localization.Messages.ViewModelStatusDesc);
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

  createProjectForm() {
    const console = AWSConsoleRekogntion.getProjectLink(SolutionManifest.CustomLabels.Project.Name);
    const project = this.createFormItem(Localization.Messages.ProjectName, SolutionManifest.CustomLabels.Project.Name, 'project', console);
    return $('<form/>')
      .addClass('col-9 mx-auto')
      .append(project);
  }

  async createModelList() {
    const list = $('<div/>').addClass('col-12 pl-0 mx-auto mt-4 model-list');
    this.projectVersion.modelVersions.forEach(model =>
      list.append(this.createModelItem(model)));
    return list;
  }

  createModelItem(model, open = false) {
    const details = $('<details/>').addClass('my-2')
      .attr('model-version', model.version)
      .append($('<summary/>').addClass('')
        .append(this.createBadge(model)));
    if (open) {
      details.attr('open', '');
    }

    const tableView = this.createTableView(model);
    return details.append(tableView);
  }

  createTableView(model) {
    const dl = $('<dl/>').addClass('row text-left lead-xs ml-2 mb-2');
    let dd;
    // arn
    this.appendListDataArn(model, dl);
    // status
    this.appendListDataStatus(model, dl);
    // status message
    dl.append(this.createListTitle(Localization.Messages.ModelStatusMessage))
      .append(this.createListData(model.statusMessage));
    // created time
    dl.append(this.createListTitle(Localization.Messages.ModelCreationDate))
      .append(this.createListData(ProjectTab.isoDateTime(model.createdAt) || '--'));
    // trained end time
    dl.append(this.createListTitle(Localization.Messages.ModelTrainCompletedDate))
      .append(this.createListData(ProjectTab.isoDateTime(model.trainedEnd) || '--'));
    // training elapsed
    dl.append(this.createListTitle(Localization.Messages.ModelTrainingElapsed))
      .append(this.createListData(ProjectTab.readableDuration(model.trainElapsedInSec * 1000)));
    // F1 score
    dl.append(this.createListTitle(Localization.Messages.ModelF1Score))
      .append(this.createListData((model.evaluation || {}).f1Score || '--'));
    // inference units
    dl.append(this.createListTitle(Localization.Messages.ModelRunningInferences))
      .append(this.createListData(model.inferenceUnits || '--'));
    // training data
    this.appendListDataTrainingDataset(model, dl);
    // testing data
    this.appendListDataTestingDataset(model, dl);
    // evaluation data
    this.appendListDataEvaluation(model, dl);
    return dl;
  }

  createListTitle(title) {
    return $('<dt/>').addClass('col-3')
      .addClass('text-capitalize text-truncate').append(title);
  }

  createListData(data) {
    const dd = $('<dd/>').addClass('col-7');
    if (!Array.isArray(data)) {
      return dd.append(data);
    }
    data.forEach(x => dd.append(x));
    return dd;
  }

  appendListDataArn(model, dl) {
    return dl.append(this.createListTitle(Localization.Messages.ModelArn))
      .append(this.createListData(model.arn)
        .append($('<a/>').addClass('btn btn-sm btn-link')
          .attr('href', AWSConsoleRekogntion.getModelLink(model.project, model.version))
          .attr('target', '_blank')
          .append(`(${Localization.Tooltips.ViewOnAWSConsole})`)));
  }

  appendListDataStatus(model, dl) {
    const status = $('<div/>').addClass('row')
      .append($('<span/>').addClass('d-flex align-items-center mr-4')
        .css('padding-left', '15px')
        .append(model.status));

    const start = $('<button/>').addClass('btn btn-sm btn-success lead-xxs mr-1')
      .attr('type', 'button')
      .append(Localization.Buttons.StartModel);
    if (!model.canStart()) {
      start.attr('disabled', 'disabled');
    }
    start.off('click').on('click', async (event) => {
      this.loading(true);
      const stt = await this.projectVersion.startModelVersion(model).catch(e => e);
      if (stt instanceof Error) {
        this.shake(dl);
        await this.showAlert(stt.message);
      }
      this.loading(false);
    });

    const stop = $('<button/>').addClass('btn btn-sm btn-danger lead-xxs mr-1')
      .attr('type', 'button')
      .append(Localization.Buttons.StopModel);
    if (!model.canStop()) {
      stop.attr('disabled', 'disabled');
    }
    stop.off('click').on('click', async (event) => {
      this.loading(true);
      const stt = await this.projectVersion.stopModelVersion(model).catch(e => e);
      if (stt instanceof Error) {
        this.shake(dl);
        await this.showAlert(stt.message);
      }
      this.loading(false);
    });

    const refresh = $('<button/>').addClass('btn btn-sm btn-secondary lead-xxs mr-1')
      .attr('type', 'button')
      .append($('<i/>').addClass('fas fa-redo-alt'));
    refresh.off('click').on('click', async (event) => {
      this.loading(true);
      const stt = await this.projectVersion.getStatus(model).catch(e => e);
      if (stt instanceof Error) {
        this.shake(dl);
        await this.showAlert(stt.message);
      }
      this.loading(false);
    });

    status.append(start)
      .append(stop)
      .append(refresh);

    return dl.append(this.createListTitle(Localization.Messages.ModelStatus))
      .append(this.createListData(status));
  }

  appendListDataTrainingDataset(model, dl) {
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const input = model.trainingData.input;
    let col10 = $('<div/>').addClass('col-10 p-0 m-0');
    col10.append(input.key)
      .append(this.createDownloadLink(input.bucket, input.key).addClass('ml-2'));
    col12.append($('<div/>').addClass('row p-0 m-0 mb-2')
      .append($('<div>').addClass('col-2 p-0 m-0')
        .append(Localization.Messages.Input))
      .append(col10));

    const output = model.trainingData.output;
    col10 = $('<div/>').addClass('col-10 p-0 m-0');
    if (!output) {
      col10.append('--');
    } else {
      col10.append(output.key)
        .append(this.createDownloadLink(output.bucket, output.key).addClass('ml-2'));
    }
    col12.append($('<div/>').addClass('row p-0 m-0')
      .append($('<div>').addClass('col-2 p-0 m-0')
        .append(Localization.Messages.Output))
      .append(col10));

    return dl.append(this.createListTitle(Localization.Messages.ModelTrainingDataset))
      .append(this.createListData(col12));
  }

  appendListDataTestingDataset(model, dl) {
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const input = model.testingData.input;
    let col10 = $('<div/>').addClass('col-10 p-0 m-0');
    if (model.testingData.autoCreate) {
      col10.append(Localization.Messages.ModelTestingDataAutoCreated);
    } else {
      col10.append(input.key)
        .append(this.createDownloadLink(input.bucket, input.key).addClass('ml-2'));
    }
    col12.append($('<div/>').addClass('row p-0 m-0 mb-2')
      .append($('<div>').addClass('col-2 p-0 m-0')
        .append(Localization.Messages.Input))
      .append(col10));

    const output = model.testingData.output;
    col10 = $('<div/>').addClass('col-10 p-0 m-0');
    if (!output) {
      col10.append('--');
    } else {
      col10.append(output.key)
        .append(this.createDownloadLink(output.bucket, output.key).addClass('ml-2'));
    }
    col12.append($('<div/>').addClass('row p-0 m-0')
      .append($('<div>').addClass('col-2 p-0 m-0')
        .append(Localization.Messages.Output))
      .append(col10));

    return dl.append(this.createListTitle(Localization.Messages.ModelTestingDataset))
      .append(this.createListData(col12));
  }

  appendListDataEvaluation(model, dl) {
    const dd = (!model.evaluation)
      ? this.createListData('--')
      : this.createListData(model.evaluation.key)
        .append(this.createDownloadLink(model.evaluation.bucket, model.evaluation.key).addClass('ml-2'));
    return dl.append(this.createListTitle(Localization.Messages.ModelEvaluation))
      .append(dd);
  }

  createDownloadLink(bucket, key) {
    return $('<a/>').addClass('')
      .attr('href', S3Utils.signUrl(bucket, key))
      .attr('target', '_blank')
      .append(`(${Localization.Tooltips.DownloadFile})`);
  }

  createBadge(model) {
    const status = model.status === ModelVersion.Status.Running
      ? 'badge-success'
      : model.status === ModelVersion.Status.Failed
      || model.status === ModelVersion.Status.TrainingFailed
      || model.status === ModelVersion.Status.Deleting
        ? 'badge-danger'
        : model.status === ModelVersion.Status.TrainingCompleted
        || model.status === ModelVersion.Status.TrainingInProgress
        || model.status === ModelVersion.Status.Starting
        || model.status === ModelVersion.Status.Stopping
          ? 'badge-primary'
          : 'badge-secondary';
    return $('<span/>').addClass('lead-sm mr-1')
      .append(model.version)
      .append($('<span/>').addClass('badge badge-pill ml-2 mr-1 mb-1 lead-xxs')
        .addClass(status)
        .append(model.status));
  }

  async showAlert(message, duration) {
    return super.showMessage(this.tabContent, 'danger', Localization.Alerts.Oops, message, duration);
  }

  async projectVersionChangedEvent() {
    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.NewAdded, async (event, model) =>
      this.addModelItem(model));

    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.Changed, async (event, model) =>
      this.updateModelItem(model));

    this.projectVersion.eventSource.on(ProjectVersion.Events.Model.Status.Removed, async (event, model) =>
      this.removeModelItem(model));
  }

  getModelContainer() {
    return this.tabContent.find('.model-list');
  }

  async addModelItem(model) {
    return this.getModelContainer().prepend(this.createModelItem(model, true));
  }

  async updateModelItem(model) {
    const details = this.getModelContainer().children(`[model-version="${model.version}"]`);
    const badge = this.createBadge(model);

    const summary = details.children('summary');
    summary.children().remove();
    summary.append(badge);

    const tableView = this.createTableView(model);
    details.children('dl').remove();
    details.append(tableView);
    return details;
  }

  async removeModelItem(model) {
    const item = this.getModelContainer().children(`[model-version="${model.version}"]`).remove();
    const message = Localization.Messages.ModelRemoved.replace('{{MODELVERSION}}', model.version);
    await this.showMessage(this.tabContent, 'info', Localization.Alerts.Info, message);
    return item;
  }
}
