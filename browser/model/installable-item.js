'use strict';

import Hash from './helpers/hash';
import Logger from '../services/logger';
import path from 'path';
import fs from 'fs-extra';
import Downloader from './helpers/downloader';
import {remote} from 'electron';
import mkdirp from 'mkdirp';

let ipcRenderer = require('electron').ipcRenderer;

class InstallableItem {
  constructor(keyName, downloadUrl, fileName, targetFolderName, installerDataSvc, authRequired) {
    this.keyName = keyName;
    this.fileName = fileName;
    let requirement = installerDataSvc.getRequirementByName(keyName);
    this.productName = requirement.name;
    this.productVersion = requirement.version;
    this.productDesc = requirement.description;
    this.isInstallable = requirement.installable;
    this.targetFolderName = targetFolderName;
    this.installerDataSvc = installerDataSvc;
    this.existingInstall = false;
    this.existingInstallLocation = '';
    this.existingVersion = '';
    this.useDownload = requirement.useDownload == undefined ? true : requirement.useDownload;
    this.downloaded = false;
    this.installed = false;
    this.size = requirement.size;
    this.installSize = requirement.installSize;
    this.version = requirement.version;
    this.channel = requirement.channel;

    this.detected = false;
    this.detectedVersion = 'unknown';
    this.detectedInstallLocation = '';

    if (downloadUrl == null || downloadUrl == '') {
      throw(new Error(`No download URL set for ${keyName} Installer`));
    }

    this.downloadUrl = downloadUrl;

    this.bundleFolder = remote && remote.getCurrentWindow().bundleTempFolder ? remote.getCurrentWindow().bundleTempFolder : path.normalize(path.join(__dirname, '../../../..'));
    this.userAgentString = remote && remote.getCurrentWindow().webContents.session.getUserAgent();
    this.bundledFile = path.join(this.bundleFolder, fileName);

    this.isCollapsed = true;
    this.option = new Set();
    this.selectedOption = requirement.defaultOption ? requirement.defaultOption : 'install';

    this.downloader = null;
    this.downloadFolder = path.join(this.installerDataSvc.localAppData(), 'cache');
    if(!fs.existsSync(this.downloadFolder)) {
      mkdirp.sync(this.downloadFolder);
    }
    this.downloadedFile = path.join(this.downloadFolder, fileName);

    if (requirement.file) {
      this.files = requirement.file;
    } else {
      this.files = {};
      this.files[this.keyName] = {
        dmUrl: downloadUrl,
        fileName: path.basename(fileName),
        sha256sum: requirement.sha256sum,
        size: this.size
      };
    }

    this.downloaded = true;

    for (let file in this.files) {
      if (!fs.existsSync(path.join(this.bundleFolder, this.files[file].fileName))) {
        if (fs.existsSync(path.join(this.downloadFolder, this.files[file].fileName))) {
          try {
            let stat = fs.statSync(path.join(this.downloadFolder, this.files[file].fileName));
            this.files[file].downloaded = stat && stat.size == this.files[file].size;
            this.downloaded = this.downloaded && this.files[file].downloaded;
          } catch (error) {
            this.downloaded = false;
            Logger.info(`${this.keyName} - fstat function failure ${error}`);
          }
        } else {
          this.downloaded = false;
        }
      } else {
        this.files[file].downloaded = true;
        this.downloadedFile = path.join(this.bundleFolder, this.files[file].fileName);
      }
    }

    this.installAfter = undefined;
    this.ipcRenderer = ipcRenderer;
    this.authRequired = authRequired;
    this.references = 0;

    this.messages = requirement.messages;
    this.totalDownloads = Object.keys(this.files).length;
  }

  getProductName() {
    return this.productName;
  }

  getProductVersion() {
    if(this.isDetected()) {
      return this.option[this.selectedOption].version;
    }
    return this.productVersion;
  }

  getProductDesc() {
    return this.productDesc;
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

  isDownloadRequired() {
    return !this.downloaded;
  }

  setDownloadComplete() {
    this.downloaded = true;
  }

  getDownloadStatus() {
    let status = 'No download required';
    if (this.size && this.size >= 0) {
      status = this.downloaded ? 'Previously downloaded' : 'Selected to download';
    }
    return status;
  }

  setInstallComplete() {
    this.installed = true;
  }

  detectExistingInstall () {
    return Promise.resolve();
  }

  checkForExistingInstall() {
    // To be overridden
  }

  validateVersion() {
    //to be overriden
  }

  downloadInstaller(progress, success, failure, downloader) {
    this.downloader = downloader ? downloader : new Downloader(progress, success, failure, this.totalDownloads, this.userAgentString);
    for (let file in this.files) {
      if (this.files[file].downloaded) {
        continue;
      }

      if (fs.existsSync(path.join(this.bundleFolder, this.files[file].fileName))) {
        this.files[file].downloadedFile = path.join(this.bundleFolder, this.files[file].fileName);
        this.downloader.closeHandler();
      } else {
        this.startDownload(
          path.join(this.downloadFolder, this.files[file].fileName),
          this.files[file].dmUrl,
          this.files[file].sha256sum,
          this.authRequired ? this.installerDataSvc.getUsername() : undefined,
          this.authRequired ? this.installerDataSvc.getPassword() : undefined,
          progress
        );
      }
    }
  }

  checkFiles() {
    let promise = Promise.resolve();
    for (let file in this.files) {
      if (fs.existsSync(path.join(this.downloadFolder, this.files[file].fileName))) {
        let h = new Hash();
        promise = promise.then(() => {
          return h.SHA256(path.join(this.downloadFolder, this.files[file].fileName));
        }).then((dlSha) => {
          if(this.files[file].sha256sum === dlSha) {
            Logger.info(`Using previously downloaded file='${this.files[file].fileName}' sha256='${dlSha}'`);
            this.files[file].downloaded = true;
          } else {
            this.downloaded = false;
            this.files[file].downloaded = false;
          }
        });
      }
    }
    return promise;
  }

  startDownload(downloadedFile, url, sha, user, pass) {
    if(user === undefined && pass === undefined ) {
      this.downloader.download(url, downloadedFile, sha, this);
    } else {
      this.downloader.downloadAuth(url, user, pass, downloadedFile, sha, this);
    }
  }

  install(progress, success, failure) {
    if( !this.getInstallAfter() || this.getInstallAfter().isInstalled() ) {
      progress.productName = this.productName;
      progress.productVersion = this.productVersion;
      progress.$timeout();
      this.installAfterRequirements(progress, success, failure);
    } else {
      this.ipcRenderer.on('installComplete', (event, arg) => {
        if (!this.isInstalled() && arg === this.getInstallAfter().keyName) {
          progress.productName = this.productName;
          progress.productVersion = this.productVersion;
          progress.$timeout();
          this.installAfterRequirements(progress, success, failure);
        }
      });
    }
  }

  installAfterRequirements(progress, success) {
    progress.setStatus('Installing');
    success && success(true);
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

  setOptionLocation(name, location) {
    if(this.option[name]) {
      this.option[name].location = location;
    }
  }

  // Override parent "true" and check if we have something setup
  isConfigured() {
    let t =
      this.selectedOption == 'install'
        || this.selectedOption == 'detected' && this.hasOption('detected') && this.option['detected'].valid
        || this.selectedOption == 'detected' && !this.hasOption('detected');
    return t;
  }

  isDetected() {
    return this.selectedOption == 'detected' && this.hasOption('detected');
  }

  isValidVersionDetected() {
    return this.hasOption('detected') && this.option['detected'].valid;
  }

  isInvalidVersionDetected() {
    return this.hasOption('detected') && !this.option['detected'].valid;
  }

  isNotDetected() {
    return !this.hasOption('detected');
  }

  isSkipped() {
    return this.selectedOption == 'detected';
  }

  isSelected() {
    return this.selectedOption == 'install';
  }

  getLocation() {
    return this.isDetected()
      ? this.option.detected.location
      : this.option.install.location;
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

  setup(progress, success ) {
    progress.setStatus('Setting up');
    progress.setComplete();
    success();
  }

  isDisabled() {
    return this.references > 0;
  }

  isConfigurationValid() {
    return true;
  }
}

function fromJson({keyName, installerDataSvc, downloadUrl, fileName, authRequired}) {
  return new InstallableItem(keyName, downloadUrl, fileName, '', installerDataSvc, authRequired);
}

InstallableItem.convertor = {fromJson};

export default InstallableItem;
