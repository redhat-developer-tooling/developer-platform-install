'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import path from 'path';
import keytar from 'keytar';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import TokenStore from 'browser/services/credentialManager';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
import {LocalStorage} from 'node-localstorage';
chai.use(sinonChai);


describe('Platform', function() {

  let sandbox;

  before(function(){
    mockfs({
      appdatapath: {
        settings: {
          username : '{"username":"abc@redhat.com"}'
        }
      },
      createCwd: false,
      createTmp: false
    });
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  after(function() {
    mockfs.restore();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('setItem', function() {
    it('should set user\'s credentials', function() {
      sandbox.stub(keytar, 'setPassword').resolves();
      return TokenStore.setItem('login', 'username', 'password').then(() => {
        expect(keytar.setPassword).calledWith('login', 'username', 'password');
      });
    });
  });

  describe('getItem', function() {
    it('should call keytar.getPassword and return promise', function() {
      sandbox.stub(keytar, 'getPassword').resolves('password');
      return TokenStore.getItem('login', 'username').then((result) => {
        expect(keytar.getPassword).calledWith('login', 'username');
        expect(result).to.be.equal('password');
      });
    });
  });

  describe('getUserName', function() {
    it('should able to get the user login', function() {
      sandbox.stub(LocalStorage.prototype, 'getItem').returns('abc@redhat.com');
      let getUserName = TokenStore.getUserName();
      expect(getUserName).to.be.equal('abc@redhat.com')
    });
  });
});
