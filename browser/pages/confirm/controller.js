'use strict';

import Logger from '../../services/logger';
import Platform from '../../services/platform';
import ComponentLoader from '../../services/componentLoader';

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    this.loader = new ComponentLoader(installerDataSvc);
    this.loader.loadComponents();
    this.installedSearchNote = '';
    this.isDisabled = false;
    this.numberOfExistingInstallations = 0;

    this.installables = {};
    $scope.checkboxModel = {};
    $scope.platform = Platform.OS;
    $scope.detectionStyle = false;
    $scope.virtualization = true;
    $scope.downloadComp = this.detectDownloadedComponents();

    const selectAllLabel = 'Select All Components';

    menu.insert(0, new MenuItem({
      label: selectAllLabel,
      click: ()=> {
        this.sc.$apply(this.selectAll.bind(this));
      }
    }));

    const deselectAllLabel = 'Deselect All Components';


    menu.insert(1, new MenuItem({
      label: deselectAllLabel,
      click: ()=> {
        this.sc.$apply(this.deselectAll.bind(this));
      }
    }));

    menu.insert(2, new MenuItem({
      label: deselectAllLabel,
      type: 'separator'
    }));

    $scope.$on('$destroy', ()=>{
      restoreMenu();
    });

    $scope.isConfigurationValid = this.isConfigurationValid;

    // $scope.$watch('$viewContentLoaded', this.initPage.bind(this));

    // this.electron.remote.getCurrentWindow().addListener('focus', ()=>this.timeout(this.activatePage.bind(this), true));
  }

  selectAll() {
    let checkboxModel = this.sc.checkboxModel;
    for (let key in checkboxModel) {
      let node = checkboxModel[key];
      if (node.isInstallable && node.isNotDetected()) {
        node.selectedOption = 'install';
      }
    }
  }

  deselectAll() {
    let checkboxModel = this.sc.checkboxModel;
    for (let key in checkboxModel) {
      checkboxModel[key].selectedOption = 'detected';
    }
  }

  detectDownloadedComponents() {
    let downloadedComponents = [];
    for (let value of this.installerDataSvc.allInstallables().values()) {
      if(value.isDownloaded() && value.selectedOption == 'install') {
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
