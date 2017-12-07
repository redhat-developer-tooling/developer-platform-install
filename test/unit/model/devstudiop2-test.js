'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import mockfs from 'mock-fs';
import path from 'path';
import Devstudiop2Install from 'browser/model/devstudio-p2';
import JdkInstall from 'browser/model/jdk-install';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import util from 'browser/model/helpers/util'
chai.use(sinonChai);

describe('devstudiop2 central installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let fakeInstall = {
    isInstalled: function() { return false; },
    isSkipped: function() { return true; }
  };
  let success = () => {};
  let failure = () => {};

  function stubDataService() {
    let reqsJson = {
      devstuido_bpm: {},
      jdk:{
        name: 'OpenJDK'
      }
    };
    let packageJson = {version: 'X.0.0-GA'};
    let ds = sinon.stub(new InstallerDataService({}, reqsJson, packageJson));
    ds.getRequirementByName.restore();
    ds.tempDir.returns('tempDirectory');
    ds.installDir.returns('installationFolder');
    ds.jdkDir.returns('install/jdk8');
    ds.devstudioDir.returns('installationFolder/developer-studio');
    ds.cdkDir.returns('installationFolder/cdk');
    ds.getInstallable.returns(fakeInstall);
    ds.getUsername.returns('user');
    ds.getPassword.returns('passwd');
    ds.localAppData.restore();
    return ds;
  }

  let fakeProgress;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
  });

  beforeEach(function () {
    installerDataSvc = stubDataService();
    installer = new Devstudiop2Install('devstuido_bpm', installerDataSvc, 'url', ['iu1', 'iu2']);
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('installation', function() {

    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, success, failure);
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should call success callback when installation is finished successfully', function() {
      sandbox.stub(Installer.prototype, 'succeed');
      sandbox.stub(util, 'executeCommand').resolves();

      return installer.installAfterRequirements(
        fakeProgress, function() {}, function() {}
      ).then(()=>{
        expect(util.executeCommand).to.be.calledOnce;
      });
    });

  });
});
