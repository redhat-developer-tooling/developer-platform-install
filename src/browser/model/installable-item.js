'use strict';

class InstallableItem {
  constructor(installRoot, tempDir, downloadUrl, installFile) {
    this.existingInstall = false;
    this.existingInstallLocation = "";
    this.useDownload = true;
    this.downloaded = false;
    this.installed = false;

    this.installRoot = installRoot;
    this.tempDir = tempDir;
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

  downloadInstaller(success, failure) {
    // To be overridden
    success();
  }

  install(success, failure) {
    // To be overridden
    success();
  }
}

export default InstallableItem;
