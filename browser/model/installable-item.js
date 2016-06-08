'use strict';

class InstallableItem {
  constructor(keyName, productName, productVersion, productDesc, installTime, downloadUrl, installFile, targetFolderName, installerDataSvc) {
    this.keyName = keyName;
    this.productName = productName;
    this.productVersion = productVersion;
    this.productDesc = productDesc;
    this.installTime = installTime;
    this.targetFolderName = targetFolderName;
    this.installerDataSvc = installerDataSvc;
    this.existingInstall = false;
    this.existingInstallLocation = '';
    this.existingVersion = '';
    this.useDownload = true;
    this.downloaded = false;
    this.installed = false;

    this.selected = true;
    this.version = '';

    this.detected = false;
    this.detectedVersion = 'unknown';
    this.detectedInstallLocation = '';

    if (downloadUrl == null || downloadUrl == '') {
    	throw(new Error('No download URL set'));
    }

    this.downloadUrl = downloadUrl;

    if (installFile != null && installFile != '') {
      this.useDownload = false;
      this.installFile = installFile;
    }

    this.isCollapsed = true;
    this.option = new Set();
    this.selectedOption = "install";

    this.downloader = null;
  }

  getProductName() {
    return this.productName;
  }

  getProductVersion() {
    if(this.hasOption(this.selectedOption) && this.selectedOption==='detected') {
      return this.option[this.selectedOption].version;
    }
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

  changeIsCollapsed() {
      this.isCollapsed = !this.isCollapsed;
  }

  hasOption(name) {
    return this.option[name]!=undefined;
  }

  addOption(name, version, location, valid) {
    this.option[name] = {
      'version'  : version,
      'location' : location,
      'valid'    : valid,
      'error'    : '',
      'warning'  : ''
    };
  }

  setOptionLocation(name,location) {
    if(this.option[name]) {
      this.option[name].location = location;
    }
  }

  // Override parent "true" and check if we have something setup
  isConfigured() {
    let t =
      this.selectedOption == 'install'
        ||
      this.selectedOption == 'detected' && this.hasOption('detected') && this.option['detected'].valid
        ||
      this.selectedOption == 'detected' && !this.hasOption('detected');
    return t;
  }

  isSkipped() {
    let t = this.selectedOption == 'detected' && !this.hasOption('detected');
    return t;
  }


  getLocation() {
    return this.isSkipped() ? "" : this.option[this.selectedOption].location;
  }

  validateVersion() {

  }

  restartDownload() {
    this.downloader.restartDownload();
  }

}

export default InstallableItem;
