// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import AppUtils from './shared/appUtils.js';
import LocalCache from './shared/localCache.js';
import MainView from './mainView/mainView.js';
import SignInFlow from './signIn/signInFlow.js';

export default class DemoApp {
  constructor() {
    this.$ids = {
      container: `app-${AppUtils.randomHexstring()}`,
    };
    const view = $('<div/>').attr('id', this.ids.container);

    const mainView = new MainView();
    mainView.appendTo(view);

    const signIn = new SignInFlow();
    signIn.appendTo(view);

    signIn.view.on(SignInFlow.Events.View.Hidden, () =>
      setTimeout(async () =>
        mainView.show(), 10));

    this.$signInFlow = signIn;
    this.$mainView = mainView;
    this.$view = view;
  }

  get ids() {
    return this.$ids;
  }

  get view() {
    return this.$view;
  }

  get mainView() {
    return this.$mainView;
  }

  get signInFlow() {
    return this.$signInFlow;
  }

  appendTo(parent) {
    parent.append(this.view);
  }

  async show() {
    this.hide();
    await this.openIndexedDB();
    return this.signInFlow.show();
  }

  async hide() {
    return this.closeIndexedDB().catch(() => undefined);
  }

  async openIndexedDB() {
    return Promise.all([
      LocalCache.getSingleton(),
    ].map(x => x.open().catch(() => undefined)));
  }

  async closeIndexedDB() {
    return Promise.all([
      LocalCache.getSingleton(),
    ].map(x => x.close().catch(() => undefined)));
  }
}

$(document).ready(async () => {
  const demoApp = new DemoApp();
  demoApp.appendTo($('#demo-app'));
  await demoApp.show();
  console.log('app loaded');

  $(window).on('unload', async () => {
    console.log('app unloading...');
    await demoApp.hide();
  });
});
