'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import path from 'path';
import TokenStore from 'browser/services/credentialManager';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
chai.use(sinonChai);


describe('Platform', function() {

  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('setItem', function() {
    it('should able to set the user credential', function() {
      return TokenStore.setItem('login', 'username', 'password').then((result) => {
        expect(result).to.be.undefined;
      });
    });
  });

  describe('getItem', function() {
    it('should able to get the user password', function() {
      return TokenStore.getItem('login', 'username').then((result) => {
        expect(result).to.be.equal('password');
      });
    });
  });

  describe('getUserName', function() {
    it('should able to get the user password', function() {
      sandbox.stub(Platform, 'localAppData').returns(path.resolve(__dirname, '..', '..', 'mock'));
      let getUserName = TokenStore.getUserName();
      expect(getUserName).to.be.equal('abc@redhat.com')
    });
  });
});
