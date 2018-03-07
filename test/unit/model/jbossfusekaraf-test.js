'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import FusePlatformInstallKaraf from 'browser/model/jbossfusekaraf';
import fse from 'fs-extra';
import path from 'path';
import Logger from 'browser/services/logger';
import installer from 'browser/model/helpers/installer';

import EventEmitter from 'events';
import { unzip } from 'zlib';

chai.use(sinonChai);

describe('jbossplaformkaraf installer', function() {
  let sandbox;
  let fuseInstaller;
  let fakeProgress;
  let success;
  let failure;
  let unzipStub;
  let svc;

  beforeEach(function() {
    svc = new InstallerDataService();
    sandbox = sinon.sandbox.create();
    fuseInstaller = new FusePlatformInstallKaraf(svc, 'karaf', 'url', 'karaf.zip', 'sha256');
    fuseInstaller.ipcRenderer = new EventEmitter();
    fuseInstaller.downloadedFile = 'karaf.zip';
    fakeProgress = {
      setStatus: sandbox.stub(),
      setComplete: sandbox.stub()
    };
    success = sandbox.stub();
    failure = sandbox.stub();
    unzipStub = sandbox.stub(installer.prototype, 'unzip');
    sandbox.stub(svc, 'fuseplatformkarafDir').returns('fusekaraf');
  });

  function createInstallerMock(installed) {
    sandbox.stub(svc, 'getInstallable').returns({
      installed: installed,
      configureRuntimeDetection: sandbox.stub()
    });
  }

  afterEach(function() {
    sandbox.restore();
  });

  describe('installAfterRequirements', function() {
    it('should unzip the downloaded file', function() {
      unzipStub.resolves();
      sandbox.stub(fse, 'existsSync').returns(false);
      return fuseInstaller.installAfterRequirements(fakeProgress, success, failure).then(() => {
        expect(unzipStub).calledWith('karaf.zip', svc.fuseplatformkarafDir());
      });
    });

    it('should return rejected promice if exception was caught during unpacking', function() {
      unzipStub.rejects('Error');
      return fuseInstaller.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        expect.fail();
      }).catch((error)=> {
        expect(error.name).equals('Error');
      });
    });

    it('should configure runtime detection after devstudio installation finished', function() {
      unzipStub.resolves();
      sandbox.stub(fse, 'existsSync').returns(false);
      createInstallerMock(false);

      return fuseInstaller.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        let devstudioInstaller = fuseInstaller.installerDataSvc.getInstallable('devstudio');
        expect(devstudioInstaller.configureRuntimeDetection).not.called;
        fuseInstaller.ipcRenderer.emit('installComplete', 'installComplete', 'devstudio');
        expect(devstudioInstaller.configureRuntimeDetection).not.called;
        devstudioInstaller.installed = true;
        fuseInstaller.ipcRenderer.emit('installComplete', 'installComplete', 'all');
        expect(devstudioInstaller.configureRuntimeDetection).calledOnce;
      });
    });

    it('should add admin user to users.properties file', function() {
      unzipStub.resolves();
      sandbox.stub(fse, 'existsSync').returns(true);
      sandbox.stub(fse, 'appendFile').resolves();

      return fuseInstaller.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        expect(fse.appendFile).calledOnce;
      });
    });

    it('should log error if adding admin user to file failed', function() {
      unzipStub.resolves();
      sandbox.stub(fse, 'existsSync').returns(true);
      sandbox.stub(fse, 'appendFile').rejects();
      sandbox.stub(Logger, 'error');;
      
      return fuseInstaller.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        expect(Logger.error.calledTwice);
      });
    });
  });
});
