'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import ElectronMock from '../../../mock/electron';

import fs from 'fs';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

global.menu = {insert() {}};
global.MenuItem = function () {};
global.restoreMenu = function() {};

describe('SelectionController', function() {

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
  let selectionController;
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

    selectionController = $controller('SelectionController', {
      $scope,
      $state: _$state_,
      $timeout: function timeoutStub(callback) { callback(); },
      installerDataSvc,
      electron
    });
    sandbox.spy(selectionController, 'setIsDisabled');
    for (let installer of installerDataSvc.allInstallables().values()) {
      sandbox.stub(installer, 'detectExistingInstall').resolves();
    }
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
        expect($watch.callCount).to.be.equal(selectionController.installerDataSvc.allInstallables().size+1);
      });

      it('unlock user interface after detection ends without errors', function() {
        return selectionController.initPage().then(function() {
          expect(selectionController.setIsDisabled).to.be.called;
        });
      });

      it('unlock user interface after detection ends with errors', function() {
        installerDataSvc.getInstallable('cdk').detectExistingInstall.rejects('error');
        return selectionController.initPage().then(function() {
          expect(selectionController.setIsDisabled).to.be.called;
        });
      });

      it('shows appropriate message when detection is in progress', function() {
        selectionController.initPage();
        expect(selectionController.installedSearchNote).includes('checking');
      });

      it('counts and present one detected component', function() {
        selectionController.sc.checkboxModel.kompose.selectedOption = 'detected';
        selectionController.sc.checkboxModel.kompose.option.detected = { valid: true };
        return selectionController.initPage().then(function() {
          expect(selectionController.numberOfExistingInstallations).equals(1);
          expect(selectionController.installedSearchNote).includes(' 1 ');
        });
      });

      it('counts and presents number of detected components', function() {
        selectionController.sc.checkboxModel.kompose.selectedOption = 'detected';
        selectionController.sc.checkboxModel.kompose.option.detected = { valid: true };
        selectionController.sc.checkboxModel.jdk.selectedOption = 'detected';
        selectionController.sc.checkboxModel.jdk.option.detected = { valid: true };
        return selectionController.initPage().then(function() {
          expect(selectionController.numberOfExistingInstallations).equals(2);
          expect(selectionController.installedSearchNote).includes(' 2 ');
        });
      });
    });
  });

  describe('activatePage', function() {
    beforeEach(inject(context));
    it('unlock user interface after detection ends without errors', function() {
      return selectionController.activatePage().then(function() {
        expect(selectionController.setIsDisabled).to.be.called;
      });
    });

    it('unlock user interface after detection ends with errors', function() {
      installerDataSvc.getInstallable('cdk').detectExistingInstall.rejects('error');
      return selectionController.activatePage().then(function() {
        expect(selectionController.setIsDisabled).to.be.called;
      });
    });
  });

  describe('dependency resolution', function() {
    beforeEach(function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
    });
    beforeEach(inject(context));
    it('should deselect openjdk if jbosseap and devstudio are not selected', function() {

      return selectionController.initPage().then(function() {
        expect(selectionController.sc.checkboxModel.jdk.selectedOption).equals('install');
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && (el[0] == 'checkboxModel.jbosseap.selectedOption'
            || el[0] == 'checkboxModel.devstudio.selectedOption'
            || el[0] == 'checkboxModel.fusetools.selectedOption')) {
            el[1]();
          }
        });
        selectionController.sc.checkboxModel.devstudio.selectedOption = 'detected';
        selectionController.sc.checkboxModel.jbosseap.selectedOption = 'detected';
        selectionController.sc.checkboxModel.fusetools.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && (el[0] == 'checkboxModel.jbosseap.selectedOption'
            || el[0] == 'checkboxModel.devstudio.selectedOption'
            || el[0] == 'checkboxModel.fusetools.selectedOption')) {
            el[1]('detected', 'install');
          }
        });
        expect(selectionController.sc.checkboxModel.jdk.selectedOption).equals('detected');
      });
    });

    it('should select openjdk if jbosseap or devstudio selected', function() {
      return selectionController.initPage().then(function() {
        expect(selectionController.sc.checkboxModel.jdk.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.devstudio.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.jbosseap.selectedOption).equals('detected');
        selectionController.sc.checkboxModel.jbosseap.selectedOption = 'install';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && ( el[0] == 'checkboxModel.jbosseap.selectedOption'
              || el[0] == 'checkboxModel.devstudio.selectedOption')) {
            el[1]('install', 'install'); // the same does angular avter initialization
          }
        });
        selectionController.sc.checkboxModel.devstudio.selectedOption = 'detected';
        selectionController.sc.checkboxModel.jbosseap.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && ( el[0] == 'checkboxModel.jbosseap.selectedOption'
              || el[0] == 'checkboxModel.devstudio.selectedOption')) {
            el[1]('detected', 'install');
          }
        });
        expect(selectionController.sc.checkboxModel.jdk.selectedOption).equals('detected');

        selectionController.sc.checkboxModel.devstudio.selectedOption = 'install';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.devstudio.selectedOption') {
            el[1]('install', 'detected');
          }
        });
        expect(selectionController.sc.checkboxModel.jdk.selectedOption).equals('install');
      });
    });

    it('should deselect cygwin and virtualbox if cdk deselected', function() {
      return selectionController.initPage().then(function() {
        expect(selectionController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]('install', 'detected');
          }
        });
        selectionController.sc.checkboxModel.cdk.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]('detected', 'install');
          }
        });
        expect(selectionController.sc.checkboxModel.cygwin.selectedOption).equals('detected');
        expect(selectionController.sc.checkboxModel.virtualbox.selectedOption).equals('detected');
      });
    });

    it('should select cygwin and virtualbox if cdk selected', function() {
      return selectionController.initPage().then(function() {
        expect(selectionController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.cdk.selectedOption).equals('install');
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && 'checkboxModel.cdk.selectedOption') {
            el[1]();
          }
        });
        selectionController.sc.checkboxModel.cdk.selectedOption = 'detected';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]();
          }
        });

        selectionController.sc.checkboxModel.cdk.selectedOption = 'install';
        $watch.args.forEach(function(el) {
          if(el[1].name == 'watchComponent'
            && el[0] == 'checkboxModel.cdk.selectedOption') {
            el[1]();
          }
        });
        expect(selectionController.sc.checkboxModel.cygwin.selectedOption).equals('install');
        expect(selectionController.sc.checkboxModel.virtualbox.selectedOption).equals('install');
      });
    });
  });

  describe('back', function() {
    beforeEach(function() {
      sandbox.stub(selectionController.router, 'go');
      selectionController.back();
    });

    it('navigates to location page', function() {
      expect(selectionController.router.go).calledWith('location');
    });
  });

  describe('exit', function() {
    it('exit closes active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      selectionController.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });

  describe('isConfigurationValid', function() {
    it('should return true if all components selected for install are configured correctly', function() {
      //JDK on mac only is configured properly when detected with a valid version
      if (Platform.getOS() === 'darwin') {
        selectionController.sc.checkboxModel.jdk.selectedOption = 'detected';
        selectionController.sc.checkboxModel.jdk.option.detected = { valid: true };
      }
      selectionController.sc.checkboxModel.kompose.selectedOption = 'detected';

      expect(selectionController.isConfigurationValid()).to.be.true;
    });

    it('should return false if nothing is selected for installation', function() {
      for (var installer of installerDataSvc.allInstallables().values()) {
        sandbox.stub(installer, 'isSkipped').returns(true);
      }
      expect(selectionController.isConfigurationValid()).to.be.false;
    });

    it('should return false if at least one component selected for installation is not configured correctly', function() {
      let cdk = selectionController.installerDataSvc.getInstallable('cdk');
      sandbox.stub(cdk, 'isConfigurationValid').returns(false);
      expect(selectionController.isConfigurationValid()).to.be.false;
    });
  });

  describe('download', function() {
    it('should open url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      selectionController.download('url');
      expect(electron.shell.openExternal).calledOnce;
    });
  });

  describe('detectInstalledComponents', function() {
    it('should return existing promise if detection is already running', function() {
      let detection = selectionController.detectInstalledComponents();
      expect(detection).equals(selectionController.detectInstalledComponents());
    });
  });

  describe('selectAll', function() {
    beforeEach(inject(context));
    it('should not select detected components', function() {
      let kompose = selectionController.sc.checkboxModel.kompose;
      kompose.addOption('detected', '1.0.0', 'location', true);
      kompose.selectedOption = 'detected';
      selectionController.selectAll();
      expect(kompose.selectedOption).equals('detected');
    });

    it('should select all installable components', function() {
      let kompose = selectionController.sc.checkboxModel.kompose;
      selectionController.selectAll();
      expect(kompose.selectedOption).equals('install');
    });
  });

  describe('deselectAll', function() {
    beforeEach(inject(context));
    it('should deselect all detected components', function() {
      selectionController.deselectAll();
      for (let installer of installerDataSvc.allInstallables().values()) {
        expect(installer.selectedOption).equals('detected');
      }
    });
  });
});
