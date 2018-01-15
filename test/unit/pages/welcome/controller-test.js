'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import Logger from 'browser/services/logger';
import { default as sinonChai } from 'sinon-chai';
import ElectronMock from '../../../mock/electron';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('LocationController', function() {
  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();
  let $controller;
  let $rootScope;
  let welcomeController;

  ngModule.sharedInjector();
  before(ngModule('devPlatInstaller'));
  before(inject(function(_$controller_, _$rootScope_, _$state_) {
  // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    $rootScope.$apply = function(){};
    welcomeController = $controller('WelcomeController', {
      $state: _$state_,
      $scope: $rootScope,
      electron,
      request: function(){}
    });
  }));

  beforeEach(function() {
    sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('openDevSuiteOverview opens external browser with devsuite page', function() {
    sandbox.stub(electron.shell, 'openExternal');
    welcomeController.openDevSuiteOverview();
    expect(electron.shell.openExternal).calledOnce;
  });

  describe('next', function() {
    beforeEach(function() {
      sandbox.stub(welcomeController.router, 'go');
      welcomeController.next();
    });

    it('navigates to account page', function() {
      expect(welcomeController.router.go).calledWith('location');
    });
  });

  describe('check', function() {
    it('sends request for download manager version information', function() {
      sandbox.stub(welcomeController, 'http').returns({
        then: function(){
          return {
            catch: function() {
              return {
                then: function(){}
              }
            }
          }
        }
      });
      welcomeController.check()
      expect(welcomeController.http).calledWith({
        method: 'GET',
        url: welcomeController.URL_DM_DEVSUITE_INFO
      });
    });

    it('reports new version availability if current version less than latest available', function() {
      sandbox.stub(welcomeController, 'http').resolves({
        data: [{
          featuredArtifact: {
            versionName: '10.0.0'
          }
        }]
      });
      return welcomeController.check().then(()=>{
        expect(welcomeController.scope.status).equals('New');
      });
    });
    it('reports the current version is up to date if the latest available version is the same', function() {
      sandbox.stub(welcomeController, 'http').resolves({
        data: [{
          featuredArtifact: {
            versionName: welcomeController.scope.version
          }
        }]
      });
      return welcomeController.check().then(()=>{
        expect(welcomeController.scope.status).equals('Current');
      });
    });
    it('reports the current version is up to date if the latest available version is smaller', function() {
      sandbox.stub(welcomeController, 'http').resolves({
        data: [{
          featuredArtifact: {
            versionName: '1.0.0'
          }
        }]
      });
      return welcomeController.check().then(()=>{
        expect(welcomeController.scope.status).equals('Current');
      });
    });
    it('reports the current version is up to date if something went wrong during detection', function() {
      sandbox.stub(welcomeController, 'http').resolves({
        data: [{
          featuredArtifact: {
            versionName: '1-0.0'
          }
        }]
      });
      return welcomeController.check().then(()=>{
        expect(welcomeController.scope.status).equals('Error');
      });
    });
  });
  describe('downloadLatestVersion', function() {
    it('open devsuite download page, suppress exit confirmation and close installer', function() {
      sandbox.stub(welcomeController.electron.shell, 'openExternal');
      sandbox.stub(welcomeController.electron.remote.currentWindow, 'close');
      sandbox.stub(welcomeController.electron.remote.currentWindow, 'removeAllListeners');
      welcomeController.downloadLatestVersion();
      expect(welcomeController.electron.shell.openExternal).calledWith(welcomeController.URL_DEVSUITE_DOWNLOAD_PAGE);
      expect(welcomeController.electron.remote.currentWindow.removeAllListeners).calledOnce;
      expect(welcomeController.electron.remote.currentWindow.close).calledOnce;
    });
  });
});
