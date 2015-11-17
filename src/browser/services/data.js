'use strict';

import InstallableItem from '../model/installable-item';

class InstallerDataService {
  constructor($state) {
    this.router = $state;

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.downloading = false;
    this.installing = false;
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
  }

  getInstallable(key) {
    return this.installableItems.get(key);
  }

  allInstallables() {
    return this.installableItems;
  }

  isDownloading() {
    return this.downloading;
  }

  isInstalling() {
    return this.installing;
  }

  startDownload(key) {
    if (!this.isDownloading()) {
      this.downloading = true;
    }
    this.toDownload.add(key);
  }

  downloadDone(key) {
    let item = this.getInstallable(key);
    item.setDownloadComplete();

    this.toDownload.delete(key);
    if (this.isDownloading() && this.toDownload.size == 0) {
      this.downloading = false;
    }

    this.startInstall(key);
    return item.install(() => {
      this.installDone(key);
    });
  }

  startInstall(key) {
    if (!this.isInstalling()) {
      this.installing = true;
    }
    this.toInstall.add(key);
  }

  installDone(key) {
    let item = this.getInstallable(key);
    item.setInstallComplete();

    this.toInstall.delete(key);
    if (this.isInstalling() && this.toInstall.size == 0) {
      this.installing = false;
      this.router.go('start');
    }
  }

  static factory($state) {
    return new InstallerDataService($state);
  }
}

InstallerDataService.factory.$inject = ['$state'];

export default InstallerDataService;
