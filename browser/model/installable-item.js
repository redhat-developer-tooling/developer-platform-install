'use strict';

class InstallableItem {
  constructor(keyName, productName, productVersion, productDesc, installTime, downloadUrl, installFile) {
    this.keyName = keyName;
    this.productName = productName;
    this.productVersion = productVersion;
    this.productDesc = productDesc;
    this.installTime = installTime;
    this.existingInstall = false;
    this.existingInstallLocation = '';
    this.useDownload = true;
    this.downloaded = false;
    this.installed = false;
    // We assume all items are going to be selected for installation
    this.selected = true;
    this.version = '';
    this.existingVersion = '';
    this.isCollapsed = true;

    if (downloadUrl == null || downloadUrl == '') {
    	throw(new Error('No download URL set'));
    }

    this.downloadUrl = downloadUrl;

    if (installFile != null && installFile != '') {
      this.useDownload = false;
      this.installFile = installFile;
    }
  }

  getProductName() {
    return this.productName;
  }

  getProductVersion() {
    return this.productVersion;
  }

  getProductDesc() {
    return this.productDesc;
  }

  getInstallTime() {
    return this.installTime;
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

  setup(progress, success, failure) {
    // To be overridden
    success();
  }

  isConfigured() {
    return true;
  }

  changeIsCollapsed() {
      this.isCollapsed = !this.isCollapsed;
  }

}

export default InstallableItem;
