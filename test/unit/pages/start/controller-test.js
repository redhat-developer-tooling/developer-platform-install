'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import ElectronMock from '../../../mock/electron';
import StartController from 'browser/pages/start/controller';
import InstallerDataService from 'browser/services/data';
import Logger from 'browser/services/logger';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('StartController', function() {
  let $controller, sandbox = sinon.sandbox.create();
  describe('constructor', function() {
    beforeEach(ngModule('devPlatInstaller'));
    beforeEach(inject(function(_$controller_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));
    afterEach(function() {
      sandbox.restore();
    });
    it('removes all window close event listeners', function() {
      let installerDataSvc = new InstallerDataService();
      let electron = new ElectronMock();
      sandbox.stub(electron.remote.currentWindow, 'removeAllListeners');
      // {
      //   remote : {
      //     getCurrentWindow: function() {
      //       return {
      //         removeAllListeners
      //       };
      //     }
      //   }
      // };
      $controller('StartController', { installerDataSvc, electron });
      expect(electron.remote.currentWindow.removeAllListeners).calledOnce;
      expect(electron.remote.currentWindow.removeAllListeners).calledWith('close');
    });
  });

  describe('lernCDK', function() {
    it('opens external url ' + StartController.LEARN_CDK_URL, function() {
      let electron = new ElectronMock();
      sandbox.stub(electron.shell, 'openExternal');
      let $scope = {};
      let ctrl = $controller('StartController', { $scope, electron });
      ctrl.learnCDK();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).calledWith(StartController.LEARN_CDK_URL);
    });
  });

  describe('start', function() {
    function createController(devstudioInstalled) {
      let electron = new ElectronMock();
      let installerDataSvc = new InstallerDataService();
      sandbox.stub(installerDataSvc, 'getInstallable').returns({isSkipped() { return devstudioInstalled; }});
      let ctrl = $controller('StartController', { installerDataSvc, electron });
      return ctrl;
    }
    it('calls exit from installer if DevStudio is not installed' + StartController.LEARN_CDK_URL, function() {
      let ctrl = createController(true);
      sandbox.stub(ctrl, 'exit');
      ctrl.start();
      expect(ctrl.exit).calledOnce;
    });
    it('calls exit from installer if DevStudio is not installed' + StartController.LEARN_CDK_URL, function() {
      let ctrl = createController(false);
      sandbox.stub(ctrl, 'launchDevstudio');
      ctrl.start();
      expect(ctrl.launchDevstudio).calledOnce;
    });
  });
  describe('exit', function() {
    it('calls close for current electron window', function() {
      let electron = new ElectronMock();
      sandbox.stub(electron.remote.currentWindow, 'close');
      let ctrl = $controller('StartController', { undefined, electron });
      sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
      ctrl.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });
});
