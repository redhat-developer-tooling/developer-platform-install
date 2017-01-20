'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import Logger from 'browser/services/logger';
import ElectronMock from '../../../mock/electron';
import InstallerDataService from 'browser/services/data';
import InstallableItem from 'browser/model/installable-item';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('ConfirmController', function() {

  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();
  let $watch;
  let $controller;
  let $scope;
  let confirmController;
  let installerDataSvc;

  describe('initial state', function() {
    beforeEach(ngModule('devPlatInstaller'));
    beforeEach(inject(function(_$controller_, _$rootScope_, _$state_, _$timeout_, _installerDataSvc_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
      $scope = _$rootScope_.$new();
      $watch = sandbox.spy($scope, '$watch');
      installerDataSvc = _installerDataSvc_;
      for (var installer of installerDataSvc.allInstallables().values()) {
        sandbox.stub(installer, 'detectExistingInstall').yields();
      }
      // installerDataSvc = new InstallerDataService();
      // let jdk = new InstallableItem('jdk', 10000, 'https://domain.com/jdk.msi', null, 'jdk', installerDataSvc);
      // sandbox.stub(jdk, 'detectExistingInstall').yields();
      // installerDataSvc.addItemToInstall('jdk', jdk);
      confirmController = $controller('ConfirmController', {
        $scope,
        $state: _$state_,
        $timeout: function(callback) { callback(); },
        installerDataSvc,
        electron
      });
      sandbox.spy(confirmController, 'setIsDisabled');
    }));

    it('install watcher to track cdk selection to select its requirements', function() {
      expect($watch).to.be.calledWith('checkboxModel.cdk.selectedOption');
    });

    it('install watcher to track devstudio selection to select its requirements', function() {
      expect($watch).to.be.calledWith('checkboxModel.jbds.selectedOption');
    });

    it('install watcher for $viewContentLoaded to trigger detection', function() {
      expect($watch).to.be.calledWith('$viewContentLoaded');
    });

    it('installs watchers to track components selected for install', function() {
      expect($watch.callCount).to.be.equal(confirmController.installerDataSvc.allInstallables().size+3);
    });

    it('unlock user interface after detection ends without errors', function() {
      return new Promise(function(resolve) {
        confirmController.sc.$apply = function() {
          resolve();
        };
        $scope.$digest();
      }).then(function() {
        expect(confirmController.setIsDisabled).to.be.called;
      });
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

  describe('download', function() {
    it('should open url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      confirmController.download('url');
      expect(electron.shell.openExternal).calledOnce;
    });
  });
});
