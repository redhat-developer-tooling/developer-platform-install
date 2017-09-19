'use strict';

import Logger from '../../services/logger';
import Platform from '../../services/platform';

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    this.installedSearchNote = '';
    this.isDisabled = false;
    this.numberOfExistingInstallations = 0;

    this.installables = {};
    $scope.checkboxModel = {};
    $scope.platform = Platform.OS;
    $scope.detectionStyle = false;
    $scope.virtualization = true;
    $scope.downloadComp = this.detectDownloadedComponents();
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

  download(url) {
    this.electron.shell.openExternal(url);
  }

  next() {
    this.router.go(this.getNextPage());
  }

  isAccountRequired() {
    let checkboxModel = this.sc.checkboxModel;
    let required = false;
    for (const key in checkboxModel) {
      required = checkboxModel.hasOwnProperty(key)
        && checkboxModel[key].authRequired
        && checkboxModel[key].selectedOption == 'install';
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
    // this.electron.remote.getCurrentWindow().removeAllListeners('focus');
    this.router.go('selection');
  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
