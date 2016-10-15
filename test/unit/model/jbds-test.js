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
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import JbdsAutoInstallGenerator from 'browser/model/jbds-autoinstall';
import InstallerDataService from 'browser/services/data';
chai.use(sinonChai);

describe('devstudio installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let downloadUrl = 'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar';
  let fakeInstall = {
    isInstalled: function() { return false; }
  };
  let success = () => {},
      failure = (err) => {};

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.jdkDir.returns('install/jdk8');
  installerDataSvc.jbdsDir.returns('installationFolder/developer-studio');
  installerDataSvc.cdkVagrantfileDir.returns('installationFolder/cdk/vagrant');
  installerDataSvc.getInstallable.returns(fakeInstall);
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('passwd');

  let fakeProgress = {
    setStatus: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {},
    setComplete: function() {},
    setTotalDownloadSize: function(size) {},
    downloaded: function(amt, time) {}
  };

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype,'SHA256', function(file,cb) {cb("hash");});

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
    installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download jbds when an installation exists', function() {
    let jbds = new JbdsInstall(installerDataSvc, 'url', 'file');
    expect(jbds.useDownload).to.be.false;
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

  it('should download jbds when no installation is found', function() {
    expect(new JbdsInstall(installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download jbds installer to temporary folder as jbds.jar', function() {
    expect(new JbdsInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join('tempDirectory', 'jbds.jar'));
  });

  describe('installer download', function() {
    let downloadStub,downloadAuthStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      downloadAuthStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
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
      expect(downloadAuthStub).to.have.been.calledWith(downloadUrl,"user","passwd");
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {
    let downloadUrl = 'https://devstudio.redhat.com/9.0/snapshots/builds/devstudio.product_9.0.mars/latest/all/jboss-devstudio-9.1.0.latest-installer-standalone.jar';
    let downloadedFile = path.join(installerDataSvc.tempDir(), 'jbds.jar');
    let fsextra = require('fs-extra');

    it('should not start until JDK has finished installing', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      let installSpy = sandbox.spy(installer, 'postInstall');
      let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.thenInstall(installer);

      installer.install(fakeProgress, success, failure);

      expect(installSpy).not.called;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Waiting for OpenJDK to finish installation');
    });

    it('should install once JDK has finished', function() {
      let stub = sandbox.stub(installer, 'postInstall').returns();
      sandbox.stub(fakeInstall, 'isInstalled').returns(true);
      let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.postInstall(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should load the install config contents', function() {
      let spy = sandbox.spy(JbdsAutoInstallGenerator.prototype, 'fileContent');

      installer.postInstall(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
    });

    it('should write the install configuration into temp/jbds-autoinstall.xml', function() {
      let stub = sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');

      let data = new JbdsAutoInstallGenerator(installerDataSvc.jbdsDir(), installerDataSvc.jdkDir(), installer.version).fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
      installer.postInstall(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(installConfigFile, data);
    });

    it('should catch errors thrown during the installation', function(done) {
      let err = new Error('critical error');
      let stub = sandbox.stub(fsextra, 'writeFile').yields(err);

      try {
        installer.postInstall(fakeProgress, success, failure);
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
          return cb({}, JdkInstall.key());
        };
        stubInstall = sandbox.stub(installer, 'headlessInstall').resolves(true);
        eventSpy = sandbox.spy(installer.ipcRenderer, 'on');
      });

      it('should wait for JDK install to complete', function() {
        return installer.postJDKInstall(helper, true)
        .then((result) => {
          expect(eventSpy).calledOnce;
        });
      });

      it('should call headlessInstall if JDK is installed', function() {
        sandbox.stub(fakeInstall, 'isInstalled').returns(true);

        return installer.postJDKInstall(helper)
        .then((result) => {
          expect(eventSpy).not.called;
          expect(stubInstall).calledOnce;
        });
      });
    });

    describe('headlessInstall', function() {
      let helper, stub, fsStub;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('jbds', fakeProgress, success, failure);
        stub = sandbox.stub(child_process, 'execFile').yields();
        fsStub = sandbox.stub(fs, 'appendFile').yields();
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
        .then((result) => {
          expect(spy).calledOnce;
          expect(spy).calledWith(javaPath, javaOpts);
        });
      });

      it('should trigger CDK setup when done', function() {
        let spy = sandbox.spy(installer, 'setupCdk');

        let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java.exe');
        let javaOpts = [
          '-jar',
          downloadedFile,
          path.join(installerDataSvc.tempDir(), 'jbds-autoinstall.xml')
        ];

        return installer.headlessInstall(helper)
        .then((result) => {
          expect(spy).calledOnce;
          expect(spy).calledWith(result);
        });
      });
    });

    describe('setupCdk', function() {
      let helper;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('jbds', fakeProgress, success, failure);
      });

      it('should append CDK info to runtime locations', function() {
        let fsStub = sandbox.stub(fs, 'appendFile').yields();

        let runtimePath = path.join(installerDataSvc.jbdsDir(), 'studio', 'runtime_locations.properties');
        let escapedPath = installerDataSvc.cdkVagrantfileDir().replace(/\\/g, "\\\\").replace(/:/g, "\\:");
        let data = 'CDKServer=' + escapedPath + ',true\r\n';

        return installer.setupCdk(helper)
        .then((result) => {
          expect(result).to.be.true;
          expect(fsStub).calledOnce;
          expect(fsStub).calledWith(runtimePath, data);
        });
      });

      it('should resolve as true if no error occurs', function() {
        let fsStub = sandbox.stub(fs, 'appendFile').yields();

        return installer.setupCdk(helper)
        .then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should reject if an error occurs', function() {
        let fsStub = sandbox.stub(fs, 'appendFile').yields('error');

        return installer.setupCdk(helper)
        .then((result) => {
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
