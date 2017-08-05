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

    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      $scope.checkboxModel[key] = value;
      $scope.$watch(`checkboxModel.${key}.selectedOption`, function watchInstallSelectionChange() {
        $scope.checkboxModel[key].validateVersion();
      });
    }

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
    })

    $scope.isConfigurationValid = this.isConfigurationValid;

    $scope.$watch('$viewContentLoaded', ()=>{
      this.initPage();
    });

    this.electron.remote.getCurrentWindow().addListener('focus', ()=> {
      this.timeout( () => {
        this.activatePage();
        this.sc.$apply();
      });
    });
  }

  selectAll() {
    let checkboxModel = this.sc.checkboxModel;
    for (let key in checkboxModel) {
      let node = checkboxModel[key];
      if (node.installable && node.isNotDetected()) {
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

  initPage() {
    return this.detectInstalledComponents().then(()=> {
      this.graph = ComponentLoader.loadGraph(this.installerDataSvc);
      this.installWatchers();
      return Promise.resolve();
    }).then(
      ()=> this.setIsDisabled()
    ).catch((error)=> {
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
      function watchComponent(newv, oldv) {
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
      this.sc.$watch(`checkboxModel.${node}.selectedOption`, watchComponent);
    }
  }

  detectInstalledComponents() {
    if(!this.isDisabled) {
      this.isDisabled = true;
      this.installedSearchNote = ' The system is checking if you have any installed components.';
      let detectors = [];
      for (var installer of this.installerDataSvc.allInstallables().values()) {
        detectors.push(installer.detectExistingInstall());
      }
      this.detection = Promise.all(detectors);
    }
    return this.detection;
  }

  download(url) {
    this.electron.shell.openExternal(url);
  }

  // Prep the install location path for each product, then go to the next page.
  install() {
    if (this.sc.checkboxModel.hyperv && this.sc.checkboxModel.hyperv.isConfigured()) {
      this.loader.removeComponent('virtualbox');
    } else {
      this.loader.removeComponent('hyperv');
    }

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
    this.router.go('install');
  }

  setIsDisabled() {
    // Uncomment the timeout to see the initial disabled view.
    this.timeout( () => {
      // Switch this boolean flag when the app is done looking for existing installations.
      this.isDisabled = !this.isDisabled;
      this.numberOfExistingInstallations = 0;
      // Count the number of existing installations.
      for (var [, value] of this.installerDataSvc.allInstallables()) {
        if (value.hasOption('detected')) {
          ++this.numberOfExistingInstallations;
        }
      }

      if (this.numberOfExistingInstallations == 1) {
        this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed component`;
      } else if (this.numberOfExistingInstallations > 1) {
        this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed components`;
      } else {
        this.installedSearchNote = '';
      }

      // Call the digest cycle so that the view gets updated.
      this.sc.$apply();
    });
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
    for (var [, value] of this.installerDataSvc.allInstallables()) {
      if(!value.isSkipped()) {
        return true;
      }
    }
    return false;
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

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
