'use strict'

class AccountController {
  constructor($state, $http) {
    this.router = $state;
    this.http = $http;

    this.username = "";
    this.password = "";
    this.authFailed = false;
  }

  login() {
    this.authFailed = false;

    var req = {
      method: 'GET',
      url: 'https://idp.redhat.com/idp/authUser?' +
        'j_username=' + this.username +
        '&j_password=' + this.password +
        '&redirect=https://access.redhat.com/jbossnetwork/restricted/listSoftware.html'
    };

    this.http(req)
      .then(result => {
        if (result.status == 200) {
          this.router.go('confirm');
        } else {
          this.authFailed = true;
        }
      },
      failure => {
        this.authFailed = true;
      });
  }
}

AccountController.$inject = ['$state', '$http'];

export default AccountController;
