'use strict';

import Logger from '../../services/logger';
import duration from 'humanize-duration';
import humanize from 'humanize';

class InstallController {
  constructor($scope, $timeout, installerDataSvc) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.failedDownloads = new Set();
    this.installerDataSvc.setupTargetFolder();

    this.data = {};
    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      let itemProgress = new ProgressState(key, value.getProductName(), value.getProductVersion(), value.getProductDesc(), this.$scope, this.$timeout);
      if(value.isSkipped()) {
        this.installerDataSvc.setupDone(itemProgress, key);
      } else {
        this.data[key] = itemProgress;
        this.processInstallable(key, value, itemProgress);
      }
    }
    this.$scope.data = this.data;
  }

  processInstallable(key, value, itemProgress) {
    if(value.isDownloadRequired()) {
      this.triggerDownload(key, value, itemProgress);
    } else {
      this.triggerInstall(key, value, itemProgress);
    }
  }

  triggerDownload(installableKey, installableValue, progress) {
    this.installerDataSvc.startDownload(installableKey);
    installableValue.downloadInstaller(progress,
      () => {
        this.installerDataSvc.downloadDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to download: ' + error);
        progress.setStatus('Download Failed');
        this.failedDownloads.add(installableValue);
      }
    );
  }

  downloadAgain() {
    Logger.info('Restarting download');
    let dlCopy = new Set(this.failedDownloads);
    this.closeDownloadAgainDialog();
    dlCopy.forEach((value)=>{
      value.restartDownload();
    });
  }

  closeDownloadAgainDialog() {
    this.failedDownloads.clear();
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

  productName(key) {
    return this.data[key].productName;
  }

  productVersion(key) {
    return this.data[key].productVersion;
  }

  productDesc(key) {
    return this.data[key].productDesc;
  }

  current(key) {
    return this.data[key].current;
  }

  label(key) {
    return this.data[key].label;
  }

  show(key) {
    return !this.installerDataSvc.getInstallable(key).isSkipped();
  }

  status(key) {
    return this.data[key].status;
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
      this.$timeout(()=>this.$scope.$apply());
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
      this.totalSize = 0;
    }
    this.status = newStatus;
    this.$timeout(()=>this.$scope.$apply());
  }

  setComplete() {
    this.setStatus('Complete');
  }

  sizeInKB(amount) {
    return humanize.filesize(amount);
  }
}

InstallController.$inject = ['$scope', '$timeout', 'installerDataSvc'];

export default InstallController;
export { ProgressState };
