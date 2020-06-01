// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import SolutionManifest from '/solution-manifest.js';
import Localization from '../../../shared/localization.js';
import LocalCache from '../../../shared/localCache.js';
import {
  AWSConsoleRekogntion,
} from '../../../shared/awsConsole.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class SelectTrainOptionsSlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    this.$selectedFlow = undefined;
    this.$localCache = LocalCache.getSingleton();
  }

  get selectedFlow() {
    return this.$selectedFlow;
  }

  set selectedFlow(val) {
    this.$selectedFlow = val;
  }

  get localCache() {
    return this.$localCache;
  }

  static get Events() {
    return {
      Slide: {
        Control: {
          LabelDetection: 'select:slide:control:labeldetection',
          WithoutLabelDetection: 'select:slide:control:wolabeldetection',
          SkipAll: 'select:slide:control:skipall',
        },
      },
    };
  }

  static get Samples() {
    return {
      Option1: [
        'pexels-photo-1108101.jpg',
        'pexels-photo-159306.jpg',
        'pexels-photo-901941.jpg',
        'unsplash-photo-1529088746738-c4c0a152fb2c.jpg',
        'unsplash-photo-1553429938-0c318ee3de7a.jpg',
        'unsplash-photo-1560872952-142f67294080.jpg',
        'unsplash-photo-1588931294038-079a39173e8c.jpg',
        'unsplash-photo-1589939705384-5185137a7f0f.jpg',
      ],
      Option2: [
        'pexels-photo-1108101-355.00,590.00,386.00,65.00.jpg',
        'pexels-photo-1216589-425.00,571.00,290.00,84.00.jpg',
        // 'pexels-photo-1216589-460.00,607.00,502.00,52.00.jpg',
        'pexels-photo-2760243-389.00,430.00,292.00,226.00.jpg',
        // 'pexels-photo-3680959-316.00,535.00,167.00,119.00.jpg',
        'pexels-photo-3680959-513.00,577.00,309.00,82.00.jpg',
        'pexels-photo-544966-481.00,476.00,304.00,43.00.jpg',
        'pexels-photo-591.00,486.00,274.00,101.00.jpg',
        'unsplash-photo-1550496236-ebe36e6f7a92-457.00,433.00,295.00,92.00.jpg',
        'unsplash-photo-1580810734868-7ea4e9130c01-153.00,427.00,308.00,134.00.jpg',
      ],
    };
  }

  static getOption1ImageUrl(id) {
    return `/images/option-1/${id}`;
  }

  static getOption2ImageUrl(id) {
    return `/images/option-2/${id}`;
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const description = $('<p/>').addClass('lead')
      .html(Localization.Messages.SelectTrainingOptionsDesc);

    const useLabelDetection = await this.createOptionWithLabelDetection();
    const skipLabelDetection = await this.createOptionWithoutLabelDetection();
    const optionManual = await this.createOptionManual();

    const row = $('<div/>').addClass('row no-gutters')
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 ml-0 mx-auto')
          .append(description)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(useLabelDetection)))
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(skipLabelDetection)))
      .append($('<div/>').addClass('col-12 p-0 m-0 bg-light')
        .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
          .append(optionManual)));

    this.slide.append(row);
    return super.show();
  }

  async createOptionWithLabelDetection() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const description = $('<span/>').addClass('lead-sm')
      .append(Localization.Messages.OptionWithLabelDetection);

    const samples = $('<div/>').addClass('cards row no-gutters mt-4');
    const images = await Promise.all(SelectTrainOptionsSlideComponent.Samples.Option1.map(x =>
      this.localCache.getImageURL(x, {
        url: SelectTrainOptionsSlideComponent.getOption1ImageUrl(x),
      })));
    images.forEach((url) => {
      const img = $('<img/>').addClass('mr-2 mb-2')
        .attr('src', url)
        .attr('width', 128)
        .attr('height', 128)
        .css('object-fit', 'cover');
      samples.append(img);
    });

    const btn = $('<button/>').addClass('btn btn-success d-flex mx-auto mt-2')
      .append(Localization.Buttons.SelectOption);

    btn.off('click').on('click', () =>
      this.selectFlow(SelectTrainOptionsSlideComponent.Events.Slide.Control.LabelDetection));

    return row.append(col12.append(description)
      .append(samples)
      .append(btn));
  }

  async createOptionWithoutLabelDetection() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const description = $('<span/>').addClass('lead-sm')
      .append(Localization.Messages.OptionWithoutLabelDetection);

    const samples = $('<div/>').addClass('cards row no-gutters mt-4');
    const images = await Promise.all(SelectTrainOptionsSlideComponent.Samples.Option2.map(x =>
      this.localCache.getImageURL(x, {
        url: SelectTrainOptionsSlideComponent.getOption2ImageUrl(x),
      })));
    images.forEach((url) => {
      const img = $('<img/>').addClass('mr-2 mb-2')
        .attr('src', url)
        .attr('width', 128)
        .attr('height', 128)
        .css('object-fit', 'cover');
      samples.append(img);
    });

    const btn = $('<button/>').addClass('btn btn-success d-flex mx-auto mt-2')
      .append(Localization.Buttons.SelectOption);

    btn.off('click').on('click', () =>
      this.selectFlow(SelectTrainOptionsSlideComponent.Events.Slide.Control.WithoutLabelDetection));

    return row.append(col12.append(description)
      .append(samples)
      .append(btn));
  }

  async createOptionManual() {
    const row = $('<div/>').addClass('row ml-1');
    const col12 = $('<div/>').addClass('col-12 p-0 m-0');

    const url = AWSConsoleRekogntion.getProjectLink(SolutionManifest.CustomLabels.Project.Name);
    const message = Localization.Messages.OptionManual.replace('{{PROJECT_URL}}', url);
    const description = $('<span/>').addClass('lead-sm')
      .append(message);

    return row.append(col12.append(description));
  }

  selectFlow(id, data) {
    this.selectedFlow = id;
    return this.slide.trigger(id, [data]);
  }

  clearData() {
    // this.selectFlow = undefined;
    return super.clearData();
  }
}
