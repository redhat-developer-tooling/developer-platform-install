'use strict';

import Logger from '../../services/logger';
import duration from 'humanize-duration';
import humanize from 'humanize';
import Downloader from '../../model/helpers/downloader';
import Platform from '../../services/platform';

class InstallController {
  constructor($scope, $timeout, installerDataSvc, electron) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    this.electron.ipcRenderer.setMaxListeners(0);
    this.failedDownloads = new Set();
    this.totalAmount = 0;
    this.installerDataSvc.setupTargetFolder();

    this.data = {};
    this.totalDownloads = 0;
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(!value.isSkipped()) {
        if(value.isDownloadRequired()) {
          this.totalDownloads += value.totalDownloads;
        }
        this.totalAmount += value.size;
      }
    }
    this.itemProgress = new ProgressState('', undefined, undefined, undefined, this.$scope, this.$timeout);
    this.data.progress = this.itemProgress;
    this.downloader = new Downloader(this.itemProgress,
      ()=> {
        this.installerDataSvc.downloading = false;
        this.processInstall();
      },
      (error) => {
        Logger.error('Download filed with: ' + error);
        this.itemProgress.setStatus('Download Failed');
        this.failedDownloads.add(this.downloader);
      },
      this.totalDownloads
    );
    this.itemProgress.setTotalAmount(this.totalAmount);
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(value.isSkipped()) {
        this.installerDataSvc.setupDone(this.itemProgress, key);
      } else {
        this.processInstallable(key, value);
      }
    }
    this.$scope.data = this.data;

    this.electron.ipcRenderer.on('installComplete', (event, key)=>{
      if(key == 'all') {
        this.itemProgress.current = 100;
        this.$timeout();
        this.$timeout(()=>{
          this.installerDataSvc.router.go('start');
        },700);
      }
    });
  }

  processInstallable(key, value) {
    if(value.isDownloadRequired()) {
      this.triggerDownload(key, value);
    }
  }

  triggerDownload(installableKey, installableValue) {
    this.installerDataSvc.startDownload(installableKey);
    installableValue.downloadInstaller(
      this.itemProgress,
      undefined,
      undefined,
      this.downloader
    );
  }

  platformDetect() {
    if(Platform.OS == 'darwin') {
      return true;
    }
  }

  downloadAgain() {
    Logger.info('Restarting download');
    this.closeDownloadAgainDialog();
    this.downloader.restartDownload();
  }

  closeDownloadAgainDialog() {
    this.failedDownloads.clear();
  }

  processInstall() {

    let totalItems = 0;
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(!value.isSkipped()) {
        totalItems++;
      }
    }
    this.itemProgress.setStatus('Installing');
    this.itemProgress.setTotalAmount(totalItems);
    this.itemProgress.setCurrent(1);

    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(!value.isSkipped()) {
        this.triggerInstall(key, value, this.itemProgress);
      }
    }
  }

  triggerInstall(installableKey, installableValue, progress) {
    this.installerDataSvc.startInstall(installableKey);
    installableValue.install(progress,
      () => {
        this.itemProgress.setCurrent(this.itemProgress.currentAmount+1);
        this.installerDataSvc.installDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to install: ' + error);
      }
    );
  }

  showLog() {
    this.electron.shell.openItem(this.installerDataSvc.installRoot + '/install.log');
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }
}

const smoothFactor =  0.15;
const shortDuration = {
  language: 'shortEn',
  round: true,
  spacer: ' ',
  delimiter: ' ',
  largest: 2,
  languages: {
    shortEn: {
      y: function(c) { return 'year' + (c === 1 ? '' : 's'); },
      d: function(c) { return 'day' + (c === 1 ? '' : 's'); },
      h: function(c) { return 'hr' + (c === 1 ? '' : 's'); },
      m: function(c) { return 'min' + (c === 1 ? '' : 's'); },
      s: function(c) { return 'sec' + (c === 1 ? '' : 's'); }
    }
  }
};

class ProgressState {
  constructor(key, productName, productVersion, productDesc, $scope, $timeout = function() {}, minValue=0, maxValue=100) {
    this.key = key;
    this.productName = productName;
    this.productVersion = productVersion;
    this.productDesc = productDesc;
    this.$timeout = $timeout;
    this.$scope = $scope;
    this.current = 0;
    this.label = '';
    this.status = '';
    this.currentAmount = 0;
    this.lastAmount = 0;
    this.totalAmount = 0;
    this.min = minValue;
    this.max = maxValue;
    this.lastTime = Date.now();
    this.averageSpeed = 0;
    this.durationFormat = duration.humanizer(Object.assign({}, shortDuration));
    this.durationFormat.units = ['y', 'd', 'h', 'm'];
  }

  setTotalAmount(size) {
    this.totalAmount = size;
  }

  setCurrent(newVal) {
    if (newVal <= this.totalAmount) {
      this.lastAmount = this.currentAmount;
      this.currentAmount = newVal;

      let remaining = this.calculateTime();
      if (remaining < 60 * 1000) {
        this.durationFormat.units.push('s');
      }

      if (this.status === 'Downloading') {
        this.current = Math.round(this.currentAmount / this.totalAmount * 100);
        this.label = this.sizeInKB(this.currentAmount) + ' / ' + this.sizeInKB(this.totalAmount) + ' (' + this.current + '%), ' + this.durationFormat(remaining) + ' left';
      } else if(this.status === 'Installing'){
        this.current = Math.round((this.currentAmount-1) / this.totalAmount * 100);
        this.label = this.currentAmount + ' out of ' + this.totalAmount ;
      }
      this.$timeout();
    }
  }

  calculateTime() {
    let currentTime = new Date();
    this.lastSpeed = (this.currentAmount - this.lastAmount) / (currentTime.getTime() - this.lastTime);
    this.lastTime = currentTime;
    this.averageSpeed = this.averageSpeed === 0 ? this.lastSpeed : smoothFactor * this.lastSpeed + (1 - smoothFactor) * this.averageSpeed;

    return (this.totalAmount - this.currentAmount) / this.averageSpeed;
  }

  setStatus(newStatus) {
    this.status = newStatus;
    this.$timeout();
  }

  setProductName(newName) {
    this.productName = newName;
    this.$timeout();
  }

  setComplete() {
    this.setStatus('Complete');
  }

  sizeInKB(amount) {
    return humanize.filesize(amount);
  }
}

InstallController.$inject = ['$scope', '$timeout', 'installerDataSvc', 'electron'];

export default InstallController;
export { ProgressState };
