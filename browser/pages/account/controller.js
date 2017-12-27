'use strict';

import path from 'path';
import fs from 'fs-extra';
import mkdirp from 'mkdirp';
import rimraf from 'rimraf';
import Util from '../../model/helpers/util';
import Logger from '../../services/logger';
import Platform from '../../services/platform';
import TokenStore from '../../services/credentialManager';

class AccountController {

  constructor($state, $timeout, $scope, request, $base64, installerDataSvc, electron) {
    this.router = $state;
    this.http = request;
    this.base64 = $base64;
    this.timeout = $timeout;
    this.scope = $scope;
    this.installerDataSvc = installerDataSvc;
    this.electron = electron;
    $scope.version = electron.remote.app.getVersion();
    this.authFailed = false;
    this.tandcNotSigned = false;
    this.isLoginBtnClicked = false;
    this.rememberMe = this.installerDataSvc.rememberMe;
    this.httpError = undefined;
    this.hostname = process.env.DM_STAGE_HOST ? process.env.DM_STAGE_HOST : 'developers.redhat.com';
    this.password = '';
    this.username = '';
    $scope.$watch('$viewContentLoaded', ()=>{
      this.password = this.installerDataSvc.password;
      this.username = this.installerDataSvc.username;
    });
  }

  login() {
    this.isLoginBtnClicked = true;
    this.resetLoginErrors();
    let req = {
      method: 'GET',
      url: `https://${this.hostname}/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip`,
      auth: {
        user: this.username,
        pass: this.password,
        sendImmediately: true
      },
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': this.getUserAgent()
      },
      followAllRedirects: true,
      rejectUnauthorized: Util.getRejectUnauthorized()
    };

    this.http(req)
      .then(this.handleHttpSuccess.bind(this))
      .catch(this.handleHttpFailure.bind(this));
  }

  resetLoginErrors() {
    this.authFailed = false;
    this.httpError = undefined;
    this.tandcNotSigned = false;
  }

  save() {
    let checkbox = document.getElementById('rememberMe');
    localStorage.setItem('rememberMe', checkbox.checked);
    if (!checkbox.checked) {
      let dataFilePath = path.join(Platform.localAppData(), 'settings.json');
      if(fs.existsSync(dataFilePath)) {
        TokenStore.deleteItem('login', this.installerDataSvc.username);
        rimraf.sync(dataFilePath);
      }
    }
  }

  isInvalid(field) {
    return field.$invalid && (field.$dirty || field.$touched);
  }

  isValid(field) {
    return !this.isInvalid(field);
  }

  getUserAgent() {
    return this.electron.remote.getCurrentWindow().webContents.session.getUserAgent();
  }

  forgotPassword() {
    this.electron.shell.openExternal('https://developers.redhat.com/auth/realms/rhd/login-actions/reset-credentials');
  }

  createAccount() {
    this.electron.shell.openExternal('https://developers.redhat.com/auth/realms/rhd/protocol/openid-connect/registrations?client_id=web&response_mode=fragment&response_type=code&redirect_uri=https%3A%2F%2Fdevelopers.redhat.com%2F%2Fconfirmation');
  }

  gotoDRH() {
    this.electron.shell.openExternal('https://developers.redhat.com');
  }

  handleHttpSuccess(result) {
    this.httpError = undefined;
    if (result.status == 200 && result.data) {
      this.installerDataSvc.setCredentials(this.username, this.password);
      this.isLoginBtnClicked = false;
      this.router.go('install');
      this.authFailed = false;
      // Storing the password for next use
      if (this.rememberMe) {
        let dataFilePath = Platform.localAppData();
        mkdirp.sync(dataFilePath);
        let data = {'username': this.username};
        fs.writeFileSync(path.join(dataFilePath, 'settings.json'), JSON.stringify(data));
        TokenStore.setItem('login', this.username, this.password);
      }
    } else if (result.status == 200 && result.data == false) {
      this.tandcNotSigned = true;
      this.isLoginBtnClicked = false;
      this.authFailed = false;
    } else {
      this.isLoginBtnClicked = false;
      this.authFailed = true;
    }
    this.timeout();
  }

  handleHttpFailure(error) {
    this.authFailed = false;
    this.isLoginBtnClicked = false;
    this.httpError = error;
    console.error(error);
    this.timeout();
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.router.go('confirm');
  }
}

AccountController.$inject = ['$state', '$timeout', '$scope', 'request', '$base64', 'installerDataSvc', 'electron', '$document'];

export default AccountController;
