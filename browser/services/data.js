'use strict';

import os from 'os';
import fs from 'fs';
import path from 'path';
import pify from 'pify';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import Logger from './logger';
import fsExtra from 'fs-extra';
import electron from 'electron';
import child_process from'child_process';
import Platform from '../services/platform';
import TokenStore from './credentialManager';
import loadMetadata from '../services/metadata';
import Downloader from '../model/helpers/downloader';


class InstallerDataService {

  constructor($state, requirements = require('../../requirements.json'), packageConf = require('../../package.json')) {
    this.tmpDir = os.tmpdir();

    this.installRoot = path.join(Platform.getProgramFilesPath(), 'DevelopmentSuite');
    this.ipcRenderer = electron.ipcRenderer;
    this.router = $state;
    this.packageConf = packageConf;

    this.username = TokenStore.getUserName();
    this.rememberMe = TokenStore.getStatus();
    if (!this.rememberMe) {
      let dataFilePath = path.join(Platform.localAppData(), 'settings.json');
      if(fs.existsSync(dataFilePath)) {
        TokenStore.deleteItem('login', this.username);
        this.username = '';
        this.password = '';
        rimraf.sync(dataFilePath);
      }
    }
    this.password = '';
    if (this.username) {
      let password = TokenStore.getItem('login', this.username);
      password.then((pass) => {
        if(pass && pass !=='') {
          this.password = pass;
        }
      });
    }

    this.installableItems = new Map();
    this.toDownload = new Set();
    this.toInstall = new Set();
    this.toSetup = new Set();
    this.downloading = false;
    this.installing = false;
    this.failedDownloads = new Set();
    this.requirements = loadMetadata(requirements, Platform.getOS());
    // filter download-manager urls and replace host name with stage
    // host name provided in environment variable
    let stageHost = Platform.ENV['DM_STAGE_HOST'];
    if(stageHost) {
      for (let variable in this.requirements) {
        let dmUrl = this.requirements[variable].dmUrl;
        if (dmUrl && dmUrl.includes('download-manager/jdf')) {
          this.requirements[variable].dmUrl = dmUrl.replace('developers.redhat.com', stageHost);
        } if(this.requirements[variable].file) {
          let files = Object.keys(this.requirements[variable].file).map(file=>{
            return this.requirements[variable].file[file];
          });
          files.forEach(function(file) {
            if (file.dmUrl && file.dmUrl.includes('download-manager/jdf/')) {
              file.dmUrl = file.dmUrl.replace('developers.redhat.com', stageHost);
            }
          });
        }
      }
    }
  }

  setup(vboxRoot, jdkRoot, devstudioRoot, jbosseapRoot, cygwinRoot, cdkRoot, komposeRoot, fuseplatformRoot, fuseplatformkarafRoot) {
    this.vboxRoot = vboxRoot || path.join(this.installRoot, 'virtualbox');
    this.jdkRoot = jdkRoot || path.join(this.installRoot, 'jdk8');
    this.devstudioRoot = devstudioRoot || path.join(this.installRoot, 'devstudio');
    this.jbosseapRoot = jbosseapRoot || path.join(this.installRoot, 'jbosseap');
    this.fuseplatformRoot = fuseplatformRoot || path.join(this.installRoot, 'fuseplatform');
    this.fuseplatformkarafRoot = fuseplatformkarafRoot || path.join(this.installRoot, 'fuseplatformkaraf');
    this.cygwinRoot = cygwinRoot || path.join(this.installRoot, 'cygwin');
    this.komposeRoot = komposeRoot || path.join(this.installRoot, 'kompose');
    this.cdkRoot = cdkRoot || path.join(this.installRoot, 'cdk');
    this.cdkBoxRoot = this.cdkRoot;
    this.ocBinRoot = path.join(this.cdkRoot, 'bin');
    this.cdkMarkerFile = path.join(this.cdkRoot, '.cdk');
  }

  setupTargetFolder() {
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
        pify(child_process.exec)(`powershell.exe -ExecutionPolicy ByPass -file "${uninstallerCreateLocation}" "${this.installRoot}" ${timeStamp} ${this.packageConf.version}`).then(()=>{
          Logger.info(`Created registry item DevelopmentSuite${timeStamp} SUCCESS`);
        }).catch((error)=>{
          Logger.error('Data - ' + error);
        });
      }
    });
  }

  addItemToInstall(key, item) {
    this.installableItems.set(key, item);
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

  jbosseapDir() {
    return this.jbosseapRoot;
  }

  fuseplatformDir() {
    return this.fuseplatformRoot;
  }

  fuseplatformkarafDir() {
    return this.fuseplatformkarafRoot;
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

  localAppData() {
    return Platform.localAppData();
  }

  isDownloading() {
    return this.downloading;
  }

  isInstalling() {
    return this.installing;
  }

  verifyExistingFiles(progress, ...keys) {
    let promise = Promise.resolve();
    if (keys.length < 1) {
      this.ipcRenderer.send('checkComplete', 'all');
      return promise;
    }
    progress.setStatus('Verifying previously downloaded components');
    progress.setTotalAmount(keys.length);
    progress.setCurrent(1);

    for (let i = 0; i < keys.length; i++) {
      promise = promise.then(() => {
        progress.productVersion = this.getInstallable(keys[i]).productVersion;
        progress.setProductName(this.getInstallable(keys[i]).productName);
        return this.getInstallable(keys[i]).checkFiles();
      }).then(() => {
        progress.setCurrent(progress.currentAmount + 1);
      });
    }
    return promise.then(() => {
      this.ipcRenderer.send('checkComplete', 'all');
    });
  }

  download(progress, totalDownloads, userAgent, ...keys) {
    let success = () => {
      this.downloading = false;
      this.ipcRenderer.send('downloadingComplete', 'all');
    };

    if (keys.length < 1) {
      return success();
    }

    this.downloader = new Downloader(progress, success,
      (error) => {
        Logger.error('Download failed with: ' + error);
        progress.setStatus('Download Failed');
        this.failedDownloads.add(this.downloader);
      },
      totalDownloads,
      userAgent
    );
    progress.setStatus('Downloading');

    if (!this.isDownloading()) {
      this.downloading = true;
    }

    for (let key of keys) {
      Logger.info('Download started for: ' + key);
      this.getInstallable(key).downloadInstaller(
        progress,
        undefined,
        undefined,
        this.downloader
      );
    }
  }

  restartDownload() {
    Logger.info('Restarting download');
    this.downloader.restartDownload();
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
      this.ipcRenderer.send('installComplete', 'all');
    }
  }

  verifyFiles(progress) {
    let toCheck = [];
    for (let [key, value] of this.allInstallables().entries()) {
      let downloaded = true;
      for (let file in value.files) {
        downloaded = downloaded && value.files[file].downloaded && value.downloadedFile !== value.bundledFile;
      }
      if (!value.isSkipped() && downloaded) {
        toCheck.push(key);
      }
    }
    this.verifyExistingFiles(progress, ...toCheck);
  }

  downloadFiles(progress, userAgent) {
    let toDownload = [];
    let totalAmount = 0;
    let totalDownloads = 0
    this.allInstallables().forEach((value, key) => {
      if(!value.isSkipped() && value.isDownloadRequired()) {
        toDownload.push(key);
        for (let file in value.files) {
          if (!value.files[file].downloaded) {
            totalAmount += value.files[file].size;
            totalDownloads++;
          }
        }
      }
    });

    progress.setTotalAmount(totalAmount);
    this.download(progress, totalDownloads, userAgent, ...toDownload);
  }

  processInstall(progress) {
    let totalItems = 0;
    this.allInstallables().forEach((value) => {
      if(!value.isSkipped()) {
        totalItems++;
      }
    });

    progress.setStatus('Installing');
    progress.setTotalAmount(totalItems);
    progress.setCurrent(1);

    for (let [key, value] of this.allInstallables().entries()) {
      if(!value.isSkipped()) {
        this.triggerInstall(key, value, progress);
      }
    }
  }

  triggerInstall(installableKey, installableValue, progress) {
    this.startInstall(installableKey);
    installableValue.install(progress,
      () => {
        progress.setCurrent(progress.currentAmount+1);
        this.installDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to install: ' + error);
      }
    );
  }

  static factory($state) {
    return new InstallerDataService($state);
  }
}

InstallerDataService.factory.$inject = ['$state'];

export default InstallerDataService;
