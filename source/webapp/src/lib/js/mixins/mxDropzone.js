// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0
import FileItem from '../shared/fileItem.js';

/**
 * @mixins mxDropzone
 * @description helper functions to create dropzone interface
 */
export default Base => class extends Base {
  constructor(...args) {
    super(...args);
    this.$group = undefined;
  }

  get group() {
    return this.$group;
  }

  set group(val) {
    this.$group = val;
  }

  createDropzone(message) {
    const background = $('<div/>').addClass('d-flex justify-content-center dropzone-bg')
      .append($('<span/>').addClass('align-self-center')
        .html(message));

    const dropzone = $('<div/>').addClass('dropzone')
      .append($('<p>').addClass('lead m-auto')
        .append(background));

    [
      'dragenter',
      'dragover',
      'dragleave',
      'drop',
    ].forEach((x) => {
      dropzone.off(x).on(x, (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
    });

    dropzone.on('dragenter', async (event) => {
    });

    dropzone.on('dragleave', async (event) => {
    });

    dropzone.on('drop', async (event) =>
      this.processDropEvent(event));
    return dropzone;
  }

  async processDropEvent(event) {
    try {
      if (typeof this.loading === 'function') {
        this.loading(true);
      }
      const files = await this.getAllFileItems(event.originalEvent.dataTransfer);
      const responses = await Promise.all(files.map(x => this.processEachFileItem(x)));
      return responses;
    } catch (e) {
      console.error(e);
      return undefined;
    } finally {
      if (typeof this.loading === 'function') {
        this.loading(false);
      }
    }
  }

  async getAllFileItems(data) {
    const promiseFiles = [];
    const promiseDirs = [];
    for (let i = 0; i < data.items.length; i++) {
      const entry = data.items[i].webkitGetAsEntry();
      if (entry.isFile) {
        promiseFiles.push(this.readFileEntry(entry));
      } else {
        promiseDirs.push(this.readDirectoryEntry(entry));
      }
    }
    const files = await Promise.all(promiseFiles);
    const dirs = await Promise.all(promiseDirs);
    const all = dirs.reduce((acc, cur) =>
      acc.concat(cur), files).filter(x => x);
    return all;
  }

  async readFileEntry(entry) {
    return new Promise((resolve, reject) => {
      entry.file(
        (file) =>
          resolve((FileItem.canSupport(file))
            ? new FileItem(entry.fullPath, file, this.group)
            : undefined),
        () =>
          resolve(undefined)
      );
    });
  }

  async readDirectoryEntry(dir) {
    const promise = await new Promise((resolve, reject) => {
      const reader = dir.createReader();
      reader.readEntries((entries) => {
        const promiseFiles = [];
        const promiseDirs = [];
        while (entries.length) {
          const entry = entries.shift();
          if (entry.isFile) {
            promiseFiles.push(this.readFileEntry(entry));
          } else {
            promiseDirs.push(this.readDirectoryEntry(entry));
          }
        }
        resolve({
          files: promiseFiles,
          dirs: promiseDirs,
        });
      });
    });

    const files = await Promise.all(promise.files);
    const dirs = await Promise.all(promise.dirs);
    return dirs.reduce((acc, cur) => acc.concat(cur), files);
  }

  async processEachFileItem(file) {
    throw new Error('subclass to implement');
  }
};
