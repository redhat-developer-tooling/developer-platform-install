'use strict';

class InstallableItem {
  constructor(downloadUrl, installFile) {
    this.existingInstall = false;
    this.existingInstallLocation = "";
    this.useDownload = true;
    this.downloaded = false;
    this.installed = false;

    this.downloadUrl = downloadUrl;

    if (installFile != null && installFile != '') {
      this.useDownload = false;
      this.installFile = installFile;
    }
  }

  getDownloadUrl() {
    return this.downloadUrl;
  }

  isDownloaded() {
    return this.downloaded;
  }

  isInstalled() {
    return this.installed;
  }

  hasExistingInstall() {
    return this.existingInstall;
  }

  existingInstallLocation() {
    return this.existingInstallLocation;
  }

  isDownloadRequired() {
    return this.useDownload;
  }

  setDownloadComplete() {
    this.downloaded = true;
  }

  setInstallComplete() {
    this.installed = true;
  }

  checkForExistingInstall() {
    // To be overridden
  }

  downloadInstaller(progress, success, failure) {
    // To be overridden
    success();
  }

  install(progress, success, failure) {
    // To be overridden
    success();
  }
}

export default InstallableItem;
