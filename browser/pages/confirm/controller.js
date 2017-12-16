'use strict';

import Logger from '../../services/logger';

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    $scope.downloadComp = this.detectDownloadedComponents();

    $scope.updateTotalDownloadSize = () => {
      let totalDownloadSize = 0;
      for (let value of this.installerDataSvc.allInstallables().values()) {
        if(value.size && value.selectedOption == 'install' && !value.downloaded) {
          for (let file in value.files) {
            if (!value.files[file].downloaded) {
              totalDownloadSize += value.files[file].size;
            }
          }
        }
      }
      return totalDownloadSize;
    };

    $scope.updateTotalInstallSize = () => {
      let totalInstallSize = 0;
      for (let value of this.installerDataSvc.allInstallables().values()) {
        if(value.installSize && value.selectedOption == 'install') {
          totalInstallSize += value.installSize;
        }
      }
      return totalInstallSize;
    };
  }

  detectDownloadedComponents() {
    let downloadedComponents = [];
    for (let value of this.installerDataSvc.allInstallables().values()) {
      if(value.selectedOption == 'install') {
        downloadedComponents.push(value);
      }
      this.downloadComp = downloadedComponents;
    }
    return this.downloadComp;
  }

  next() {
    this.router.go(this.getNextPage());
  }

  isAccountRequired() {
    let required = false;
    for (let value of this.installerDataSvc.allInstallables().values()) {
      required = value.authRequired
        && value.selectedOption == 'install';
      if(required) {
        break;
      }
    }
    return required;
  }

  getNextPage () {
    if(this.isAccountRequired()) {
      return 'account';
    } else {
      return 'install';
    }
  }

  getNextButtonName () {
    if(this.isAccountRequired()) {
      return 'Next';
    } else {
      return 'Download & Install';
    }
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.router.go('selection');
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
