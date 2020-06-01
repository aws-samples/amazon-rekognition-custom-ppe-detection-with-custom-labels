// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import BaseTab from './baseTab.js';
import DropzoneSlideComponent from './analysis/dropzoneSlideComponent.js';
import PreviewSlideComponent from './analysis/previewSlideComponent.js';

export default class AnalysisTab extends mxSpinner(BaseTab) {
  constructor(defaultTab = false) {
    super(Localization.Messages.AnalysisTab, {
      selected: defaultTab,
    });

    this.$ids = {
      ...super.ids,
      carousel: {
        container: `analysis-${AppUtils.randomHexstring()}`,
      },
    };

    this.$dropzoneComponent = new DropzoneSlideComponent();
    this.$previewComponent = new PreviewSlideComponent();
  }

  get ids() {
    return this.$ids;
  }

  get dropzoneComponent() {
    return this.$dropzoneComponent;
  }

  get previewComponent() {
    return this.$previewComponent;
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
    await this.dropzoneComponent.show();
    return super.show();
  }

  async createCarousel() {
    const dropzone = this.dropzoneComponent.getSlide();
    dropzone.on(DropzoneSlideComponent.Events.Slide.Media.Selected, async (event, media) => {
      this.loading(true);
      await this.previewComponent.setMedia(media);
      this.loading(false);
      this.slideTo(this.previewComponent.slideId);
    });
    const preview = this.previewComponent.getSlide();
    preview.on(PreviewSlideComponent.Events.Slide.Close, async () => {
      this.slideTo(this.dropzoneComponent.slideId);
    });
    const slides = [
      {
        id: this.dropzoneComponent.slideId,
        el: dropzone,
      },
      {
        id: this.previewComponent.slideId,
        el: preview,
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
      if (id === this.previewComponent.slideId) {
        return this.previewComponent.show();
      }
      if (id === this.dropzoneComponent.slideId) {
        return this.dropzoneComponent.show();
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
}
