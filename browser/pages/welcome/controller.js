'use strict';

class WelcomeController {

  constructor($state, $scope, electron, request) {
    this.router = $state;
    this.http = request;
    this.scope = $scope;
    this.scope.background = true;
    this.electron = electron;
    this.scope.version = electron.remote.app.getVersion();
    $scope.$watch('$viewContentLoaded', this.check.bind(this));
  }

  next() {
    this.router.go('location');
  }

  check() {
    let versionUrl = 'https://developers.redhat.com/download-manager/rest/available/devsuite/?nv=1';
    this.scope.status = 'Checking'
    let req = {
      method: 'GET',
      url: versionUrl
    };

    this.http(req).then((data)=>{
      let version = this.scope.version;
      let devsuiteVersion = data.data[0].featuredArtifact.versionName;
      let numaricVersion = version.split('-')[0].replace(/\./g,'');
      let numaricDevsuiteVersion = devsuiteVersion.split('-')[0].replace(/\./g,'');
      if (numaricDevsuiteVersion.replace(/\./g,'') > numaricVersion.replace(/\./g,'')){
        this.scope.textversion = 'Updated version:'
        this.scope.newversion = version;
        this.scope.status = `New`;
      } else {
          this.scope.status = 'Current';
      }
    }).then(()=>{
      this.scope.$apply();
    });
  }

  downloadLatestVersion() {
    this.electron.shell.openExternal('https://developers.redhat.com/products/devsuite/download/')
    this.electron.remote.getCurrentWindow().removeAllListeners('close');
    this.electron.remote.getCurrentWindow().close();
  }

  openDevSuiteOverview() {
    this.electron.shell.openExternal('https://developers.redhat.com');
  }
}

WelcomeController.$inject = ['$state', '$scope', 'electron', 'request'];

export default WelcomeController;
