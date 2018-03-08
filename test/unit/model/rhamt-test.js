'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Platform from 'browser/services/platform';
import Installer from 'browser/model/helpers/installer';
import InstallerDataService from 'browser/services/data';
import RhamtInstall from 'browser/model/rhamt';
import Downloader from 'browser/model/helpers/downloader';
import Util from 'browser/model/helpers/util';
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
  installerDataSvc.jdkDir.returns('/install/jdk8');
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
    let unzipStub, execCommandStub, makeExecStub, execStub, addToPathStub;

    beforeEach(function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      makeExecStub = sandbox.stub(Platform, 'makeFileExecutable').resolves();
      unzipStub = sandbox.stub(Installer.prototype, 'unzip').resolves();
      execStub = sandbox.stub(Installer.prototype, 'exec').resolves();
      execCommandStub = sandbox.stub(Util, 'executeCommand').resolves('java.home = home ');
      addToPathStub = sandbox.stub(Platform, 'addToUserPath').resolves();
    });

    it('should set progress to "Installing"', function() {
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
      });
    });

    it('should unzip the downloaded file', function() {
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(unzipStub).calledOnce;
        expect(unzipStub).calledWith(rhamtInstall.downloadedFile, installerDataSvc.rhamtDir());
      });
    });

    it('should make the bin file executable', function() {
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(makeExecStub).calledOnce;
        expect(makeExecStub).calledWith(path.join(installerDataSvc.rhamtDir(), 'bin', 'rhamt-cli'));
      });
    });

    it('should set JAVA_HOME to an existing JRE', function() {
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(execStub).calledOnce;
        expect(execStub).calledWith('setx /M JAVA_HOME "home"');
      });
    });

    it('should use installed java if none other is found', function() {
      execCommandStub.resolves('');
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(execStub).calledOnce;
        expect(execStub).calledWith(`setx /M JAVA_HOME "${path.join(installerDataSvc.jdkDir(), 'jre')}"`);
      });
    });

    it('should add rhamt executable to path', function() {
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(addToPathStub).calledOnce;
        expect(addToPathStub).calledWith([path.join(installerDataSvc.rhamtDir(), 'bin', 'rhamt-cli')]);
      });
    });

    it('should reject if an error occurs', function() {
      unzipStub.rejects('Error');
      return rhamtInstall.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect.fail();
      }).catch((err) => {
        expect(err.name).equals('Error');
      });
    })
  });
});
