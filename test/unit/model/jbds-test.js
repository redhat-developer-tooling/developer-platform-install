'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import JbdsInstall from 'browser/model/jbds';
import JdkInstall from 'browser/model/jdk-install';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import JbdsAutoInstallGenerator from 'browser/model/jbds-autoinstall';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import 'sinon-as-promised';
chai.use(sinonChai);

describe('devstudio installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let downloadUrl = 'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar';
  let fakeInstall = {
    isInstalled: function() { return false; }
  };
  let success = () => {};
  let failure = () => {};

  function stubDataService() {
    let ds = sinon.stub(new InstallerDataService());
    ds.getRequirementByName.restore();
    ds.tempDir.returns('tempDirectory');
    ds.installDir.returns('installationFolder');
    ds.jdkDir.returns('install/jdk8');
    ds.jbdsDir.returns('installationFolder/developer-studio');
    ds.cdkDir.returns('installationFolder/cdk');
    ds.getInstallable.returns(fakeInstall);
    ds.getUsername.returns('user');
    ds.getPassword.returns('passwd');
    return ds;
  }

  installerDataSvc = stubDataService();

  let fakeProgress;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256', function(file, cb) { cb('hash'); });

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
    installer = new JbdsInstall(installerDataSvc, downloadUrl, 'jbds.jar', 'dev-studio', 'sha' );
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new JbdsInstall(installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new JbdsInstall(installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download jbds installer to temporary folder with configured filename', function() {
    expect(new JbdsInstall(installerDataSvc, 'url', 'jbds.jar').downloadedFile).to.equal(
      path.join('tempDirectory', 'jbds.jar'));
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

    it('should write the data into temp/jbds.jar', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(streamSpy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'jbds.jar'));
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
    let downloadedFile = path.join(installerDataSvc.tempDir(), 'jbds.jar');
    let fsextra = require('fs-extra');

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should not start until JDK has finished installing', function() {
        let installerDataSvc = stubDataService();
        installer.ipcRenderer = { on: function() {} };
        let installSpy = sandbox.spy(installer, 'installAfterRequirements');
        let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
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
      let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
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
      let spy = sandbox.spy(JbdsAutoInstallGenerator.prototype, 'fileContent');

      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
    });

    it('should write the install configuration into temp/jbds-autoinstall.xml', function() {
      sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');

      let data = new JbdsAutoInstallGenerator(installerDataSvc.jbdsDir(), installerDataSvc.jdkDir(), installer.version).fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(installConfigFile, data);
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

    describe('postJDKInstall', function() {
      let helper, stubInstall, eventSpy;

      beforeEach(function() {
        helper = new Installer('jbds', fakeProgress, success, failure);
        installer.ipcRenderer.on = function(message, cb) {
          return cb({}, JdkInstall.KEY);
        };
        stubInstall = sandbox.stub(installer, 'headlessInstall').resolves(true);
        eventSpy = sandbox.spy(installer.ipcRenderer, 'on');
      });

      it('should wait for JDK install to complete', function() {
        return installer.postJDKInstall(helper, true)
        .then(() => {
          expect(eventSpy).calledOnce;
        });
      });

      it('should call headlessInstall if JDK is installed', function() {
        sandbox.stub(fakeInstall, 'isInstalled').returns(true);

        return installer.postJDKInstall(helper)
        .then(() => {
          expect(eventSpy).not.called;
          expect(stubInstall).calledOnce;
        });
      });
    });

    describe('headlessInstall', function() {
      let helper;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('jbds', fakeProgress, success, failure);
        sandbox.stub(child_process, 'execFile').yields();
        sandbox.stub(fs, 'appendFile').yields();
      });

      it('should perform headless install into the installation folder', function() {
        let spy = sandbox.spy(helper, 'execFile');

        let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java');
        let javaOpts = [
          '-DTRACE=true',
          '-jar',
          downloadedFile,
          path.join(installerDataSvc.tempDir(), 'jbds-autoinstall.xml')
        ];

        return installer.headlessInstall(helper)
        .then(() => {
          expect(spy).calledOnce;
          expect(spy).calledWith(javaPath, javaOpts);
        });
      });

      it('should trigger CDK setup when done', function() {
        sandbox.spy(installer, 'setupCdk');

        return installer.headlessInstall(helper)
        .then(() => {
          expect(installer.setupCdk).calledOnce;
        });
      });
    });

    describe('setupCdk', function() {
      let helper;

      beforeEach(function() {
        helper = new Installer('jbds', fakeProgress, success, failure);
      });

      it('should append CDK info to runtime locations', function() {
        let fsStub = sandbox.stub(fs, 'appendFile').yields();

        let runtimePath = path.join(installerDataSvc.jbdsDir(), 'studio', 'runtime_locations.properties');
        let escapedPath = installerDataSvc.cdkDir().replace(/\\/g, '\\\\').replace(/:/g, '\\:');
        let data = 'CDKServer=' + escapedPath + ',true\r\n';

        return installer.setupCdk(helper)
        .then((result) => {
          expect(result).to.be.true;
          expect(fsStub).calledOnce;
          expect(fsStub).calledWith(runtimePath, data);
        });
      });

      it('should resolve as true if no error occurs', function() {
        sandbox.stub(fs, 'appendFile').yields();

        return installer.setupCdk(helper)
        .then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should reject if an error occurs', function() {
        sandbox.stub(fs, 'appendFile').yields('error');

        return installer.setupCdk(helper)
        .then(() => {
          expect.fail('it did not reject');
        })
        .catch((err) => {
          expect(err).to.equal('error');
        });
      });
    });

    describe('setup', function() {
      it('should not do anything on a fresh installation', function() {
        sandbox.stub(installer, 'hasExistingInstall').returns(false);
        let spy = sandbox.spy(installer, 'setupCdk');
        let calls = 0;
        let succ = function() { calls++; };

        installer.setup(fakeProgress, succ, failure);

        expect(spy).not.called;
        expect(calls).to.equal(1);
      });
    });
  });
});
