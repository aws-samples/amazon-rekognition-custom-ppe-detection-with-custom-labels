// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import BaseTab from './baseTab.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import SelectTrainOptionsSlideComponent from './training/selectTrainOptionsSlideComponent.js';
import PrepareDatasetSlideComponent from './training/prepareDatasetSlideComponent.js';
import LabelDatasetSlideComponent from './training/labelDatasetSlideComponent.js';
import TrainModelSlideComponent from './training/trainModelSlideComponent.js';

export default class TrainingTab extends mxSpinner(BaseTab) {
  constructor(defaultTab = false) {
    super(Localization.Messages.TrainingTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `training-${AppUtils.randomHexstring()}`,
      },
    };
    this.$selectTrainOptionComponent = new SelectTrainOptionsSlideComponent();
    this.$prepareDatasetComponent = new PrepareDatasetSlideComponent();
    this.$labelDatasetComponent = new LabelDatasetSlideComponent();
    this.$trainModelComponent = new TrainModelSlideComponent();
  }

  get ids() {
    return this.$ids;
  }

  get prepareDatasetComponent() {
    return this.$prepareDatasetComponent;
  }

  get labelDatasetComponent() {
    return this.$labelDatasetComponent;
  }

  get selectTrainOptionComponent() {
    return this.$selectTrainOptionComponent;
  }

  get trainModelComponent() {
    return this.$trainModelComponent;
  }

  static get Events() {
    return {
      Tab: {
        Control: {
          Done: 'training:tab:control:done',
        },
      },
    };
  }

  async show() {
    if (this.initialized) {
      return super.show();
    }
    const carousel = await this.createCarousel();
    const row = $('<div/>').addClass('row no-gutters')
      .append(carousel)
      .append(this.createLoading());
    this.tabContent.append(row);
    await this.selectTrainOptionComponent.show();
    return super.show();
  }

  async createCarousel() {
    // routing logic
    const select = this.selectTrainOptionComponent.getSlide();
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.LabelDetection, async (event, dataset) =>
      this.slideTo(this.prepareDatasetComponent.slideId));
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.WithoutLabelDetection, async (event, dataset) =>
      this.slideTo(this.labelDatasetComponent.slideId));
    select.on(SelectTrainOptionsSlideComponent.Events.Slide.Control.SkipAll, async (event, dataset) => {
      this.trainModelComponent.setData(dataset);
      return this.slideTo(this.trainModelComponent.slideId);
    });

    const prepare = this.prepareDatasetComponent.getSlide();
    prepare.on(PrepareDatasetSlideComponent.Events.Slide.Control.Startover, async () =>
      this.slideToStartover());
    prepare.on(PrepareDatasetSlideComponent.Events.Slide.Control.Next, async (event, dataset) => {
      this.loading(true);
      await this.labelDatasetComponent.setData(dataset);
      this.loading(false);
      return this.slideTo(this.labelDatasetComponent.slideId);
    });

    const labeling = this.labelDatasetComponent.getSlide();
    labeling.on(LabelDatasetSlideComponent.Events.Slide.Control.Startover, async () =>
      this.slideToStartover());
    labeling.on(LabelDatasetSlideComponent.Events.Slide.Control.Back, async () =>
      ((this.selectTrainOptionComponent.selectedFlow === SelectTrainOptionsSlideComponent.Events.Slide.Control.WithoutLabelDetection)
        ? this.slideToStartover()
        : this.slideTo(this.prepareDatasetComponent.slideId)));
    labeling.on(LabelDatasetSlideComponent.Events.Slide.Control.Next, async (event, dataset) => {
      this.trainModelComponent.setData(dataset);
      return this.slideTo(this.trainModelComponent.slideId);
    });

    const training = this.trainModelComponent.getSlide();
    training.on(TrainModelSlideComponent.Events.Slide.Control.Cancel, async () =>
      this.slideToStartover());
    training.on(TrainModelSlideComponent.Events.Slide.Control.Done, async (event, arn) => {
      this.slideToStartover();
      this.eventSource.trigger(TrainingTab.Events.Tab.Control.Done, [arn]);
    });

    const slides = [
      {
        id: this.selectTrainOptionComponent.slideId,
        el: select,
      },
      {
        id: this.prepareDatasetComponent.slideId,
        el: prepare,
      },
      {
        id: this.labelDatasetComponent.slideId,
        el: labeling,
      },
      {
        id: this.trainModelComponent.slideId,
        el: training,
      },
    ];
    const inner = $('<div/>').addClass('carousel-inner');
    for (let i = 0; i < slides.length; i++) {
      const classes = (i === 0) ? 'carousel-item active' : 'carousel-item';
      inner.append($('<div/>').addClass(classes)
        .attr('id', slides[i].id)
        .append(slides[i].el));
    }
    const carousel = $('<div/>').addClass('carousel slide w-100')
      .attr('data-ride', false)
      .attr('data-interval', false)
      .attr('id', this.ids.carousel.container)
      .append(inner);
    carousel.on('slide.bs.carousel', async (event) => {
      const id = $(event.relatedTarget).prop('id');
      if (id === this.selectTrainOptionComponent.slideId) {
        return this.selectTrainOptionComponent.show();
      }
      if (id === this.prepareDatasetComponent.slideId) {
        return this.prepareDatasetComponent.show();
      }
      if (id === this.labelDatasetComponent.slideId) {
        return this.labelDatasetComponent.show();
      }
      if (id === this.trainModelComponent.slideId) {
        return this.trainModelComponent.show();
      }
      return undefined;
    });
    return carousel;
  }

  slideTo(id) {
    const carousel = this.tabContent.find(`#${this.ids.carousel.container}`).first();
    const idx = carousel.find(`#${id}`).index();
    carousel.carousel(idx);
  }

  slideToStartover() {
    this.clearData();
    return this.slideTo(this.selectTrainOptionComponent.slideId);
  }

  clearData() {
    this.trainModelComponent.clearData();
    this.labelDatasetComponent.clearData();
    this.prepareDatasetComponent.clearData();
    this.selectTrainOptionComponent.clearData();
  }
}
