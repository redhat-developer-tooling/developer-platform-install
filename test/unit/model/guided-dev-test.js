'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
import Installer from 'browser/model/helpers/installer';
import InstallerDataService from 'browser/services/data';
import RhamtInstall from 'browser/model/rhamt';
import Downloader from 'browser/model/helpers/downloader';
import EclipseGuidedDevInstall from 'browser/model/guided-dev';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import EventEmitter from 'events';

chai.use(sinonChai);

describe('guided development installer', function() {
  let installerDataSvc, sandbox, installer;
  let success, failure, fakeProgress, guidedDevInstall;
  let fakeInstallable;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.rhamtDir.returns('/install/rhmat');
  installerDataSvc.jdkDir.returns('/install/jdk8');
  installerDataSvc.localAppData.restore();

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(Platform, 'addToUserPath').resolves();
    fakeProgress = {
      setStatus: sandbox.stub(),
      setComplete: sandbox.stub()
    };
    success = sandbox.stub();
    failure = sandbox.stub();
    guidedDevInstall = new RhamtInstall(installerDataSvc, 'rhmat', downloadUrl, 'migrationtoolkit-rhamt-cli-4.0.0.offline.zip', 'sha256');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('installAfterRequirements', function() {

    beforeEach(function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      sandbox.stub(Platform, 'makeFileExecutable').resolves();
    });

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'unzip').resolves();
      sandbox.stub(Installer.prototype, 'exec').resolves();
      return guidedDevInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
      });
    });
  });
});
