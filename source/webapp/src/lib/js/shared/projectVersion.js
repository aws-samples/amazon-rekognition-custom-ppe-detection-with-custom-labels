// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import AppUtils from './appUtils.js';
import ApiHelper from './apiHelper.js';
import LocalCache from './localCache.js';

export class ModelVersion {
  constructor(data) {
    this.$arn = data.ProjectVersionArn;
    this.$project = this.$arn.split('/')[1];
    this.$version = this.$arn.split('/')[3];
    this.$createdAt = new Date(data.CreationTimestamp);
    this.$status = undefined;
    this.$statusMessage = undefined;
    this.$trainedEnd = undefined;
    this.$trainElapsedInSec = undefined;
    this.$inferenceUnits = undefined;
    this.$trainingData = undefined;
    this.$testingData = undefined;
    this.$evaluation = undefined;
    this.parseJsonData(data);
  }

  static get Status() {
    return {
      TrainingInProgress: 'TRAINING_IN_PROGRESS',
      TrainingCompleted: 'TRAINING_COMPLETED',
      TrainingFailed: 'TRAINING_FAILED',
      Starting: 'STARTING',
      Running: 'RUNNING',
      Failed: 'FAILED',
      Stopping: 'STOPPING',
      Stopped: 'STOPPED',
      Deleting: 'DELETING',
    };
  }

  parseJsonData(data) {
    this.$status = data.Status;
    this.$statusMessage = data.StatusMessage;
    this.$trainedEnd = !data.TrainingEndTimestamp
      ? undefined
      : new Date(data.TrainingEndTimestamp);
    this.$trainElapsedInSec = data.BillableTrainingTimeInSeconds || 0;
    this.$inferenceUnits = data.MinInferenceUnits || 0;
    this.$trainingData = {
      input: {
        bucket: data.TrainingDataResult.Input.Assets[0].GroundTruthManifest.S3Object.Bucket,
        key: data.TrainingDataResult.Input.Assets[0].GroundTruthManifest.S3Object.Name,
      },
      output: !((data.TrainingDataResult.Output || {}).Assets || []).length
        ? undefined
        : {
          bucket: data.TrainingDataResult.Output.Assets[0].GroundTruthManifest.S3Object.Bucket,
          key: data.TrainingDataResult.Output.Assets[0].GroundTruthManifest.S3Object.Name,
        },
    };
    this.$testingData = {
      autoCreate: data.TestingDataResult.Input.AutoCreate,
      input: (data.TestingDataResult.Input.AutoCreate)
        ? undefined
        : {
          bucket: data.TestingDataResult.Input.Assets[0].GroundTruthManifest.S3Object.Bucket,
          key: data.TestingDataResult.Input.Assets[0].GroundTruthManifest.S3Object.Name,
        },
      output: !((data.TestingDataResult.Output || {}).Assets || []).length
        ? undefined
        : {
          bucket: data.TestingDataResult.Output.Assets[0].GroundTruthManifest.S3Object.Bucket,
          key: data.TestingDataResult.Output.Assets[0].GroundTruthManifest.S3Object.Name,
        },
    };
    this.$evaluation = (!data.EvaluationResult)
      ? undefined
      : {
        f1Score: Number.parseFloat(Number.parseFloat(data.EvaluationResult.F1Score).toFixed(2)),
        bucket: data.EvaluationResult.Summary.S3Object.Bucket,
        key: data.EvaluationResult.Summary.S3Object.Name,
      };
  }

  get arn() {
    return this.$arn;
  }

  get project() {
    return this.$project;
  }

  get version() {
    return this.$version;
  }

  get status() {
    return this.$status;
  }

  set status(val) {
    this.$status = val;
  }

  get statusMessage() {
    return this.$statusMessage;
  }

  get createdAt() {
    return this.$createdAt;
  }

  get trainedEnd() {
    return this.$trainedEnd;
  }

  get trainElapsedInSec() {
    return this.$trainElapsedInSec;
  }

  get inferenceUnits() {
    return this.$inferenceUnits;
  }

  get trainingData() {
    return this.$trainingData;
  }

  get testingData() {
    return this.$testingData;
  }

  get evaluation() {
    return this.$evaluation;
  }

  canStart() {
    return this.status === ModelVersion.Status.TrainingCompleted
      || this.status === ModelVersion.Status.Stopped;
  }

  canStop() {
    return this.status === ModelVersion.Status.Running;
  }

  update(data) {
    const dirty = this.status !== data.Status;
    this.parseJsonData(data);
    return dirty;
  }
}

export default class ProjectVersion {
  constructor() {
    this.$projectArn = SolutionManifest.CustomLabels.Project.Arn;
    this.$name = SolutionManifest.CustomLabels.Project.Name;
    this.$modelVersions = [];
    this.$localCache = LocalCache.getSingleton();
    this.$timer = undefined;
    this.$id = `projectversion-${AppUtils.randomHexstring()}`;
    this.$eventSource = $('<div/>').addClass('collapse')
      .attr('id', this.$id);
    $('body').append(this.$eventSource);
  }

  static getSingleton() {
    if (!(window.AWSomeNamespace || {}).ProjectVersionInstance) {
      window.AWSomeNamespace = {
        ...window.AWSomeNamespace,
        ProjectVersionInstance: new ProjectVersion(),
      };
    }
    return window.AWSomeNamespace.ProjectVersionInstance;
  }

  static get Events() {
    return {
      Model: {
        Status: {
          NewAdded: 'model:status:newadded',
          Changed: 'model:status:changed',
          Removed: 'model:status:removed',
        },
      },
    };
  }

  static get Constants() {
    return {
      ModelVersion: {
        Key: 'selected-model-version',
      },
    };
  }

  get projectArn() {
    return this.$projectArn;
  }

  get name() {
    return this.$name;
  }

  get modelVersions() {
    return this.$modelVersions;
  }

  set modelVersions(val) {
    if (!Array.isArray(val)) {
      throw new Error('invalid modelVersions');
    }
    if (val.filter(x => !(x instanceof ModelVersion)).length) {
      throw new Error('invalid modelVersions');
    }
    this.$modelVersions = val.slice(0);
  }

  get timer() {
    return this.$timer;
  }

  set timer(val) {
    this.$timer = val;
  }

  get localCache() {
    return this.$localCache;
  }

  get id() {
    return this.$id;
  }

  get eventSource() {
    return this.$eventSource;
  }

  async getStatus(model) {
    return (!model)
      ? this.getStatusAll()
      : this.getModelStatus(model);
  }

  async getModelStatus(model) {
    const shortVersion = (model instanceof ModelVersion)
      ? model.version
      : (model && model.indexOf('arn:aws:rekognition') === 0)
        ? model.split('/')[3]
        : model;
    const response = await ApiHelper.getTrainingModels({
      arn: this.projectArn,
      modelVersion: shortVersion,
    });
    response.forEach(x => this.updateModelVersion(x));
    return this.modelVersions.find(x => x.version === shortVersion);
  }

  async getStatusAll() {
    const response = await ApiHelper.getTrainingModels({
      arn: this.projectArn,
    });
    response.forEach(x =>
      this.updateModelVersion(x));
    this.checkModelVersionRemoval(response.map(x =>
      x.ProjectVersionArn.split('/')[3]));
    return this.modelVersions;
  }

  updateModelVersion(data) {
    let model = this.modelVersions.find(x => x.arn === data.ProjectVersionArn);
    if (!model) {
      model = new ModelVersion(data);
      this.modelVersions.push(model);
      this.eventSource.trigger(ProjectVersion.Events.Model.Status.NewAdded, [model]);
    } else if (model.update(data)) {
      this.eventSource.trigger(ProjectVersion.Events.Model.Status.Changed, [model]);
    }
    return model;
  }

  checkModelVersionRemoval(versions = []) {
    const removedList = this.modelVersions.filter(model =>
      versions.findIndex(version =>
        version === model.version) < 0).filter(x => x);
    while (removedList.length) {
      const removed = removedList.shift();
      const idx = this.modelVersions.findIndex(x =>
        x.version === removed.version);
      if (idx >= 0) {
        this.modelVersions.splice(idx, 1);
        this.eventSource.trigger(ProjectVersion.Events.Model.Status.Removed, [removed]);
      }
    }
  }

  async newModelVersion(data) {
    const response = await ApiHelper.createModelVersion({
      arn: this.projectArn,
      action: 'create',
      ...data,
    });
    return this.getStatus(response.ProjectVersionArn);
  }

  async startModelVersion(data) {
    const model = (data instanceof ModelVersion)
      ? data
      : this.modelVersions.find(x => x.version === data || x.arn === data);
    if (!model) {
      throw new Error('invalid model data');
    }
    const response = await ApiHelper.startModelVersion({
      action: 'start',
      arn: model.arn,
    });
    model.status = response.Status;
    this.eventSource.trigger(ProjectVersion.Events.Model.Status.Changed, [model]);
    return model;
  }

  async stopModelVersion(data) {
    const model = (data instanceof ModelVersion)
      ? data
      : this.modelVersions.find(x => x.version === data || x.arn === data);
    if (!model) {
      throw new Error('invalid model data');
    }
    const response = await ApiHelper.stopModelVersion({
      action: 'stop',
      arn: model.arn,
    });
    model.status = response.Status;
    this.eventSource.trigger(ProjectVersion.Events.Model.Status.Changed, [model]);
    return model;
  }

  async startTimer(intervalInSec = 10 * 60) {
    if (!this.timer) {
      await this.getStatus();
      this.timer = setInterval(async () => {
        console.log('ProjectVersion.startTimer: refresing models status...');
        await this.getStatus();
      }, intervalInSec * 1000);
    }
    return this;
  }

  async stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = undefined;
  }

  getRunningModels() {
    return this.modelVersions.filter(model =>
      model.status === ModelVersion.Status.Running);
  }

  async getSelectedModelVersion() {
    const selected = await this.localCache.getItem(ProjectVersion.Constants.ModelVersion.Key);
    return (!selected)
      ? undefined
      : this.modelVersions.find(x => x.version === selected);
  }

  async saveSelectedModelVersion(model) {
    if (!model) {
      return undefined;
    }
    const selected = (model instanceof ModelVersion)
      ? model
      : this.modelVersions.find(x => x.version === model);
    await this.localCache.putItem(ProjectVersion.Constants.ModelVersion.Key, selected.version);
    return selected;
  }
}
