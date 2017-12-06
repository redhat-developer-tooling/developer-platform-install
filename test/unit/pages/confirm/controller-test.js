'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Logger from 'browser/services/logger';
import ElectronMock from '../../../mock/electron';
import InstallableItem from 'browser/model/installable-item';

import fs from 'fs';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('ConfirmController', function() {

  beforeEach(function() {
    sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
  });

  afterEach(function() {
    sandbox.restore();
  });

  beforeEach(ngModule('devPlatInstaller'));

  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();
  let $controller;
  let $scope;
  let confirmController;
  let installerDataSvc;
  let cdk;

  let context = function context(_$controller_, _$rootScope_, _$state_, _$timeout_, _installerDataSvc_) {
  // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $scope = _$rootScope_.$new();
    $scope.$apply = function applyStub() {};
    installerDataSvc = _installerDataSvc_;
    cdk = new InstallableItem('cdk', 'http://download.url', 'file-name.exe', 'folder', installerDataSvc, false);
    cdk.selectedOption = 'install';
    installerDataSvc.addItemToInstall('cdk', cdk);
    sandbox.stub(installerDataSvc, 'copyUninstaller');
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.spy(_$state_, 'go');
    installerDataSvc.setup();

    confirmController = $controller('ConfirmController', {
      $scope,
      $state: _$state_,
      $timeout: function timeoutStub(callback) { callback(); },
      installerDataSvc,
      electron
    });
  };

  describe('back', function() {
    beforeEach(inject(context));
    beforeEach(function() {
      confirmController.back();
    });

    it('navigates to selection page', function() {
      expect(confirmController.router.go).calledWith('selection');
    });
  });

  describe('exit', function() {
    it('exit closes active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      confirmController.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });

  describe('displayTotalInstallSize', function() {
    beforeEach(inject(context));
    it('should calculate total install size for selected components', function() {
      let cdk = confirmController.installerDataSvc.getInstallable('cdk');
      expect(confirmController.sc.updateTotalInstallSize()).equals(cdk.installSize);
    });
  });

  describe('displayTotalDownloadSize', function() {
    beforeEach(inject(context));
    it('should calculate total download size for selected components', function() {
      let cdk = confirmController.installerDataSvc.getInstallable('cdk');
      expect(confirmController.sc.updateTotalDownloadSize()).equals(cdk.size);
    });
  });

  describe('isAccountRequired', function() {
    beforeEach(inject(context));
    it('returns true if any selected component requires auth', function() {
      let cdk = confirmController.installerDataSvc.getInstallable('cdk');
      cdk.authRequired = true;
      expect(confirmController.isAccountRequired()).equals(true);
    });
    it('returns false if no components required auth selected', function() {
      confirmController.installerDataSvc.getInstallable('cdk');
      expect(confirmController.isAccountRequired()).equals(false);
    });
  });

  describe('next', function() {
    beforeEach(inject(context));
    it('navigates to Account page if auth required', function() {
      sandbox.stub(confirmController, 'isAccountRequired').returns(true);
      confirmController.next();
      expect(confirmController.router.go).has.been.calledWith('account');
    });
    it('navigates to Install page if auth is not required', function() {
      sandbox.stub(confirmController, 'isAccountRequired').returns(false);
      confirmController.next();
      expect(confirmController.router.go).has.been.calledWith('install');
    });
  });

  describe('getNextButtonName', function() {
    beforeEach(inject(context));
    it('retnurns "Download & Install" if auth required', function() {
      sandbox.stub(confirmController, 'isAccountRequired').returns(true);
      expect(confirmController.getNextButtonName()).equals('Next');
    });
    it('navigates to Install page if auth is not required', function() {
      sandbox.stub(confirmController, 'isAccountRequired').returns(false);
      expect(confirmController.getNextButtonName()).equals('Download & Install');
    });
  });
});
