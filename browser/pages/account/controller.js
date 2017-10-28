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
    this.httpError = undefined;
    $scope.$on('$destroy', this.save.bind(this));
    this.electron.remote.getCurrentWindow().addListener('blur', this.save.bind(this));
  }

  login() {
    this.isLoginBtnClicked = true;
    this.resetLoginErrors();
    let req = {
      method: 'GET',
      url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip',
      auth: {
        user: this.installerDataSvc.username,
        pass: this.installerDataSvc.password,
        sendImmediately: true
      },
      headers: {
        'Accept'    : 'application/json, text/plain, */*',
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
    TokenStore.localStorage.setItem('rememberMe', this.installerDataSvc.rememberMe);
    if (this.installerDataSvc.rememberMe) {
      TokenStore.localStorage.setItem('username', this.installerDataSvc.username);
      TokenStore.setPassword(this.installerDataSvc.password);
    } else {
      TokenStore.removePassword();
      TokenStore.localStorage.removeItem('username');
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
    this.electron.shell.openExternal('https://developers.redhat.com/auth/realms/rhd/account');
  }

  createAccount() {
    this.electron.shell.openExternal('https://developers.redhat.com/auth/realms/rhd/protocol/openid-connect/registrations?client_id=web&response_mode=fragment&response_type=code&redirect_uri=https%3A%2F%2Fdevelopers.redhat.com%2F%2Fconfirmation');
  }

  gotoDRH() {
    this.electron.shell.openExternal('https://developers.redhat.com');
  }

  handleHttpSuccess(result) {
    this.httpError = undefined;
    if (result.status == 200 && result.data == true) {
      this.isLoginBtnClicked = false;
      this.electron.remote.getCurrentWindow().removeAllListeners('blur');
      this.router.go('install');
      this.authFailed = false;
    } else if (result.status == 200 && result.data == false) {
      this.tandcNotSigned = true;
      this.isLoginBtnClicked = false;
      this.authFailed = false;
    } else {
      this.isLoginBtnClicked = false;
      this.authFailed = true;
    }
    this.apply();
  }

  handleHttpFailure(error) {
    this.authFailed = false;
    this.isLoginBtnClicked = false;
    this.httpError = error;
    console.error(error);
    this.apply();
  }

  apply() {
    this.timeout(()=>{
      this.scope.$apply();
    });
  }

  exit() {
    Logger.info('Closing the installer window');
    this.electron.remote.getCurrentWindow().close();
  }

  back() {
    Logger.info('Going back a page');
    this.electron.remote.getCurrentWindow().removeAllListeners('blur');
    this.router.go('confirm');
  }
}

AccountController.$inject = ['$state', '$timeout', '$scope', 'request', '$base64', 'installerDataSvc', 'electron'];

export default AccountController;
