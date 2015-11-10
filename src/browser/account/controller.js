class AccountController {
  constructor($state, $http) {
    this.router = $state;
    this.http = $http;

    this.username = "";
    this.password = "";
  }

  login() {
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
          console.log(result.data)
          this.router.go('confirm');
        } else {
          console.log('Failed to authenticate')
        }
      },
      failure => {
        console.log('Failed to authenticate')
      });
  }
}

AccountController.$inject = ['$state', '$http'];

export default AccountController;
