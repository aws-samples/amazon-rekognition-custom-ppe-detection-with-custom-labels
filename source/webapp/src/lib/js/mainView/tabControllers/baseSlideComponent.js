// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import Localization from '../../shared/localization.js';
import AppUtils from '../../shared/appUtils.js';
import mxSpinner from '../../mixins/mxSpinner.js';
import mxAlert from '../../mixins/mxAlert.js';

export default class BaseSlideComponent extends mxAlert(mxSpinner(class {})) {
  constructor() {
    super();
    this.$ids = {
      slide: `slide-${AppUtils.randomHexstring()}`,
    };
    this.$slide = $('<div/>').addClass('container p-0 m-0 col-12')
      .append(this.createLoading());
    this.$initialized = false;
  }

  get ids() {
    return this.$ids;
  }

  get slideId() {
    return this.ids.slide;
  }

  get slide() {
    return this.$slide;
  }

  set slide(val) {
    this.$slide = val;
  }

  get initialized() {
    return this.$initialized;
  }

  set initialized(val) {
    this.$initialized = val;
  }

  getSlide() {
    return this.slide;
  }

  async show() {
    this.initialized = true;
    return this.slide;
  }

  async hide() {
    this.slide.children().remove()
      .append(this.createLoading());
    this.initialized = false;
  }

  saveData() {
    return this;
  }

  clearData() {
    return this;
  }

  async showAlert(message, duration) {
    return super.showMessage(this.slide, 'danger', Localization.Alerts.Oops, message, duration);
  }
}
