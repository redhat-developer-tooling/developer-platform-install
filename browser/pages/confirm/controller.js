'use strict';

import Logger from '../../services/logger';
import Platform from '../../services/platform';
import ComponentLoader from '../../services/componentLoader';

const baseDependencies = {
  'cdk': ['virtualbox', 'cygwin'],
  'devstudio': ['jdk'],
  'jbosseap': ['jdk'],
  'fusetools' : ['devstudio']
};

class ConfirmController {

  constructor($scope, $state, $timeout, installerDataSvc, electron) {
    this.router = $state;
    this.sc = $scope;
    this.timeout = $timeout;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    this.loader = new ComponentLoader(installerDataSvc);

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

    $scope.isConfigurationValid = this.isConfigurationValid;

    let watchedComponents = {};
    for (let key in baseDependencies) {
      if ($scope.checkboxModel[key]) {
        watchedComponents[key] = [];
        let installAfter = this.installerDataSvc.getInstallable(key).getInstallAfter();
        let keyName;

        while (installAfter) {
          keyName = installAfter.keyName;
          if (baseDependencies[key].indexOf(keyName) > -1) {
            watchedComponents[key].push(keyName);
          }
          installAfter = installAfter.getInstallAfter();
        }
      }
    }

    for (let key in watchedComponents) {
      $scope.$watch(`checkboxModel.${key}.selectedOption`, function watchComponent(nVal) {
        for (let keyName of watchedComponents[key]) {
          if (keyName === 'jdk' && $scope.checkboxModel[keyName].selectedOption !== 'detected') {
            if ($scope.checkboxModel.devstudio.selectedOption === 'detected' && $scope.checkboxModel.jbosseap.selectedOption === 'detected' ) {
              $scope.checkboxModel[keyName].selectedOption = 'detected';
            } else {
              $scope.checkboxModel[keyName].selectedOption = 'install';
            }
          } else {
            if(nVal=='install') {
              if($scope.checkboxModel[keyName].selectedOption == 'detected'
                && !$scope.checkboxModel[keyName].hasOption('detected')) {
                $scope.checkboxModel[keyName].selectedOption = 'install';
              }
            } else if (nVal=='detected') {
              $scope.checkboxModel[keyName].selectedOption = 'detected';
            }
          }
        }
      });
    }

    $scope.$watch('$viewContentLoaded', ()=>{
      this.detectInstalledComponents();
    });

    this.electron.remote.getCurrentWindow().addListener('focus', ()=> {
      this.timeout( () => {
        this.detectInstalledComponents();
        this.sc.$apply();
      });
    });
  }

  detectInstalledComponents() {
    if(!this.isDisabled) {
      this.isDisabled = true;
      this.installedSearchNote = ' The system is checking if you have any installed components.';
      let detectors = [];
      for (var installer of this.installerDataSvc.allInstallables().values()) {
        detectors.push(installer.detectExistingInstall());
      }
      this.detection = Promise.all(detectors).then(()=> {
        this.setIsDisabled();
      }).catch(()=> {
        this.setIsDisabled();
      });
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

    let possibleComponents = ['virtualbox', 'jdk', 'devstudio', 'jbosseap', 'cygwin', 'cdk', 'kompose', 'fusetools'];
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

      // Set the message depending on if the view is disabled or not.
      if (this.isDisabled) {
        this.installedSearchNote = '  The system is checking if you have any installed components';
      } else {
        if (this.numberOfExistingInstallations == 1) {
          this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed component`;
        } else if (this.numberOfExistingInstallations > 1) {
          this.installedSearchNote = `  We found ${this.numberOfExistingInstallations} installed components`;
        } else {
          this.installedSearchNote = '';
        }
      }

      // Call the digest cycle so that the view gets updated.
      this.sc.$apply();
    });
  }

  devstudioIsConfigured() {
    return this.sc.checkboxModel.jdk.isConfigured()
      && this.sc.checkboxModel.devstudio.isConfigured()
      || this.sc.checkboxModel.devstudio.isSkipped();
  }

  cdkIsConfigured() {
    return this.sc.checkboxModel.cdk.isConfigured()
      && this.virtualizationIsConfigured()
      && (!this.sc.checkboxModel.cygwin || this.sc.checkboxModel.cygwin.isConfigured())
      || this.sc.checkboxModel.cdk.isSkipped();
  }

  virtualizationIsConfigured() {
    return (this.sc.checkboxModel.virtualbox
      && this.sc.checkboxModel.virtualbox.isConfigured())
      || (this.sc.checkboxModel.hyperv
      && this.sc.checkboxModel.hyperv.isConfigured()
      || this.sc.checkboxModel.cdk.selectedOption !== 'install');
  }

  isConfigurationValid() {
    return this.devstudioIsConfigured()
      && this.cdkIsConfigured()
      && this.virtualizationIsConfigured()
      && this.isAtLeastOneSelected();
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
