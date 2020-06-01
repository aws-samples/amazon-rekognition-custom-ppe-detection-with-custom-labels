// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import S3Utils from '../../../shared/s3utils.js';
import mxDropzone from '../../../mixins/mxDropzone.js';
import DatasetHelper, {
  DatasetEntry,
} from './dataset.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class LabelDatasetSlideComponent extends mxDropzone(BaseSlideComponent) {
  constructor() {
    super();
    this.$datasetEntries = [];
    this.$dataset = undefined;
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          Startover: 'label:slide:control:startover',
          Back: 'label:slide:control:back',
          Next: 'label:slide:control:next',
        },
      },
    };
  }

  static get Labels() {
    return [
      'vest',
      'novest',
    ];
  }

  get datasetEntries() {
    return this.$datasetEntries;
  }

  set datasetEntries(val) {
    this.$datasetEntries = val;
  }

  getData() {
    return this.datasetEntries;
  }

  async setData(val) {
    if (this.initialized) {
      const currentIds = [];
      const zone = this.slide.find('.zone').find('.cards');
      zone.children().each((k0, v0) =>
        currentIds.push($(v0).data('id')));

      const notLabeled = val.filter(x => x.vest === DatasetEntry.Enum.NotLabeled);
      while (notLabeled.length) {
        const item = notLabeled.shift();
        if (currentIds.findIndex(x => x === item.id) < 0) {
          zone.append(item.createCard());
        }
      }
    }
    this.datasetEntries = val;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.LabelDatasetDesc);

    const dragzone = this.createDatasetDragzone();
    const dropzoneVest = this.createVestDropszone();
    const dropzoneNovest = this.createNoVestDropszone();
    const btnGrp = this.createLabelButtonGroup(dragzone, dropzoneVest, dropzoneNovest);
    const controls = this.createSlideControls();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(description))
        .append($('<div/>').addClass('row col-9 p-0 m-0 mx-auto mb-4 dataset-area')
          .append($('<div/>').addClass('col-4 p-0')
            .append(dropzoneVest))
          .append($('<div/>').addClass('col-4 p-0')
            .append(dragzone))
          .append($('<div/>').addClass('col-4 p-0')
            .append(dropzoneNovest)))
        .append($('<div/>').addClass('col-12 p-0 my-4')
          .append(btnGrp)))
      .append($('<div/>').addClass('col-12 p-0 m-0 mt-4')
        .append($('<div/>').addClass('col-9 p-0 m-2 mx-auto')
          .append(controls)));

    this.slide.append(row);
    return super.show();
  }

  createZone(type) {
    const [
      text,
      style,
      bgcss,
    ] = type === DatasetEntry.Enum.Vest
      ? [
        Localization.Messages.VestLabel,
        'zone-vest',
        'zone-vest-bg',
      ]
      : type === DatasetEntry.Enum.NoVest
        ? [
          Localization.Messages.NoVestLabel,
          'zone-novest',
          'zone-novest-bg',
        ]
        : [
          Localization.Messages.Unlabeled,
          'zone',
          'zone-bg',
        ];
    const background = $('<div/>').addClass(`d-flex justify-content-center ${bgcss}`)
      .append($('<p/>').addClass('align-self-center text-center col-8 mx-auto')
        .html(text));

    const cards = $('<div/>').addClass('cards row no-gutters');
    const zone = $('<div/>').addClass(style)
      .append($('<p>').addClass('lead m-auto')
        .append(background))
      .append(cards);

    [
      'dragenter',
      'dragover',
      'dragleave',
      'drop',
    ].forEach((x) => {
      zone.off(x).on(x, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });

    zone.on('dragover', (event) => {
      const id = event.originalEvent.dataTransfer.getData('text');
      console.log(`zone.dragover ${id}`);
    });

    zone.on('drop', async (event) => {
      if (event.originalEvent.dataTransfer.files.length > 0) {
        if (type === DatasetEntry.Enum.NotLabeled) {
          return undefined;
        }
        return this.processDropEvent(event, type, cards);
      }
      return this.processMoveEvent(event, type, cards);
    });

    return zone;
  }

  async processDropEvent(event, type, container) {
    try {
      this.loading(true);
      const files = await this.getAllFileItems(event.originalEvent.dataTransfer);
      for (let i = 0; i < files.length; i++) {
        const entry = await DatasetHelper.createDatasetEntry(files[i]);
        entry.setVest(type);
        container.append(entry.createCard());
        this.datasetEntries.push(entry);
      }
      return this.datasetEntries;
      /*
      const entries = await Promise.all(files.map(x =>
        DatasetHelper.createDatasetEntry(x)));
      entries.forEach((x) => {
        x.setVest(type);
        container.append(x.createCard());
        this.datasetEntries.push(x);
      });
      return entries;
      */
    } catch (e) {
      console.error(e);
      return undefined;
    } finally {
      this.loading(false);
    }
  }

  async processMoveEvent(event, type, container) {
    const id = event.originalEvent.dataTransfer.getData('text');
    console.log(`zone.drop ${id}`);
    const item = this.slide.find(`[data-id="${id}"]`);
    container.append(item.removeClass('focus active'));
    this.datasetEntries.find(x => x.id === id).setVest(type);
    return event.originalEvent.dataTransfer.clearData();
  }

  createDatasetDragzone() {
    const zone = this.createZone(DatasetEntry.Enum.NotLabeled);
    const cards = zone.find('.cards');
    this.datasetEntries.forEach(x =>
      cards.append(x.createCard()));
    return zone;
  }

  createVestDropszone() {
    const zone = this.createZone(DatasetEntry.Enum.Vest);
    const cards = zone.find('.cards');
    return zone;
  }

  createNoVestDropszone() {
    const zone = this.createZone(DatasetEntry.Enum.NoVest);
    const cards = zone.find('.cards');
    return zone;
  }

  createSlideControls() {
    const row = $('<div/>').addClass('no-gutters');
    const startover = $('<button/>').addClass('btn btn-light ml-1')
      .attr('data-control-type', 'back')
      .html(Localization.Buttons.Startover);
    const back = $('<button/>').addClass('btn btn-primary ml-1')
      .attr('data-control-type', 'back')
      .html(Localization.Buttons.Back);
    const next = $('<button/>').addClass('btn btn-success ml-1')
      .attr('data-control-type', 'next')
      .html(Localization.Buttons.CreateDataset);
    const controls = $('<form/>').addClass('form-inline controls')
      .append($('<div/>').addClass('ml-auto')
        .append(startover)
        .append(back)
        .append(next));

    startover.off('click').on('click', async (event) =>
      this.slide.trigger(LabelDatasetSlideComponent.Events.Slide.Control.Startover));

    back.off('click').on('click', async (event) =>
      this.slide.trigger(LabelDatasetSlideComponent.Events.Slide.Control.Back));

    next.off('click').on('click', async (event) => {
      const vests = this.datasetEntries.filter(x => x.vest === DatasetEntry.Enum.Vest).length;
      const novests = this.datasetEntries.filter(x => x.vest === DatasetEntry.Enum.NoVest).length;
      if (vests < 10 || novests < 10) {
        this.shake(this.slide.find('.dataset-area'));
        await this.showAlert(Localization.Alerts.NotEnoughTrainingData);
        return false;
      }

      this.loading(true);
      const dataset = await this.finalizeTrainingDataset().catch(e => e);
      if (dataset instanceof Error) {
        await this.showAlert(dataset.messge);
      }
      this.loading(false);
      return this.slide.trigger(LabelDatasetSlideComponent.Events.Slide.Control.Next, [dataset]);
    });

    controls.submit(event =>
      event.preventDefault());

    return row.append(controls);
  }

  createLabelButtonGroup(zoneUnlabel, zoneVest, zoneNovest) {
    const row = $('<div/>').addClass('no-gutters');

    const btnVest = $('<button/>').addClass('btn btn-success col-3')
      .attr('type', 'button')
      .append($('<i/>').addClass('fas fa-angle-double-left mr-2'))
      .append(Localization.Buttons.Vest);
    const btnDelete = $('<button/>').addClass('btn btn-danger mx-1')
      .attr('type', 'button')
      .append($('<i/>').addClass('far fa-trash-alt lead-sm'));
    const btnNoVest = $('<button/>').addClass('btn btn-secondary col-3')
      .attr('type', 'button')
      .append(Localization.Buttons.NoVest)
      .append($('<i/>').addClass('fas fa-angle-double-right ml-2'));

    [
      [
        btnVest,
        zoneVest.find('.cards'), DatasetEntry.Enum.Vest,
      ],
      [
        btnNoVest,
        zoneNovest.find('.cards'), DatasetEntry.Enum.NoVest,
      ],
    ].forEach((action) => {
      action[0].off('click').on('click', (event) => {
        event.preventDefault();
        zoneUnlabel.find('.cards').children('button.active').each((k0, v0) => {
          const found = this.datasetEntries.find(x => x.id === $(v0).data('id'));
          if (found) {
            found.setVest(action[2]);
          }
          $(v0).removeClass('active focus').detach().appendTo(action[1]);
        });
      });
    });

    btnDelete.off('click').on('click', (event) => {
      event.preventDefault();
      this.onDeleteSelected(zoneUnlabel);
      this.onDeleteSelected(zoneVest);
      this.onDeleteSelected(zoneNovest);
    });

    const controls = $('<div/>').addClass('col-4 mx-auto d-flex justify-content-center')
      .append(btnVest)
      .append(btnDelete)
      .append(btnNoVest);
    return row.append(controls);
  }

  onDeleteSelected(zone) {
    zone.find('.cards').children('button.active').each((k0, v0) => {
      const idx = this.datasetEntries.findIndex(x => x.id === $(v0).data('id'));
      if (idx >= 0) {
        this.datasetEntries.splice(idx, 1);
      }
      $(v0).remove();
    });
  }

  clearData() {
    this.slide.find('.cards').children().remove();
    this.datasetEntries.length = 0;
    return super.clearData();
  }

  async finalizeTrainingDataset() {
    const bucket = SolutionManifest.S3.Bucket;
    const isoDate = new Date().toISOString().replace(/[:.-]/g, '');
    const prefix = [
      'training-data',
      SolutionManifest.CustomLabels.Project.Name,
      isoDate,
    ].join('/');

    const filtered = this.datasetEntries.filter(x => x.vest !== DatasetEntry.Enum.NotLabeled);
    let sourceRefs = [];
    // slice and batch process for better responsiveness and avoid upload throttling
    while (filtered.length) {
      const slices = filtered.splice(0, 10);
      const refs = await Promise.all(slices.map(x =>
        this.processEachEntry(bucket, prefix, x)));
      sourceRefs.splice(sourceRefs.length, 0, ...refs);
    }

    sourceRefs = sourceRefs.filter(x => x)
      .map(x => JSON.stringify(x)).join('\n');

    const key = [
      'datasets',
      SolutionManifest.CustomLabels.Project.Name,
      isoDate,
      'manifests',
      'output',
      'output.manifest',
    ].join('/');
    await S3Utils.upload(bucket, key, sourceRefs, 'application/octet-stream');

    return DatasetHelper.createDataset({
      name: isoDate,
      bucket,
      manifest: key,
      total: filtered.length,
    }, true);
  }

  async processEachEntry(bucket, prefix, entry) {
    const idx = (entry.vest === DatasetEntry.Enum.Vest) ? 0 : 1;
    const key = `${prefix}/${LabelDatasetSlideComponent.Labels[idx]}/${entry.name}`;
    const blob = await entry.scaleToFit();
    const response = await S3Utils.upload(bucket, key, blob, entry.mime).catch(e => e);
    if (response instanceof Error) {
      console.error(response);
      return undefined;
    }
    return this.makeSoureRef(bucket, key, idx);
  }

  makeSoureRef(bucket, key, labelIdx) {
    return {
      'source-ref': `s3://${bucket}/${key}`,
      'vest-detection': labelIdx,
      'vest-detection-metadata': {
        type: 'groundtruth/image-classification',
        confidence: 1,
        'job-name': 'classify-high-vis-vest',
        'class-name': LabelDatasetSlideComponent.Labels[labelIdx],
        'human-annotated': 'yes',
        'creation-date': new Date().toISOString().replace(/Z$/, ''),
      },
    };
  }
}
