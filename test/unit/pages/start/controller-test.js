'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import ElectronMock from '../../../mock/electron';
import StartController from 'browser/pages/start/controller';
import InstallerDataService from 'browser/services/data';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Util from 'browser/model/helpers/util';
import child_process from 'child_process';
import fs from 'fs-extra';
import path from 'path';
require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('StartController', function() {
  let $controller, sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });
  afterEach(function() {
    sandbox.restore();
  });
  describe('constructor', function() {
    beforeEach(ngModule('devPlatInstaller'));
    beforeEach(inject(function(_$controller_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));
    it('removes all window close event listeners', function() {
      let installerDataSvc = new InstallerDataService();
      let electron = new ElectronMock();
      sandbox.stub(electron.remote.currentWindow, 'removeAllListeners');
      $controller('StartController', { installerDataSvc, electron });
      expect(electron.remote.currentWindow.removeAllListeners).calledOnce;
      expect(electron.remote.currentWindow.removeAllListeners).calledWith('close');
    });
  });

  describe('learnCDK', function() {
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
      installerDataSvc.devstudioRoot = 'developer-studio';
      installerDataSvc.password = '12345678';
      sandbox.stub(installerDataSvc, 'devstudioDir').returns('developer-studio');
      sandbox.stub(installerDataSvc, 'getInstallable').returns({
        isSkipped() { return devstudioInstalled; },
        selected: true
      });
      sandbox.stub(Logger, 'getIpcRenderer').returns({send: function() {}});
      sandbox.stub(Logger, 'error');
      let ctrl = $controller('StartController', { installerDataSvc, electron });
      return ctrl;
    }
    it('calls exit from installer if DevStudio is not installed', function() {
      let ctrl = createController(true);
      sandbox.stub(ctrl, 'exit');
      ctrl.start();
      expect(ctrl.exit).calledOnce;
    });
    it('calls DevStudio launch method and exits from installer if DevStudio is installed', function() {
      let ctrl = createController(false);
      sandbox.stub(ctrl, 'launchDevstudio');
      ctrl.start();
      expect(ctrl.launchDevstudio).calledOnce;
    });
    describe('on windows', function() {
      it('calls specific launch method', function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let stubLaunchWin32 = sandbox.stub(StartController.prototype, 'launchDevstudio_win32');
        let ctrl = createController(false);
        sandbox.stub(ctrl, 'exit');
        ctrl.start();
        expect(stubLaunchWin32).calledOnce;
      });
      it('should spawn new process and exit', function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        sandbox.stub(fs, 'writeFileSync');
        let messageEmmitterFactory = function(message) {
          return {
            on: sinon.stub().yields(message)
          };
        };
        let bat = messageEmmitterFactory('errorCode');
        bat.stdout = messageEmmitterFactory('stdout message');
        bat.stderr = messageEmmitterFactory('stderr message');
        sandbox.stub(child_process, 'spawn').returns(bat);
        let ctrl = createController(false);
        sandbox.stub(ctrl, 'exit');

        ctrl.start();

        expect(child_process.spawn).to.be.calledOnce;
        expect(child_process.spawn).to.be.calledWith('cmd.exe');
        expect(fs.writeFileSync).to.be.calledTwice;
        expect(ctrl.exit).to.be.calledOnce;
      });
    });
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });
      it('calls specific launch method', function() {
        let stubLaunchDarwin = sandbox.stub(StartController.prototype, 'launchDevstudio_darwin');
        let ctrl = createController(false);
        sandbox.stub(ctrl, 'exit');
        ctrl.start();
        expect(stubLaunchDarwin).calledOnce;
      });
      it('starts devstudio with rhel.subscription.password environment variable', function() {
        sandbox.stub(Util, 'executeCommand').resolves();
        let ctrl = createController(false);
        sandbox.stub(ctrl, 'exit').returns();
        return ctrl.launchDevstudio().then(()=>{
          expect(Util.executeCommand).calledWith(`open ${path.join('developer-studio', 'Devstudio.app')}`);
          expect(Util.executeCommand.args[0][2]['env']['rhel.subscription.password']).to.be.equal('12345678');
          expect(ctrl.exit).calledOnce;
        });
      });
      it('should log error and exits if devstudio start failed', function() {
        sandbox.stub(Util, 'executeCommand').rejects('reason');
        let ctrl = createController(false);
        sandbox.stub(ctrl, 'exit').returns();
        return ctrl.launchDevstudio().then(()=>{
          expect.fail();
        }).catch(()=> {
          expect(Util.executeCommand).calledWith(`open ${path.join('developer-studio', 'Devstudio.app')}`);
          expect(ctrl.exit).calledOnce;
          expect(Logger.error).calledWithMatch('reason');
        });
      });
    });
    describe('on linux', function() {
      it('calls launchDevstudio_linux', function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
        sandbox.spy(StartController.prototype, 'launchDevstudio_linux');
        let ctrl = createController(false);
        ctrl.start();
        expect(ctrl.launchDevstudio_linux).has.been.calledOnce;
      });
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
