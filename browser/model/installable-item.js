'use strict';

import Util from './helpers/util';
import Hash from './helpers/hash';
import Logger from '../services/logger';
import path from 'path';
import fs from 'fs-extra';
import Downloader from './helpers/downloader';

let ipcRenderer = require('electron').ipcRenderer;

class InstallableItem {
  constructor(keyName, installTime, downloadUrl, installFile, targetFolderName, installerDataSvc, authRequired) {
    this.keyName = keyName;

    let requirement = installerDataSvc.getRequirementByName(keyName);

    this.productName = requirement.name;
    this.productVersion = requirement.version;
    this.productDesc = requirement.description;
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
    this.version = requirement.version;

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
    this.downloadFolder = path.normalize(path.join(__dirname,"../../../.."));

    this.installAfter = undefined;
    this.ipcRenderer = ipcRenderer;
    this.authRequired = authRequired;
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
    progress.setStatus('Downloading');
    this.downloader = new Downloader(progress, success, failure);
    this.downloadedFile = this.checkAndDownload(
      this.bundledFile,
      this.downloadedFile,
      this.downloadUrl,
      this.sha256,
      this.authRequired ? this.installerDataSvc.getUsername() : undefined,
      this.authRequired ? this.installerDataSvc.getPassword() : undefined,
      );
  }

  checkAndDownload(bundledFile,downloadedFile,url,sha,user,pass) {
    if(fs.existsSync(bundledFile)) {
      this.downloader.closeHandler();
      return bundledFile;
    } else {
      if(fs.existsSync(downloadedFile)) {
        let h = new Hash();
        h.SHA256(downloadedFile,(dlSha) => {
          if(sha === dlSha) {
            Logger.info(`Using previously downloaded file='${downloadedFile}' sha256='${dlSha}'`);
            this.downloader.successHandler(downloadedFile);
          } else {
            this.startDownload(downloadedFile,url,sha,user,pass);
          }
        });
      } else {
        this.startDownload(downloadedFile,url,sha,user,pass);
      }
      return downloadedFile;
    }
  }

  startDownload(downloadedFile,url,sha,user,pass) {
    let ws = fs.createWriteStream(downloadedFile);
    this.downloader.setWriteStream(ws);
    if(user === undefined && pass === undefined ) {
      this.downloader.download(url,downloadedFile,sha);
    } else {
      this.downloader.downloadAuth(url,user,pass,downloadedFile,sha);
    }
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

  getInstallAfter() {
    let installable = this.installAfter;
    while ( installable !== undefined && installable.isSkipped()) {
      installable = installable.installAfter;
    }
    return installable;
  }

  thenInstall(installer) {
    installer.installAfter = this;
    return installer;
  }

}

export default InstallableItem;
