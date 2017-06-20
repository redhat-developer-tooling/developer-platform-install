'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import ElectronMock from '../../../mock/electron';
import ConfirmController from 'browser/pages/confirm/controller';
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
  let $watch;
  let $controller;
  let $scope;
  let confirmController;
  let installerDataSvc;

  let context = function context(_$controller_, _$rootScope_, _$state_, _$timeout_, _installerDataSvc_) {
  // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $scope = _$rootScope_.$new();
    $scope.$apply = function applyStub() {};
    $watch = sandbox.spy($scope, '$watch');
    installerDataSvc = _installerDataSvc_;
    sandbox.stub(installerDataSvc, 'copyUninstaller');
    sandbox.stub(fs, 'existsSync').returns(true);
    sandbox.spy(_$state_, 'go');
    installerDataSvc.setup();
    for (var installer of installerDataSvc.allInstallables().values()) {
      sandbox.stub(installer, 'detectExistingInstall').resolves();
    }
    confirmController = $controller('ConfirmController', {
      $scope,
      $state: _$state_,
      $timeout: function timeoutStub(callback) { callback(); },
      installerDataSvc,
      electron
    });
    sandbox.spy(confirmController, 'setIsDisabled');
  };

  describe('initial state', function() {
    describe('on all platforms', function() {
      beforeEach(inject(context));
      it('install watcher to track cdk selection to select its requirements', function() {
        expect($watch).to.be.calledWith('checkboxModel.cdk.selectedOption');
      });

      it('install watcher to track devstudio selection to select its requirements', function() {
        expect($watch).to.be.calledWith('checkboxModel.devstudio.selectedOption');
      });

      it('install watcher for $viewContentLoaded to trigger detection', function() {
        expect($watch).to.be.calledWith('$viewContentLoaded');
      });

      it('installs watchers to track components selected for install', function() {
        expect($watch.callCount).to.be.equal(confirmController.installerDataSvc.allInstallables().size+5);
      });

      it('unlock user interface after detection ends without errors', function() {
        confirmController.detectInstalledComponents();
        return confirmController.detection.then(function() {
          expect(confirmController.setIsDisabled).to.be.called;
        });
      });

      it('unlock user interface after detection ends with errors', function() {
        installerDataSvc.getInstallable('cdk').detectExistingInstall.rejects('error');
        confirmController.detectInstalledComponents();
        return confirmController.detection.then(function() {
          expect(confirmController.setIsDisabled).to.be.called;
        });
      });
    });
  });

  describe('install', function() {
    beforeEach(function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
    });
    beforeEach(inject(context));
    it('should navigate to install page', function() {
      $watch.args.forEach(function(el) {
        if(el[0] == '$viewContentLoaded') {
          el[1]();
        }
      });
      return confirmController.detection.then(function() {
        confirmController.install();
        expect(confirmController.router.go).calledOnce;
      });
    });

    it('should deselect openjdk if jbosseap and devstudio are not selected', function() {
      confirmController.detectInstalledComponents();
      return confirmController.detection.then(function() {
        expect(confirmController.sc.checkboxModel.jdk.selectedOption).equals('install');
        confirmController.sc.checkboxModel.devstudio.selectedOption = 'detected';
        confirmController.sc.checkboxModel.jbosseap.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.jbosseap.selectedOption'
            || el[0] == 'checkboxModel.devstudio.selectedOption') {
            el[1]();
          }
        });
        expect(confirmController.sc.checkboxModel.jdk.selectedOption).equals('detected');
      });
    });

    it('should select openjdk if jbosseap or devstudio selected', function() {
      confirmController.detectInstalledComponents();
      return confirmController.detection.then(function() {
        expect(confirmController.sc.checkboxModel.jdk.selectedOption).equals('install');
        confirmController.sc.checkboxModel.devstudio.selectedOption = 'detected';
        confirmController.sc.checkboxModel.jbosseap.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.jbosseap.selectedOption'
            || el[0] == 'checkboxModel.devstudio.selectedOption') {
            el[1]('detected');
          }
        });
        expect(confirmController.sc.checkboxModel.jdk.selectedOption).equals('detected');
        confirmController.detectInstalledComponents();
        confirmController.sc.checkboxModel.devstudio.selectedOption = 'install';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.devstudio.selectedOption') {
            el[1]('install');
          }
        });
        expect(confirmController.sc.checkboxModel.jdk.selectedOption).equals('install');
      });
    });

    it('should deselect cygwin and virtualbox if cdk deselected', function() {
      confirmController.detectInstalledComponents();
      return confirmController.detection.then(function() {
        expect(confirmController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(confirmController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
        confirmController.sc.checkboxModel.cdk.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]('detected');
          }
        });
        expect(confirmController.sc.checkboxModel.cygwin.selectedOption).equals('detected');
        expect(confirmController.sc.checkboxModel.virtualbox.selectedOption).equals('detected');
      });
    });

    it('should select cygwin and virtualbox if cdk selected', function() {
      confirmController.detectInstalledComponents();
      return confirmController.detection.then(function() {
        expect(confirmController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(confirmController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
        confirmController.sc.checkboxModel.cdk.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]('detected');
          }
        });
        expect(confirmController.sc.checkboxModel.cygwin.selectedOption).equals('detected');
        expect(confirmController.sc.checkboxModel.virtualbox.selectedOption).equals('detected');
        confirmController.sc.checkboxModel.cdk.selectedOption = 'install';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]('install');
          }
        });
        expect(confirmController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(confirmController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
      });
    });
  });

  describe('back', function() {
    beforeEach(function() {
      sandbox.stub(confirmController.router, 'go');
      confirmController.back();
    });

    it('navigates to location page', function() {
      expect(confirmController.router.go).calledWith('location');
    });
  });

  describe('exit', function() {
    it('exit closes active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      confirmController.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });

  describe('isConfigurationValid', function() {
    it('should return true if all components selected for install are configured correctly', function() {
      expect(confirmController.isConfigurationValid()).to.be.true;
    });

    it('should return false if nothing is selected for installation', function() {
      sandbox.stub(ConfirmController.prototype, 'isAtLeastOneSelected').returns(false);
      expect(confirmController.isConfigurationValid()).to.be.false;
    });

    it('should return false if at least one component selected for installation is not configured correctly', function() {
      sandbox.stub(ConfirmController.prototype, 'cdkIsConfigured').returns(false);
      expect(confirmController.isConfigurationValid()).to.be.false;
    });
  });

  describe('download', function() {
    it('should open url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      confirmController.download('url');
      expect(electron.shell.openExternal).calledOnce;
    });
  });
});
