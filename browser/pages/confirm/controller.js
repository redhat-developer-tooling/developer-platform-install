'use strict';

import Logger from '../../services/logger';
import pgp from '../../services/openpgp';
import Platform from '../../services/platform';
import ComponentLoader from '../../services/componentLoader';
import meta from '../../services/metadata';
import request from 'request';
import pify from 'pify';
import electron from 'electron';

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

    this.sc.$watch('$viewContentLoaded', ()=>{
      this.initPage();
    });

    this.loader = new ComponentLoader(installerDataSvc);
  }

  loadModel() {
    this.loader.loadComponents();
    for (let [key, value] of this.installerDataSvc.allInstallables().entries()) {
      this.sc.checkboxModel[key] = value;
      let that = this;
      this.sc.$watch(`checkboxModel.${key}.selectedOption`, function watchInstallSelectionChange() {
        that.sc.checkboxModel[key].validateVersion();
      });
    }

    this.sc.isConfigurationValid = this.isConfigurationValid;

    this.electron.remote.getCurrentWindow().addListener('focus', ()=> {
      this.timeout(() => {
        this.activatePage();
        this.sc.$apply();
      });
    });
  }

  checkForUpdates() {
    this.isDisabled = true;
    this.installedSearchNote = 'The system is checking for updates';
    return this.timeout(true).then(()=> {
      return pify(request)('https://raw.githubusercontent.com/dgolovin/developer-platform-install-repo/master/requirements.json').then((value)=>{
        pgp(this.pgpPublicKey, value.body).then(({text, valid, error})=>{
          if(!error && valid) {
            let remoteReqs = meta(JSON.parse(text), Platform.OS);
            let opt = {
              type: 'none',
              buttons: ['Yes', 'No'],
              defaultId: 0,
              cancelId: 1,
              message: 'There is new set of components available for installation.\nWould you like to use it?'
            };
            if(this.isUpdateRequired(this.installerDataSvc.requirements, remoteReqs) && 0 === electron.remote.dialog.showMessageBox(electron.remote.getCurrentWindow(), opt)) {
              this.installerDataSvc.clearItemsToInstall();
              this.installerDataSvc.loadRequirements(remoteReqs);
            }
          }
          this.loadModel();
        });
      });
    });
  }

  isUpdateRequired(oldr, newr) {
    let res = false;
    for(let object in newr) {
      if(oldr[object] === undefined || (oldr[object] && oldr[object].version !== newr[object].version)) {
        res = true;
        break;
      }
    }
    return res;
  }

  initPage() {
    return Promise.resolve().then(()=> {
      return this.checkForUpdates();
    }).then(()=> {
      this.isDisabled = false;
      return this.detectInstalledComponents();
    }).then(()=> {
      this.graph = ComponentLoader.loadGraph(this.installerDataSvc);
      this.installWatchers();
      return Promise.resolve();
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
      this.installedSearchNote = 'The system is checking if you have any installed components.';
      let detectors = [];
      for (var installer of this.installerDataSvc.allInstallables().values()) {
        detectors.push(installer.detectExistingInstall());
      }
      this.detection = this.timeout(true).then(()=>{
        return Promise.all(detectors);
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

  get pgpPublicKey() {
    return `-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBFl45PABCADa3JMtyxLpEvxiqFsqM0D7p+R5bG4WDUW2Gf3A4olL3Ba1dMbY
XuVKN2VVWF0eaX/kkPFWFQQ/zUbBR5A8BcCzWrVNm7NvbSxkwqS8U8imc+0QYz6f
RQfYvzGaN3rg2EJ4XiGy5M7nVoPmwk9xqbhJxxv3d507oPDN1FOnoTY68Y+GbiUM
HF3mFlBtQwxhGxlFhwPABmHypfeBCk36s0TzzvAekNcT8ROuWM+68KjtZEbizQ4J
0ZYeLixdTyN3em4ve+hFFjiQOZbh5PKzrSP8nw1EFoAdHnefO/2vUe6pp3G8y8CB
zlT2ZU2kuFsP7I5HeZoGi4DbbXgJyqhp4jGrABEBAAG0S0RlbmlzIEdvbG92aW4g
KFRlc3Qgc2lnbmluZyBhbmQgdmVyaWZ5aW5nIHRleHQgZmlsZXMpIDxkZ29sb3Zp
bkByZWRoYXQuY29tPokBOAQTAQIAIgUCWXjk8AIbAwYLCQgHAwIGFQgCCQoLBBYC
AwECHgECF4AACgkQHrpirkCkMkpT6gf+LwCUJRHpL/V2z8A2ZDbf8nT/9AIOmpdq
z/mUj3kJUbrPTel7jel2qAqCDC7/BySPVjToqfX/Ww8yiq48j9xtWOenPb52QO0S
zBdxnFUK/zS4Iij60aBamWOSkCw/cYmze93bttvaAiqgArnPD32rWTHDF9ruosAm
N7/ymBYbyoBwcGklnShl4lahW7OBuDCFejn+8Wz5NZAzG05OXdwjMGnslCsjyRLb
i7VfgRBgHbGCMIcrwn7VrMbYgIx/yEoyr8jwGLiK0ucdEqAH8GdBQJStEL58TReE
/StWaVC81U5dgZaedSdGlNLQacXltmuJpg2Lcpj8v22aneLFBkThYLkBDQRZeOTw
AQgA7DuKmKOOJ8iSAl+cI4OcS6kwowxMZKnR4eS/QVJYUMCw+WxdQprhakGUcoo2
9EiyxwvXrp/RNFIzPYJ8frRYKrfPMY0ginpvKKNFnU7/INjHn7EnQkpJjAK15A+f
QdKhvetBvU1I3CB4xHGjmYdMOySGnaNHZQu1dmkdBiDT4o66H4bu0H3J956QhQr8
7r9fYf2Qd9Lfw+a3or5O0Dcag1bHtUOx8B/cw3dXK/TFa+/ECQbeqA3pn4WQfsoH
ZvBUAvE+nCABJg9lXDrtyhzIlha9fvk/vUguo0tZ1XW5YCkeNVWqig/Ju8eydUHc
7FClF1rJ9TTZBoZoNO9O51FtxwARAQABiQEfBBgBAgAJBQJZeOTwAhsMAAoJEB66
Yq5ApDJKnJIH/3ldHeikhjDIJOno+DMKBs9iGpSl3PZI9qXBXxb13KTGAwCkcIja
fc4Bn6w/dKoa5CumYHr4Uf5VrGxvRFyCkiA3YZ6/EarYpWaEAO179qYeGuwiCMuV
ihUuCGhXKsl8sig4j1YMyGg058HgZov81yLnPHBeLpTsFRj/7SPT0eJjWyZmK3dS
zMlxS8jFPEeBPA7EI4bDQCdg/kBK9C89s2xmZOxz3PtCzoMtj9KICvLzCf0OX1hR
Y8WRZUzrkAkouuli0sfWGIsHSEPFCrNdKdoIud0Klrc/ATMD0tDjz7MEl7brEC08
vRYoPDOBq3YXZ0LdaZwVObM7KV0Ncw2YWg4=
=uZLc
-----END PGP PUBLIC KEY BLOCK-----
`;

  }
}

ConfirmController.$inject = ['$scope', '$state', '$timeout', 'installerDataSvc', 'electron'];

export default ConfirmController;
