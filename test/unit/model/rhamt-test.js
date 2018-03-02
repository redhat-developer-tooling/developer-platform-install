'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
import Installer from 'browser/model/helpers/installer';
import InstallerDataService from 'browser/services/data';
import RhamtInstall from 'browser/model/rhamt';
import Downloader from 'browser/model/helpers/downloader';
import fs from 'fs';
import path from 'path';
import mkdirp from 'mkdirp';
import EventEmitter from 'events';

chai.use(sinonChai);

describe('rhamt installer', function() {
  let installerDataSvc, sandbox, installer;
  let success, failure, fakeProgress, rhamtInstall;
  let downloadUrl = 'https://developers.redhat.com/download-manager/jdf/file/4.0.0/migrationtoolkit-rhamt-cli-4.0.0.offline.zip?workflow=direct';
  let fakeInstallable;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.returns(downloadUrl);
  installerDataSvc.rhamtDir.returns('/install/rhmat');
  installerDataSvc.localAppData.restore();

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeProgress = {
      setStatus: sandbox.stub(),
      setComplete: sandbox.stub()
    };
    success = sandbox.stub();
    failure = sandbox.stub();
    rhamtInstall = new RhamtInstall(installerDataSvc, 'rhmat', downloadUrl, 'migrationtoolkit-rhamt-cli-4.0.0.offline.zip', 'sha256');
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new RhamtInstall(installerDataSvc, null, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new RhamtInstall(installerDataSvc, null, null, '');
    }).to.throw('No download URL set');
  });

  it('should download rhmat installer to cache', function() {
    expect(new RhamtInstall(installerDataSvc, 'rhmat', 'url', 'migrationtoolkit-rhamt-cli-4.0.0.offline.zip', 'sha').downloadedFile).to.equal(
      path.join(installerDataSvc.localAppData(), 'cache', 'migrationtoolkit-rhamt-cli-4.0.0.offline.zip'));
  });

  describe('installAfterRequirements', function() {

    beforeEach(function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      sandbox.stub(Platform, 'makeFileExecutable').resolves();
    });

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'unzip').resolves(true);
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
      });
    });
  });
});
