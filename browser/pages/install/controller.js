'use strict';

import Logger from '../../services/logger';

class InstallController {
  constructor($scope, $timeout, installerDataSvc) {
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.failedDownloads = new Set();

    this.data = Object.create(null);
    for (var [key, value] of this.installerDataSvc.allInstallables().entries()) {
      let itemProgress = new ProgressState(value.getProductName(), value.getProductVersion(), value.getProductDesc(), value.getInstallTime(), this.$scope, this.$timeout);
      Object.defineProperty(this.data, key, {
        enumerable: true,
        writable: true,
        value: itemProgress
      });
      if( value.selectedOption === "skip" ) {
          this.installerDataSvc.setupDone(itemProgress,key);
      } else {
        this.processInstallable(key, value,itemProgress);
      }
    }
  }

  processInstallable(key, value,itemProgress) {
    if(value.isDownloadRequired()) {
      this.triggerDownload(key, value, itemProgress);
    } else {
      this.triggerInstall(key, value, itemProgress);
    }
  }

  triggerDownload(installableKey, installableValue, progress) {
    this.installerDataSvc.startDownload(installableKey);
    progress.installTrigger();
    installableValue.downloadInstaller(progress,
      () => {
        this.installerDataSvc.downloadDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to download: ' + error);
        progress.setStatus("Failed");
        this.$timeout(()=>{
          this.$scope.$apply(()=>{
            this.failedDownloads.add(installableValue);
          })
        });
      }
    )
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
    progress.installTrigger();
    installableValue.install(progress,
      () => {
        this.installerDataSvc.installDone(progress,installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to install: ' + error);
      }
    )
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
    return this.installerDataSvc.getInstallable(key).selected;
  }

  status(key) {
    return this.data[key].status;
  }
}

class ProgressState {
  constructor(productName, productVersion, productDesc, installTime, $scope, $timeout) {
    this.productName = productName;
    this.productVersion = productVersion;
    this.productDesc = productDesc;
    this.installTime = installTime;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.current = 0;
    this.totalDownloadSize = 0;
    this.downloadedSize = 0;
    this.timeSpent = 0;
    this.timeSpentInstall = 0;
    this.lastInstallTime = 0;
    this.label = '';
    this.status = '';

  }

  setTotalDownloadSize(totalSize) {
    this.totalDownloadSize += totalSize;
  }

  downloaded(amt, time) {
    this.downloadedSize += amt;
    this.timeSpent += time;
    if (time == 0) return;
    let rate = amt / time;
    let remainingDownloadTime = (this.totalDownloadSize - this.downloadedSize) / rate;
    this.setCurrent(this.calcCurrentValue());
  }

  installTrigger() {
    this.lastInstallTime = Date.now();
    this.$timeout(this.installUpdate.bind(this));
  }

  installUpdate() {
    let now = Date.now();
    this.timeSpentInstall += (now - this.lastInstallTime);
    this.lastInstallTime = now;
    this.$timeout(()=>{
      this.$scope.$apply(()=>{
        this.setCurrent(this.calcCurrentValue());
      })
       this.$timeout(this.installUpdate.bind(this), 1000);
    });
  }

  setCurrent(newVal) {
    if (newVal > this.current && newVal < 100) {
    	this.current = newVal;
    	this.label = newVal + '%';
    }
  }

  setStatus(newStatus) {
    this.status = newStatus;
  }

  calcCurrentValue() {
    // 95% for download and rest for installation
    return Math.round( this.downloadedSize/this.totalDownloadSize * 95)
  }

  setComplete() {
    this.current = 100;
    this.label = '100%';
    this.setStatus('Complete');
  }
}

InstallController.$inject = ['$scope', '$timeout', 'installerDataSvc'];

export default InstallController;
