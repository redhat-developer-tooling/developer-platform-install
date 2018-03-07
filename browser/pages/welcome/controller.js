'use strict';

import Version from '../../model/helpers/version';

class WelcomeController {

  constructor($state, $scope, electron, request) {
    this.router = $state;
    this.http = request;
    this.scope = $scope;
    this.scope.background = true;
    this.electron = electron;
    this.scope.version = electron.remote.app.getVersion();
    $scope.$watch('$viewContentLoaded', this.check.bind(this));

    this.URL_DM_DEVSUITE_INFO = 'https://developers.redhat.com/download-manager/rest/available/devsuite/?nv=1';
    this.URL_DEVSUITE_DOWNLOAD_PAGE = 'https://developers.redhat.com/products/devsuite/download/';
    this.URL_DEVELOPER_PROGRAM_SITE = 'https://developers.redhat.com';
  }

  next() {
    this.router.go('location');
  }

  check() {
    this.scope.status = 'Checking';
    let req = {
      method: 'GET',
      url: this.URL_DM_DEVSUITE_INFO
    };

    return this.http(req).then((data)=>{
      let version = this.scope.version;
      let devsuiteVersion = data.data[0].featuredArtifact.versionName;
      let numericVersion = version.split('-')[0];
      if (Version.GT(devsuiteVersion, numericVersion)) {
        this.scope.newVersion = devsuiteVersion;
        this.scope.status = 'New';
      } else {
        this.scope.status = 'Current';
      }
    }).catch((error)=>{
      this.scope.status = 'Error';
      this.scope.error = error;
      console.log(error);
    }).then(()=>{
      this.scope.$apply();
    });
  }

  downloadLatestVersion() {
    this.electron.shell.openExternal(this.URL_DEVSUITE_DOWNLOAD_PAGE);
    this.electron.remote.getCurrentWindow().removeAllListeners('close');
    this.electron.remote.getCurrentWindow().close();
  }

  openDevSuiteOverview() {
    this.electron.shell.openExternal(this.URL_DEVELOPER_PROGRAM_SITE);
  }
}

WelcomeController.$inject = ['$state', '$scope', 'electron', 'request'];

export default WelcomeController;
