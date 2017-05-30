'use strict';

import Logger from './logger';
import Platform from '../services/platform';
import loadMetadata from '../services/metadata';
let os = require('os');
let path = require('path');
let fs = require('fs');
let fsExtra = require('fs-extra');
let electron = require('electron');
let mkdirp = require('mkdirp');
let pify = require('pify');
let child_process = require('child_process');

class InstallerDataService {
  constructor($state, requirements = require('../../requirements.json')) {
    this.tmpDir = os.tmpdir();

    if (Platform.OS === 'win32') {
      this.installRoot = 'c:\\DevelopmentSuite';
    } else {
      this.installRoot = '/Applications/DevelopmentSuite';
    }
    this.ipcRenderer = electron.ipcRenderer;
    this.router = $state;

    this.username = '';
    this.password = '';

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.toSetup = new Set();
    this.downloading = false;
    this.installing = false;
    this.requirements = loadMetadata(requirements, Platform.OS);
    // filter download-manager urls and replace host name with stage
    // host name provided in environment variable
    let stageHost = Platform.ENV['DM_STAGE_HOST'];
    if(stageHost) {
      for (let variable in this.requirements) {
        let dmUrl = this.requirements[variable].dmUrl;
        if (dmUrl && dmUrl.includes('download-manager/jdf/file')) {
          this.requirements[variable].dmUrl = dmUrl.replace('developers.redhat.com', stageHost);
        }
      }
    }
  }

  setup(vboxRoot, jdkRoot, devstudioRoot, cygwinRoot, cdkRoot, komposeRoot) {
    this.vboxRoot = vboxRoot || path.join(this.installRoot, 'virtualbox');
    this.jdkRoot = jdkRoot || path.join(this.installRoot, 'jdk8');
    this.devstudioRoot = devstudioRoot || path.join(this.installRoot, 'devstudio');
    this.cygwinRoot = cygwinRoot || path.join(this.installRoot, 'cygwin');
    this.komposeRoot = komposeRoot || path.join(this.installRoot, 'kompose');
    this.cdkRoot = cdkRoot || path.join(this.installRoot, 'cdk');
    this.cdkBoxRoot = this.cdkRoot;
    this.ocBinRoot = path.join(this.cdkRoot, 'bin');
    this.cdkMarkerFile = path.join(this.cdkRoot, '.cdk');

    if (!fs.existsSync(this.installRoot)) {
      mkdirp.sync(path.resolve(this.installRoot));
    }
    Logger.initialize(this.installRoot);
    if(Platform.OS === 'win32') {
      this.copyUninstaller();
    }
  }

  copyUninstaller() {
    let uninstallerLocation = path.resolve(this.installRoot, 'uninstaller');
    let uninstallerCreateLocation =path.resolve(uninstallerLocation, 'create-uninstaller.ps1');
    Logger.info(`Data - Create uninstaller in ${uninstallerLocation}`);
    mkdirp.sync(uninstallerLocation);
    let uninstallerPs1 = path.resolve(path.join(__dirname, '..', '..', 'uninstaller'));
    fsExtra.copy(uninstallerPs1, uninstallerLocation, (err) => {
      if (err) {
        Logger.error('Data - ' + err);
      } else {
        Logger.info('Data - Copy ' + uninstallerPs1 + ' to ' + uninstallerLocation + ' SUCCESS');
        let timeStamp = new Date().getTime();
        // replace ByPass to AllSigned
        pify(child_process.exec)(`powershell.exe -ExecutionPolicy ByPass -file "${uninstallerCreateLocation}" "${this.installRoot}" ${timeStamp} 1.4.0.GA`).then((stdout)=>{
          Logger.info(`Created registry item DevelopmentSuite${timeStamp} SUCCESS`);
        }).catch((error)=>{
          Logger.error('Data - ' + err);
        });
      }
    });
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
    this.toInstall.add(key);
  }

  addItemsToInstall(...items) {
    for (const item of items) {
      this.addItemToInstall(item.keyName, item);
    }
  }

  getInstallable(key) {
    return this.installableItems.get(key);
  }

  allInstallables() {
    return this.installableItems;
  }

  getRequirementByName(key) {
    let result = this.requirements[key];
    if(result) {
      return result;
    }
    throw Error(`Cannot find requested requirement ${key}`);
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

  devstudioDir() {
    return this.devstudioRoot;
  }

  cygwinDir() {
    return this.cygwinRoot;
  }

  komposeDir() {
    return this.komposeRoot;
  }

  cdkDir() {
    return this.cdkRoot;
  }

  cdkBoxDir() {
    return this.cdkBoxRoot;
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

    return item.install(progress,
      () => {
        this.installDone(progress, key);
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

  installDone(progress, key) {
    Logger.info('Install finished for: ' + key);

    let item = this.getInstallable(key);
    return item.setup(progress,
        () => {
          this.setupDone(progress, key);
        },
        (error) => {
          Logger.error(key + ' failed to install: ' + error);
        }
    );
  }

  setupDone(progress, key) {
    var item = this.getInstallable(key);
    if(!item.isSkipped()) {
      Logger.info('Setup finished for: ' + key);
    }

    this.ipcRenderer.send('installComplete', key);
    this.toInstall.delete(key);
    item.setInstallComplete();

    if (!this.isDownloading() && this.toInstall.size == 0) {
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
