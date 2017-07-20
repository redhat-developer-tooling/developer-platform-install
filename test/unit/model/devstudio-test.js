'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import mockfs from 'mock-fs';
import path from 'path';
import DevstudioInstall from 'browser/model/devstudio';
import JdkInstall from 'browser/model/jdk-install';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import DevstudioAutoInstallGenerator from 'browser/model/devstudio-autoinstall';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
chai.use(sinonChai);

describe('devstudio installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let downloadUrl = 'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar';
  let fakeInstall = {
    isInstalled: function() { return false; },
    isSkipped: function() { return true; }
  };
  let success = () => {};
  let failure = () => {};

  function stubDataService() {
    let reqsJson = {
      devstudio: {},
      jdk:{
        name: 'OpenJDK'
      }
    };
    let packageJson = {version: "X.0.0-GA"};
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
    return ds;
  }

  let fakeProgress;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256').callsFake(function(file, cb) { cb('hash'); });

    mockfs({
      tempDirectory : { 'testFile': 'file content here' },
      installationFolder : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    mockfs.restore();
    infoStub.restore();
    errorStub.restore();
    sha256Stub.restore();
  });

  beforeEach(function () {
    installerDataSvc = stubDataService();
    installer = new DevstudioInstall(DevstudioInstall.KEY, installerDataSvc, 'dev-studio', downloadUrl, 'devstudio.jar', 'sha');
    installer.ipcRenderer = { on: sinon.stub().yields(undefined, JdkInstall.KEY) };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new DevstudioInstall(DevstudioInstall.KEY, installerDataSvc, null, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new DevstudioInstall(DevstudioInstall.KEY, installerDataSvc, null, null, '');
    }).to.throw('No download URL set');
  });

  it('should download devstudio installer to temporary folder with configured filename', function() {
    expect(new DevstudioInstall(DevstudioInstall.KEY, installerDataSvc, 'dev-studio', 'url', 'devstudio.jar').downloadedFile).to.equal(
      path.join('tempDirectory', 'devstudio.jar'));
  });

  describe('installer download', function() {
    let downloadStub, downloadAuthStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      downloadAuthStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/devstudio.jar', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(streamSpy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'devstudio.jar'));
    });

    it('should call a correct downloader request with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadAuthStub).to.have.been.calledOnce;
      expect(downloadAuthStub).to.have.been.calledWith(downloadUrl, 'user', 'passwd');
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {

    let fsextra = require('fs-extra');

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should not start until JDK has finished installing', function() {
        let installerDataSvc = stubDataService();
        installer.ipcRenderer = { on: function() {} };
        let installSpy = sandbox.spy(installer, 'installAfterRequirements');
        let item2 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', installerDataSvc);
        item2.thenInstall(installer);

        installer.install(fakeProgress, success, failure);

        expect(installSpy).not.called;
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Waiting for OpenJDK to finish installation');
      });
    });

    it('should install once JDK has finished', function() {
      let stub = sandbox.stub(installer, 'installAfterRequirements').returns();
      sandbox.stub(fakeInstall, 'isInstalled').returns(true);
      let item2 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should load the install config contents', function() {
      let spy = sandbox.spy(DevstudioAutoInstallGenerator.prototype, 'fileContent');

      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
    });

    it('should write the install configuration into temp/devstudio-autoinstall.xml', function() {
      sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');

      let data = new DevstudioAutoInstallGenerator(installerDataSvc.devstudioDir(), installerDataSvc.jdkDir(), installer.version).fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'devstudio-autoinstall.xml');
      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(installConfigFile, data);
    });

    it('should write the install configuration into temp/devstudio-autoinstall.xml with additionalLocations and IUs if provided', function() {
      sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');
      installer = new DevstudioInstall(DevstudioInstall.KEY, installerDataSvc, 'dev-studio', downloadUrl, 'devstudio.jar', 'sha', 'additionalLocations', 'additionalIUs');
      let data = new DevstudioAutoInstallGenerator(installerDataSvc.devstudioDir(), installerDataSvc.jdkDir(), installer.version, 'additionalLocations', 'additionalIUs').fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'devstudio-autoinstall.xml');
      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(installConfigFile, data);
      expect(data.includes('additionalLocations')).is.true;
      expect(data.includes('additionalIUs')).is.true;
    });

    it('should catch errors thrown during the installation', function(done) {
      let err = new Error('critical error');
      sandbox.stub(fsextra, 'writeFile').yields(err);

      try {
        installer.installAfterRequirements(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('It did not catch the error');
      }
    });

    it('should call success callback when installation is finished successfully', function() {
      sandbox.stub(Installer.prototype, 'writeFile').resolves();
      sandbox.stub(installer, 'headlessInstall').resolves();
      sandbox.stub(Installer.prototype, 'succeed');

      return installer.installAfterRequirements(
        fakeProgress, function() {}, function() {}
      ).then(()=>{
        expect(Installer.prototype.succeed).to.be.calledWith(true);
      });
    });

    describe('headlessInstall', function() {
      let helper;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('devstudio', fakeProgress, success, failure);
        sandbox.stub(child_process, 'execFile').yields();
        sandbox.stub(fs, 'appendFile').yields();
      });

      it('should perform headless install into the installation folder', function() {
        let spy = sandbox.spy(helper, 'execFile');
        let downloadedFile = path.join(installerDataSvc.tempDir(), 'devstudio.jar');
        let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java');
        let javaOpts = [
          '-DTRACE=true',
          '-jar',
          downloadedFile,
          path.join(installerDataSvc.tempDir(), 'devstudio-autoinstall.xml')
        ];

        return installer.headlessInstall(helper)
        .then(() => {
          expect(spy).calledOnce;
          expect(spy).calledWith(javaPath, javaOpts);
        });
      });
    });
  });
});
