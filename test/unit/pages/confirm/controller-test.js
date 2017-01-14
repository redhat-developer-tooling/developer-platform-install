'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import Logger from 'browser/services/logger';
import ElectronMock from '../../../mock/electron';
import InstallerDataService from 'browser/services/data';
import InstallableItem from 'browser/model/installable-item';
import ConfirmController from 'browser/pages/confirm/controller';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('ConfirmController', function() {

  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();
  let $watch = sinon.stub();
  let $scope = {$watch};
  let $controller;
  let $rootScope;
  let confirmcontroller;
  let installerDataSvc;

  describe('initial state', function() {
    beforeEach(ngModule('devPlatInstaller'));
    beforeEach(inject(function(_$controller_, _$rootScope_, _$state_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
      $rootScope = _$rootScope_;
      confirmcontroller = $controller('ConfirmController', {
        $scope: $rootScope,
        $state: _$state_,
        $timeout: undefined,
        installerDataSvc: new InstallerDataService(),
        electron });
    }));

    it('installs watchers to track components selected for install', function() {
      expect($watch.callCount).to.be.equal(confirmcontroller.installerDataSvc.allInstallables().size+0);
    });
  });

  beforeEach(function() {
    sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('back', function() {
    beforeEach(function() {
      sandbox.stub(confirmcontroller.router, 'go');
      confirmcontroller.installerDataSvc.installRoot = 'folderName';
      confirmcontroller.back();
    });

    it('sets selected folder as target folder in data service', function() {
      expect(confirmcontroller.installerDataSvc.installRoot).to.be.equal('folderName');
    });

    it('navigates to location page', function() {
      expect(confirmcontroller.router.go).calledWith('location');
    });
  });

  describe('exit', function() {
    it('exit closes active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      confirmcontroller.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });

  describe('download', function() {
    it('should open url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      confirmcontroller.download('url');
      expect(electron.shell.openExternal).calledOnce;
    });
  });
});
