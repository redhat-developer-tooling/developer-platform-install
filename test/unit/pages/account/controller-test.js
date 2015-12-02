'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import AccountController from 'pages/account/controller';
chai.use(sinonChai);

describe('Login controller', function(){

  let controller;

  describe('initial state', function() {

    beforeEach(function() {
      controller = new AccountController();
    });

    it('should not be failed', function() {
      expect(controller.authFailed).to.be.defined;
      expect(controller.authFailed).to.be.false;
    });

    it('username should be empty', function() {
      expect(controller.username).to.be.defined;
      expect(controller.username).to.be.empty;
    });

    it('password should be empty', function() {
      expect(controller.password).to.be.defined;
      expect(controller.password).to.be.empty;
    });

    it('terms and conditions should be considered signed', function() {
      expect(controller.tandcNotSigned).to.be.defined;
      expect(controller.tandcNotSigned).to.be.false;
    });
  });

  describe('login', function() {

    let http, base64;

    beforeEach(function() {
      http = sinon.stub();
      base64 = { encode: function() {}};
    });

    it('should make an HTTP request', function(){
      http.returns(Promise.resolve('success'));

      controller = new AccountController({}, http, base64);
      controller.login();

      expect(http).to.have.been.called.once;
    });

    it('should make a GET request with correct username and password', function(){
      http.returns(Promise.resolve('success'));
      base64 = { encode: function(input) { return input }};

      let req = {
        method: 'GET',
        url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.0.0-beta3.zip',
        headers: {
          'Authorization': 'Basic username:password'
        }
      }

      controller = new AccountController({}, http, base64);
      controller.username = 'username';
      controller.password = 'password';
      controller.login();

      expect(http).to.have.been.calledWith(req);
      expect(http).to.have.been.called.once;
    });

    it('should set authFailed after failure', function(){
      http.rejects('failure');

      controller = new AccountController({}, http, base64);
      controller.login();

      http().then(function() {
        expect(controller.authFailed).to.be.defined;
        expect(controller.authFailed).to.be.true;
      });
    });

    it('should set authFailed when return code of HTTP request is not 200', function(){
      http.resolves({ status: 404 });

      controller = new AccountController({}, http, base64);
      controller.login();

      http().then(function() {
        expect(http).to.have.been.called.once;
        expect(controller.authFailed).to.be.true;
      });
    });

    it('should set tandcNotSigned when no data returned', function(){
      http.resolves({ status: 200, data: false });

      controller = new AccountController({}, http, base64);
      controller.login();

      http().then(function() {
        expect(controller.tandcNotSigned).to.be.true;
        expect(controller.authFailed).to.be.false;
      });
    });

    it('should go to the page "confirm" when everything is OK', function(){
      http.resolves({ status: 200, data: true });
      let router = { go: function() {} };
      let spy = sinon.spy(router, 'go');

      controller = new AccountController(router, http, base64);
      controller.login();

      http().then(function() {
        expect(spy).to.have.been.called.once;
        expect(spy).to.have.been.calledWith('confirm');
        expect(controller.tandcNotSigned).to.be.false;
        expect(controller.authFailed).to.be.false;
      });
    });

  });
})
