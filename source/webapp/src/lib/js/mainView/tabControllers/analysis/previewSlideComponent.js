// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../../shared/localization.js';
import BaseSlideComponent from '../baseSlideComponent.js';

export default class PreviewSlideComponent extends BaseSlideComponent {
  constructor() {
    super();
    this.$media = undefined;
  }

  static get Events() {
    return {
      Slide: {
        Close: 'slide:preview:close',
      },
    };
  }

  get media() {
    return this.$media;
  }

  set media(val) {
    this.$media = val;
  }

  async setMedia(media) {
    if (this.media !== media) {
      await this.hide();
      this.media = media;
      await this.createSlide();
    }
    return super.show();
  }

  async show() {
    return this.slide;
  }

  async hide() {
    this.media = undefined;
    this.slide.children().remove();
    return super.hide();
  }

  async createSlide() {
    const close = this.createCloseButton();
    const preview = this.createPreview();
    const result = this.createResultView();
    this.slide.append($('<div/>').addClass('row no-gutters')
      .append(preview)
      .append(result)
      .append(close));
    return this.slide;
  }

  createCloseButton() {
    const icon = $('<i/>').addClass('far fa-times-circle text-secondary')
      .attr('data-toggle', 'tooltip')
      .attr('data-placement', 'bottom')
      .attr('title', Localization.Buttons.ClosePreview)
      .css('font-size', '1.8rem');
    icon.tooltip();

    const btn = $('<div/>').addClass('close-preview')
      .append($('<button/>').addClass('btn btn-sm btn-link')
        .attr('type', 'button')
        .append(icon));
    btn.off('click').on('click', async (event) => {
      event.preventDefault();
      this.slide.trigger(PreviewSlideComponent.Events.Slide.Close, [this.media]);
    });
    return btn;
  }

  createPreview() {
    const preview = $('<div/>').addClass('col-12 p-0 m-0')
      .append(this.createTitle())
      .append($('<div/>').addClass('col-12 p-0 m-0')
        .append(this.createImageView()));
    return preview;
  }

  createTitle() {
    return $('<div/>').addClass('col-9 p-0 mt-4 mx-auto')
      .append($('<p/>').addClass('lead')
        .html(this.media.displayName));
  }

  createImageView() {
    const container = $('<div/>').addClass('p-0 m-0');
    const canvases = $('<div/>').addClass('canvas-list');
    const image = $('<img/>').addClass('img-contain img-w100 area-selected')
      .attr('src', this.media.dataUrl);

    const overlay = $('<div/>').addClass('lead-sm collapse')
      .css('position', 'absolute')
      .css('top', '1rem')
      .css('left', '1rem')
      .html('no data');

    image.on('load', () => {
      const imageW = image.width();
      const imageH = image.height();
      const persons = this.media.analysis.Labels.filter(label =>
        label.Name === 'Person');
      for (let i = 0; i < persons.length; i++) {
        for (let j = 0; j < persons[i].Instances.length; j++) {
          const person = persons[i].Instances[j];
          const w = Math.min(Math.floor(person.BoundingBox.Width * imageW), imageW);
          const h = Math.min(Math.floor(person.BoundingBox.Height * imageH), imageH);
          const x0 = Math.max(Math.floor(person.BoundingBox.Left * imageW), 0);
          const y0 = Math.max(Math.floor(person.BoundingBox.Top * imageH), 0);
          const canvas = $('<canvas/>')
            .attr('width', w)
            .attr('height', h)
            .attr('data-toggle', 'tooltip')
            .attr('data-placement', 'bottom')
            .css('left', x0)
            .css('top', y0)
            .css('position', 'absolute')
            .tooltip();
          let title;
          const badge = $('<span/>').addClass('badge badge-pill lead-sm');
          if (!person.HasVest) {
            title = 'No data';
            badge.addClass('badge-secondary').html(title);
            canvas.addClass('area-nodata')
              .attr('title', title);
          } else if (person.HasVest.Value === true) {
            title = `Vest (${Number.parseFloat(person.HasVest.Confidence).toFixed(2)}%)`;
            badge.addClass('badge-success').html(title);
            canvas.addClass('area-vest')
              .attr('title', title);
          } else if (person.HasVest.Value === false) {
            title = `No vest (${Number.parseFloat(person.HasVest.Confidence).toFixed(2)}%)`;
            badge.addClass('badge-danger').html(title);
            canvas.addClass('area-novest')
              .attr('title', title);
          }
          canvas.hover(() =>
            overlay.html(badge.prop('outerHTML')).removeClass('collapse'), () =>
            overlay.html(badge.prop('outerHTML')).addClass('collapse'));
          canvases.append(canvas);
        }
      }
      canvases.append(overlay);
    });
    container.append(image).append(canvases);

    const view = $('<div/>').addClass('col-8 p-0 m-0')
      .append(container);
    const legend = this.createLegend();
    return $('<div/>').addClass('col-9 p-0 m-4 mx-auto d-flex')
      .append(view)
      .append(legend);
  }

  createResultView() {
    return $('<div/>').addClass('col-12 p-0 m-0 bg-light')
      .append($('<div/>').addClass('col-9 p-0 m-4 mx-auto')
        .append(this.createJsonView())
        .append(this.createMetricView()));
  }

  createJsonView() {
    const analysis = this.media.analysis;
    const code = $('<pre/>').addClass('ml-2 lead-xxs collapse')
      .append(JSON.stringify(analysis, null, 2));
    const download = $('<a/>').addClass('btn btn-sm btn-link text-lowercase')
      .attr('role', 'button')
      .attr('href', this.media.signJsonOutUrl())
      .attr('target', '_blank')
      .attr('download', `${this.media.basename}.json`)
      .html(`(${Localization.Messages.Download})`);

    const viewJson = $('<details/>').addClass('py-1')
      .append($('<summary/>')
        .append($('<span/>').addClass('lead-sm')
          .append(Localization.Messages.ViewJson)
          .append(download)))
      .append(code);

    viewJson.off('toggle').on('toggle', () =>
      ((viewJson[0].open)
        ? code.removeClass('collapse')
        : code.addClass('collapse')));
    return viewJson;
  }

  createMetricView() {
    const metric = this.media.metric || {};
    const container = $('<details/>').addClass('py-1')
      .append($('<summary/>')
        .append($('<span/>').addClass('lead-sm')
          .html(Localization.Messages.ViewMetric)));
    const keys = Object.keys(metric);
    keys.forEach((key) => {
      const details = $('<details/>').addClass('row lead-xs ml-2')
        .append($('<summary/>')
          .append($('<span/>').addClass('lead-sm')
            .html(key)));
      const dl = $('<dl/>').addClass('row lead-xs ml-2');
      Object.keys(metric[key]).forEach((key0) => {
        const val0 = (key0 === 'startTime' || key0 === 'endTime')
          ? new Date(metric[key][key0]).toISOString()
          : metric[key][key0];
        dl.append($('<dt/>').addClass('text-left col-sm-1')
          .append(key0))
          .append($('<dd/>').addClass('text-left col-sm-4')
            .append(val0))
          .append($('<div/>').addClass('w-100'));
      });
      details.append(dl);
      container.append(details);
    });
    return container;
  }

  createLegend() {
    const instances = [];
    const persons = this.media.analysis.Labels.filter(label =>
      label.Name === 'Person');
    for (let i = 0; i < persons.length; i++) {
      instances.splice(instances.length, 0, ...persons[i].Instances);
    }
    const legend = $('<dl/>').addClass('row lead-xs ml-2')
      .append($('<dt/>').addClass('text-left col-sm-9')
        .append('Total people detected'))
      .append($('<dd/>').addClass('col-sm-3')
        .append(instances.length))
      .append($('<dt/>').addClass('text-left col-sm-9')
        .append($('<canvas/>').addClass('area-vest mr-2')
          .attr('width', '10rem')
          .attr('height', '8rem'))
        .append('Vest(s)'))
      .append($('<dd/>').addClass('col-sm-3')
        .append(instances.filter(x => x.HasVest && x.HasVest.Value).length))
      .append($('<dt/>').addClass('text-left col-sm-9')
        .append($('<canvas/>').addClass('area-novest mr-2')
          .attr('width', '10rem')
          .attr('height', '8rem'))
        .append('Without vest(s)'))
      .append($('<dd/>').addClass('col-sm-3')
        .append(instances.filter(x => x.HasVest && !x.HasVest.Value).length))
      .append($('<dt/>').addClass('text-left col-sm-9')
        .append($('<canvas/>').addClass('area-nodata mr-2')
          .attr('width', '10rem')
          .attr('height', '8rem'))
        .append('Unconfirmed'))
      .append($('<dd/>').addClass('col-sm-3')
        .append(instances.filter(x => x.HasVest === undefined).length));

    return $('<div/>').addClass('col-4 p-0 mt-4')
      .append(legend);
  }
}
