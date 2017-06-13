'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import ElectronMock from '../../../mock/electron';
import AccountController from 'browser/pages/account/controller';
chai.use(sinonChai);

describe('Account controller', function() {

  let controller, timeout, scope;
  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();

  beforeEach(function() {
    timeout = function(cb) { cb(); };
    scope = { '$apply': function() { } };
    controller = new AccountController({}, timeout, scope, null, null, {}, electron);
  });

  afterEach(function() {
    sandbox.restore();
  });


  describe('initial state', function() {

    beforeEach(function() {
      controller = new AccountController();
    });

    it('should not be failed', function() {
      expect(controller).to.have.property('authFailed', false);
    });

    it('username should be empty', function() {
      expect(controller).to.have.property('username').to.be.empty;
    });

    it('password should be empty', function() {
      expect(controller).to.have.property('password').to.be.empty;
    });

    it('terms and conditions should be considered signed', function() {
      expect(controller).to.have.property('tandcNotSigned').to.be.false;
    });
  });

  describe('login', function() {

    let http, base64;

    before(function() {
      sinon.stub(AccountController.prototype, 'getUserAgent');
    });

    beforeEach(function() {
      base64 = { encode: function() {}};
    });


    it('should make an HTTP request', function() {
      http = sinon.stub().resolves('success');

      controller = new AccountController({}, timeout, scope, http, base64);
      controller.login();

      expect(http).to.have.been.calledOnce;
    });

    it('should make a GET request with correct username and password', function() {
      http = sinon.stub().resolves({
        status: 200,
        data: true
      });

      let req = {
        auth: { pass: 'password', sendImmediately: true, user: 'username' },
        followAllRedirects: true,
        headers: {
          Accept: 'application/json, text/plain, */*',
          'User-Agent': undefined },
        method: 'GET',
        rejectUnauthorized: true,
        url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip'
      };
      let installerDataSvc = { setCredentials: function() {} };
      let router = {go: function() {}};
      controller = new AccountController(router, timeout, scope, http, base64, installerDataSvc);
      controller.username = 'username';
      controller.password = 'password';
      controller.login();

      expect(http).to.have.been.calledWith(req);
      expect(http).to.have.been.calledOnce;
    });

    it('should call handleHttpFailure on HTTP failure', function() {
      http = ()=> Promise.reject('serious error');
      controller = new AccountController({}, timeout, scope, http, base64);
      let spy = sinon.spy(controller, 'handleHttpFailure');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith('serious error');
      });
    });

    it('should call handleHttpSuccess on successful HTTP request', function() {
      http = ()=> Promise.resolve({ status: 404 });
      controller = new AccountController({}, timeout, scope, http, base64);
      let spy = sinon.spy(controller, 'handleHttpSuccess');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith({ status: 404 });
      });
    });
  });

  describe('handleHttpFailure', function() {
    it('should set authFailed after failure', function() {
      controller.handleHttpFailure('some error');
      expect(controller.authFailed).to.be.false;
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.httpError).to.be.not.undefined;
    });
  });

  describe('createAccount', function() {
    it('should open createAccount url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.createAccount();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com/auth/realms/rhd/protocol/openid-connect/registrations?client_id=web&response_mode=fragment&response_type=code&redirect_uri=https%3A%2F%2Fdevelopers.redhat.com%2F%2Fconfirmation');
    });
  });

  describe('forgotPassword', function() {
    it('should open forgotPassword url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.forgotPassword();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com/auth/realms/rhd/account');
    });
  });

  describe('resetLoginErrors', function() {
    it('should able to reset login error', function() {
      controller.resetLoginErrors();
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.httpError).to.be.undefined;
      expect(controller.authFailed).to.be.false;
    });
  });

  describe('isValid', function() {
    it('should return false if $invalid is true and $dirty is true', function() {
      expect(controller.isValid({$invalid: true, $dirty: true})).to.be.false;
    });

    it('should return false if $dirty is false', function() {
      expect(controller.isValid({$invalid: true, $dirty: false, $touched: true})).to.be.false;
    });

    it('should return false if $touched is false', function() {
      expect(controller.isValid({$invalid: true, $dirty: true, $touched: false})).to.be.false;
    });

    it('should return false if $invalid, $dirty and $touched are true', function() {
      expect(controller.isValid({$invalid: true, $dirty: true, $touched: true})).to.be.false;
    });

    it('should return true if $invalid is false', function() {
      expect(controller.isValid({$invalid: false})).to.be.true;
    });
  });

  describe('gotoDRH', function() {
    it('should open DRH url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.gotoDRH();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com');
    });
  });

  describe('handleHttpSuccess', function() {
    it('should set authFailed when return code of HTTP request is not 200', function() {
      controller.handleHttpSuccess({ status: 404 });
      expect(controller.authFailed).to.be.true;
      expect(controller.tandcNotSigned).to.be.false;
    });

    it('should set tandcNotSigned when data is false', function() {
      controller.handleHttpSuccess({ status: 200, data: false });
      expect(controller.authFailed).to.be.false;
      expect(controller.tandcNotSigned).to.be.true;
    });

    it('should go to the page "confirm" when everything is OK', function() {
      let router = { go: function() {} };
      let spy = sinon.spy(router, 'go');
      let installerDataSvc = { setCredentials: function() {} };

      controller = new AccountController(router, timeout, scope, null, null, installerDataSvc);
      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('location');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });

    it('should save credentials for later use when everything is OK', function() {
      let router = { go: function() {} };
      let installerDataSvc = { setCredentials: function() {} };
      let spy = sinon.spy(installerDataSvc, 'setCredentials');

      controller = new AccountController(router, timeout, scope, null, null, installerDataSvc);
      controller.username = 'Frank';
      controller.password = 'p@ssw0rd';
      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Frank', 'p@ssw0rd');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });
  });
});
