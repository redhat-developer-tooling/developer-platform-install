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
    this.failedDownloads = new Set();
    this.totalSize = 0;
    this.data = {};
    this.totalDownloads = 0;
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(!value.isSkipped()) {
        this.totalDownloads += value.totalDownloads;
        this.totalSize += value.size;
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
    this.itemProgress.setTotalDownloadSize(this.totalSize);
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      if(value.isSkipped()) {
        this.installerDataSvc.setupDone(this.itemProgress, key);
      } else {
        this.processInstallable(key, value);
      }
    }
    this.$scope.data = this.data;
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
        this.installerDataSvc.installDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to install: ' + error);
      }
    );
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
  constructor(key, productName, productVersion, productDesc, $scope, $timeout, minValue=0, maxValue=100) {
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
    this.totalSize = 0;
    this.min = minValue;
    this.max = maxValue;
    this.lastTime = Date.now();
    this.averageSpeed = 0;
    this.durationFormat = duration.humanizer(Object.assign({}, shortDuration));
    this.durationFormat.units = ['y', 'd', 'h', 'm'];
  }

  setTotalDownloadSize(size) {
    this.totalSize = size;
  }

  setCurrent(newVal) {
    if (newVal > this.currentAmount && newVal <= this.totalSize) {
      this.lastAmount = this.currentAmount;
      this.currentAmount = newVal;

      let remaining = this.calculateTime();
      if (remaining < 60 * 1000) {
        this.durationFormat.units.push('s');
      }

      this.current = Math.round(this.currentAmount / this.totalSize * 100);
      this.label = this.sizeInKB(this.currentAmount) + ' / ' + this.sizeInKB(this.totalSize) + ' (' + this.current + '%), ' + this.durationFormat(remaining) + ' left';
      this.$timeout();
    }
  }

  calculateTime() {
    let currentTime = new Date();
    this.lastSpeed = (this.currentAmount - this.lastAmount) / (currentTime.getTime() - this.lastTime);
    this.lastTime = currentTime;
    this.averageSpeed = this.averageSpeed === 0 ? this.lastSpeed : smoothFactor * this.lastSpeed + (1 - smoothFactor) * this.averageSpeed;

    return (this.totalSize - this.currentAmount) / this.averageSpeed;
  }

  setStatus(newStatus) {
    if (newStatus === this.status) {
      return;
    }
    if (newStatus !== 'Downloading') {
      this.current = 100;
      this.label = '';
    } else {
      this.current = 0;
      this.label = 0 + '%';
      this.currentAmount = 0;
      //    this.totalSize = 0;
    }
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