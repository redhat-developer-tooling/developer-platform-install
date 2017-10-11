'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import path from 'path';
import Logger from 'browser/services/logger';
import Installer from 'browser/model/helpers/installer';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import Platform from 'browser/services/platform';
import CheInstall from 'browser/model/che';
chai.use(sinonChai);
let sinon  = require('sinon');

describe('CDK installer', function() {
  let sandbox, installerDataSvc;
  let infoStub, errorStub;

  let fakeProgress;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.localAppData.restore();
  installerDataSvc.tempDir.returns('temporaryFolder');
  installerDataSvc.installDir.returns('installFolder');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('password');
  installerDataSvc.cdkDir.returns(path.join(installerDataSvc.installDir(), 'cdk'));
  installerDataSvc.ocDir.returns(path.join(installerDataSvc.cdkDir(), 'bin'));
  installerDataSvc.virtualBoxDir.returns(path.join(installerDataSvc.installDir(), 'virtualbox'));
  installerDataSvc.cdkBoxDir.returns(installerDataSvc.cdkDir());
  installerDataSvc.cdkMarker.returns(path.join(installerDataSvc.cdkDir(), '.cdk'));
  installerDataSvc.getInstallable.returns({
    getLocation: function() {
      return 'minishiftPath';
    },
    createEnvironment: function() {
      let env = {};
      env[Platform.PATH] = 'path';
      return env;
    }
  });

  let installer;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('installAfterRequirements', function() {

    beforeEach(function() {
      installer = new CheInstall(installerDataSvc, 'url');
      sandbox.stub(Installer.prototype, 'exec').resolves();
    });


    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, function() {}, function() {});
      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Installing');
    });
  });
});
