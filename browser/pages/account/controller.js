'use strict';

import Util from '../../model/helpers/util';
const remote = require('electron').remote;
const shell = require('electron').shell;
let pjson = require('../../../package.json');

class AccountController {

  constructor($state, $timeout, $scope, request, $base64, installerDataSvc) {
    this.router = $state;
    this.http = request;
    this.base64 = $base64;
    this.timeout = $timeout;
    this.scope = $scope;
    this.installerDataSvc = installerDataSvc;

    this.username = '';
    this.password = '';
    this.authFailed = false;
    this.tandcNotSigned = false;
    this.pdkVersion = pjson.version;
    this.isLoginBtnClicked = false;
    this.httpError = undefined;
  }

  login() {
    this.resetLoginErrors();
    let req = {
      method: 'GET',
      url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip',
      auth: {
        user: this.username,
        pass: this.password,
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

  isInvalid(field) {
    return field.$invalid && (field.$dirty || field.$touched);
  }

  isValid(field) {
    return !this.isInvalid(field);
  }

  getUserAgent() {
    return remote.getCurrentWindow().webContents.session.getUserAgent();
  }

  forgotPassword() {
    shell.openExternal('https://developers.redhat.com/auth/realms/rhd/account');
  }

  createAccount() {
    shell.openExternal('https://developers.redhat.com/auth/realms/rhd/protocol/openid-connect/registrations?client_id=web&response_mode=fragment&response_type=code&redirect_uri=https%3A%2F%2Fdevelopers.redhat.com%2F%2Fconfirmation');
  }

  gotoDRH() {
    shell.openExternal('https://developers.redhat.com');
  }

  handleHttpSuccess(result) {
    this.httpError = undefined;
    if (result.status == 200 && result.data == true) {
      this.installerDataSvc.setCredentials(this.username, this.password);
      this.isLoginBtnClicked = false;
      this.router.go('location');
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
    this.apply();
  }

  apply() {
    this.timeout(()=>{
      this.scope.$apply();
    });
  }
}

AccountController.$inject = ['$state', '$timeout', '$scope', 'request', '$base64', 'installerDataSvc'];

export default AccountController;
