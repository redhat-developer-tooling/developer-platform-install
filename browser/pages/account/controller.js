'use strict';

import Util from '../../model/helpers/util';

const shell = require('electron').shell;
let pjson = Util.resolveFile('.', 'package.json');

class AccountController {

  constructor($state, $http, $base64, installerDataSvc) {
    this.router = $state;
    this.http = $http;
    this.base64 = $base64;
    this.installerDataSvc = installerDataSvc;

    this.username = "";
    this.password = "";
    this.authFailed = false;
    this.tandcNotSigned = false;
    this.pdkVersion = pjson.version;
    this.isLoginBtnClicked = false;
  }

  login() {
    this.authFailed = false;
    this.tandcNotSigned = false;

    let req = {
      method: 'GET',
      url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.0.0-beta3.zip',
      headers: {
        'Authorization': 'Basic ' + this.base64.encode(this.username + ':' + this.password)
      }
    };

    this.http(req)
      .then(this.handleHttpSuccess.bind(this))
      .catch(this.handleHttpFailure.bind(this));
  }

  forgotPassword() {
    shell.openExternal('https://developers.redhat.com/auth/realms/rhd/account');
  }

  createAccount() {
    shell.openExternal('https://developers.redhat.com/auth/realms/rhd/account');
  }

  gotoDRH() {
    shell.openExternal('https://developers.redhat.com');
  }

  handleHttpSuccess(result) {
    if (result.status == 200) {
      if (result.data == true) {
        this.installerDataSvc.setCredentials(this.username, this.password);
        this.router.go('location');
        this.isLoginBtnClicked = false;
        return;
      } else if (result.data == false) {
        this.tandcNotSigned = true;
        this.isLoginBtnClicked = false;
        return;
      }
    }
    this.authFailed = true;
  }

  handleHttpFailure() {
    this.authFailed = true;
    this.isLoginBtnClicked = false;
  }
}

AccountController.$inject = ['$state', '$http', '$base64', 'installerDataSvc'];

export default AccountController;
