'use strict';

import Logger from '../../services/logger';
import Platform from '../../services/platform';
import ComponentLoader from '../../services/componentLoader';

class SelectionController {

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
    this.step = 1;
    this.installables = {};
    $scope.checkboxModel = {};
    $scope.platform = Platform.OS;
    $scope.detectionStyle = false;
    $scope.virtualization = true;
    this.channelList = require('../../../channels');
    this.channel_tab = 'all';
    $scope.componentsInChannel = this.componentsInChannel.bind(this);

    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      $scope.checkboxModel[key] = value;
      $scope.$watch(`checkboxModel.${key}.selectedOption`, function watchInstallSelectionChange() {
        $scope.checkboxModel[key].validateVersion();
      });
    }

    $scope.$on('$destroy', ()=>{
      restoreMenu();
    });

    $scope.isConfigurationValid = this.isConfigurationValid;
    $scope.$watch('$viewContentLoaded', this.initPage.bind(this));

    this.electron.remote.getCurrentWindow().addListener('focus', this.activatePage.bind(this));
    this.componentDetails = Object.values(this.sc.checkboxModel);
  }

  componentsInChannel() {
    return this.componentDetails.filter(value=> {
      return this.channel_tab === 'all' || value.channel && value.channel[this.channel_tab];
    });
  }

  toggleSelection(type) {
    this.componentsInChannel(this.channel_tab).forEach((node)=>{
      if(type==='all') {
        if (node.isInstallable && node.isNotDetected()) {
          node.selectedOption = 'install';
        }
      } else if(type==='none') {
        node.selectedOption = 'detected';
      }
    });
  }

  channelBadge(tab) {
    if(tab === 'all') {
      return this.componentDetails.length;
    } else {
      var channels = this.componentDetails.filter(value=> {
        return value.channel && value.channel[tab];
      });
      return channels.length;
    }
  }

  componentsSelected() {
    let downloadedComponents = [];
    this.componentsInChannel(this.channel_tab).forEach((value)=> {
      if(value.selectedOption == 'install') {
        downloadedComponents.push(value);
      }
      this.downloadComp = downloadedComponents;
    });
    return this.downloadComp.length;
  }

  initPage() {
    return this.detectInstalledComponents().then(()=> {
      let checkboxModel = this.sc.checkboxModel;
      if (checkboxModel.hyperv && checkboxModel.hyperv.isConfigured()) {
        this.loader.removeComponent('virtualbox');
      } else {
        this.loader.removeComponent('hyperv');
      }
      this.graph = ComponentLoader.loadGraph(this.installerDataSvc);
      this.installWatchers();
    }).then(
      ()=> this.setIsDisabled()
    ).catch((error)=> {
      console.error(error);
      this.setIsDisabled();
    });
  }

  activatePage() {
    return this.detectInstalledComponents().then(
      ()=> this.setIsDisabled()
    ).catch((error)=> {
      Logger.error(error);
      this.setIsDisabled();
    });
  }

  installWatchers() {
    let graph = this.graph;
    let nodes = graph.overallOrder() ;
    let checkboxModel = this.sc.checkboxModel;
    for (let node of nodes) {
      checkboxModel[node].dependenciesOf = [];
      for(let dependant of this.graph.dependantsOf(node)) {
        checkboxModel[node].dependenciesOf.push(checkboxModel[dependant]);
      }
      checkboxModel[node].references=0;
    }
    for (let node of nodes) {
      this.sc.$watch(`checkboxModel.${node}.selectedOption`, this.watchComponent.bind(this, node));
    }
  }

  watchComponent(node, newv, oldv) {
    let graph = this.graph;
    let checkboxModel = this.sc.checkboxModel;
    let installer = checkboxModel[node];
    if(installer.isSelected()) {
      for(let dep of graph.dependenciesOf(node)) {
        let depInstaller = checkboxModel[dep];
        if(depInstaller.isInstallable && depInstaller.references === 0 && depInstaller.isNotDetected()) {
          depInstaller.selectedOption = 'install';
        }
        depInstaller.references++;
      }
    } else if(!installer.isSelected() && oldv === 'install') {
      for(let dep of graph.dependenciesOf(node)) {
        let depInstaller = checkboxModel[dep];
        depInstaller.references--;
        if(depInstaller.references === 0) {
          depInstaller.selectedOption = 'detected';
        }
      }
    }
  }

  detectInstalledComponents() {
    if(!this.isDisabled) {
      this.isDisabled = true;
      this.timeout(()=>{});
      this.installedSearchNote = ' The system is checking if you have any installed components.';
      let detectors = [];
      for (let installer of this.installerDataSvc.allInstallables().values()) {
        detectors.push(installer.detectExistingInstall());
      }
      this.detection = Promise.all(detectors);
    }
    return this.detection;
  }

  // Prep the install location path for each product, then go to the next page.
  next() {
    this.loader.orderInstallation(this.graph);
    let possibleComponents = ['virtualbox', 'jdk', 'devstudio', 'jbosseap', 'cygwin', 'cdk', 'kompose', 'fuseplatform', 'fuseplatformkaraf'];
    for (let i = 0; i < possibleComponents.length; i++) {
      let component = this.installerDataSvc.getInstallable(possibleComponents[i]);
      if (component) {
        possibleComponents[i] = component.getLocation();
      } else {
        possibleComponents[i] = undefined;
      }
    }

    this.electron.remote.getCurrentWindow().removeAllListeners('focus');
    this.installerDataSvc.setup(...possibleComponents);

    this.router.go('confirm');
  }

  setIsDisabled() {
    // Uncomment the timeout to see the initial disabled view.
    this.timeout(() => {
      // Switch this boolean flag when the app is done looking for existing installations.
      this.isDisabled = false;
      this.numberOfExistingInstallations = 0;
      // Count the number of existing installations.
      for (var [, value] of this.installerDataSvc.allInstallables()) {
        if (value.hasOption('detected')) {
          ++this.numberOfExistingInstallations;
        }
      }

      if (this.numberOfExistingInstallations == 1) {
        this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed component.`;
      } else if (this.numberOfExistingInstallations > 1) {
        this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed components.`;
      } else {
        this.installedSearchNote = '';
      }

      if (this.numberOfExistingInstallations == 0) {
        this.installInstructions = 'Select components to install.';
      } else if (this.numberOfExistingInstallations > 0) {
        this.installInstructions = 'Select any additional components to install.';
      }
    }, true);
  }

  isConfigurationValid() {
    let result = true;
    for (let [, value] of this.installerDataSvc.allInstallables().entries()) {
      if(! (result = value.isConfigurationValid())) {
        break;
      }
    }
    return result && this.isAtLeastOneSelected();
  }

  isAtLeastOneSelected() {
    let selected = false;
    for (var [, value] of this.installerDataSvc.allInstallables()) {
      selected = !value.isSkipped();
      if(selected) {
        break;
      }
    }
    return selected;
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.electron.remote.getCurrentWindow().removeAllListeners('focus');
    this.router.go('location');
  }
}

SelectionController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default SelectionController;
