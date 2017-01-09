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
      let itemProgress = new ProgressState(value.getProductName(), value.getProductVersion(), value.getProductDesc(), this.$scope, this.$timeout);
      Object.defineProperty(this.data, key, {
        enumerable: true,
        writable: true,
        value: itemProgress
      });
      if(value.isSkipped()) {
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
    installableValue.downloadInstaller(progress,
      () => {
        this.installerDataSvc.downloadDone(progress, installableKey);
      },
      (error) => {
        Logger.error(installableKey + ' failed to download: ' + error);
        progress.setStatus('Download failed');
        this.$timeout(()=>{
          this.$scope.$apply(()=>{
            this.failedDownloads.add(installableValue);
          });
        });
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
        this.installerDataSvc.installDone(progress,installableKey);
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

class ProgressState {
  constructor(productName, productVersion, productDesc, $scope, $timeout) {
    this.productName = productName;
    this.productVersion = productVersion;
    this.productDesc = productDesc;
    this.$timeout = $timeout;
    this.$scope = $scope;
    this.current = 0;
    this.label = '';
    this.status = '';
    this.currentAmount = 0;
    this.totalSize = 0;
  }

  setTotalDownloadSize(size) {
    this.totalSize = size;
  }

  setCurrent(newVal) {
    if (newVal > this.currentAmount && newVal <= this.totalSize) {
      this.currentAmount = newVal;
      this.current = Math.round(this.currentAmount / this.totalSize * 100);
      this.label = this.sizeInKB(this.currentAmount) + ' / ' + this.sizeInKB(this.totalSize) + ' KB (' + this.current + '%)';

      this.$timeout(this.setCurrent.bind(this), 0);
    }
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

    this.$timeout(() => {
      this.$scope.$apply();
    });
  }

  setComplete() {
    this.current = 100;
    this.label = '100%';
    this.setStatus('Complete');
  }

  sizeInKB(amount) {
    return Math.round(amount / 1024);
  }
}

InstallController.$inject = ['$scope', '$timeout', 'installerDataSvc'];

export default InstallController;
export { ProgressState };
