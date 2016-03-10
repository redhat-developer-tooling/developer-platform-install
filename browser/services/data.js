'use strict';

import InstallableItem from '../model/installable-item';
import Logger from './logger';

let os = require('os');
let path = require('path');
let fs = require('fs');
let electron = require('electron');

class InstallerDataService {
  constructor($state) {
    this.tmpDir = os.tmpdir();

    if (process.platform === 'win32') {
      this.installRoot = 'c:\\DeveloperPlatform';
    } else {
      this.installRoot = process.env.HOME + '/DeveloperPlatform';
  	}

    this.ipcRenderer = electron.ipcRenderer;
    this.router = $state;

    this.username = '';
    this.password = '';

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.downloading = false;
    this.installing = false;
  }

  setup(installRoot) {
    this.installRoot = installRoot;
    this.vboxRoot = path.join(this.installRoot, 'virtualbox');
    this.jdkRoot = path.join(this.installRoot, 'jdk8');
    this.jbdsRoot = path.join(this.installRoot, 'DeveloperStudio');
    this.vagrantRoot = path.join(this.installRoot, 'vagrant');
    this.cygwinRoot = path.join(this.installRoot, 'ssh-rsync');
    this.cdkRoot = path.join(this.installRoot, 'cdk');
    this.cdkBoxRoot = path.join(this.cdkRoot, 'boxes');
    this.ocBinRoot = path.join(this.cdkRoot, 'bin');
    this.cdkVagrantRoot = path.join(this.cdkRoot, 'openshift-vagrant');
    this.cdkMarkerFile = path.join(this.cdkVagrantRoot, '.cdk');

    Logger.initialize(this.installRoot);
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
  }

  getIpcRenderer() {
    return this.ipcRenderer;
  }

  getInstallable(key) {
    return this.installableItems.get(key);
  }

  allInstallables() {
    return this.installableItems;
  }

  getUsername() {
    return this.username;
  }

  getPassword() {
    return this.password;
  }

  setCredentials(username, password) {
    this.username = username;
    this.password = password;
  }

  virtualBoxDir() {
    return this.vboxRoot;
  }

  jdkDir() {
    return this.jdkRoot;
  }

  jbdsDir() {
    return this.jbdsRoot;
  }

  vagrantDir() {
    return this.vagrantRoot;
  }

  cygwinDir() {
    return this.cygwinRoot;
  }

  cdkDir() {
    return this.cdkRoot;
  }

  cdkBoxDir() {
    return this.cdkBoxRoot;
  }

  cdkVagrantfileDir() {
    return this.cdkVagrantRoot;
  }

  cdkMarker() {
    return this.cdkMarkerFile;
  }

  ocDir() {
    return this.ocBinRoot;
  }

  installDir() {
    return this.installRoot;
  }

  tempDir() {
    return this.tmpDir;
  }

  isDownloading() {
    return this.downloading;
  }

  isInstalling() {
    return this.installing;
  }

  startDownload(key) {
    Logger.info('Download started for: ' + key);

    if (!this.isDownloading()) {
      this.downloading = true;
    }
    this.toDownload.add(key);
  }

  downloadDone(progress, key) {
    Logger.info('Download finished for: ' + key);

    let item = this.getInstallable(key);
    item.setDownloadComplete();

    this.toDownload.delete(key);
    if (this.isDownloading() && this.toDownload.size == 0) {
      this.downloading = false;
      this.ipcRenderer.send('downloadingComplete', 'all');
    }

    this.startInstall(key);
    progress.installTrigger();

    return item.install(progress,
      () => {
        this.installDone(key);
      },
      (error) => {
        Logger.error(key + ' failed to install: ' + error);
      }
    );
  }

  startInstall(key) {
    Logger.info('Install started for: ' + key);

    if (!this.isInstalling()) {
      this.installing = true;
    }
    this.toInstall.add(key);
  }

  installDone(key) {
    Logger.info('Install finished for: ' + key);

    let item = this.getInstallable(key);
    item.setInstallComplete();

    this.ipcRenderer.send('installComplete', key);

    this.toInstall.delete(key);
    if (!this.isDownloading() && this.isInstalling() && this.toInstall.size == 0) {
      Logger.info('All installs complete');

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
