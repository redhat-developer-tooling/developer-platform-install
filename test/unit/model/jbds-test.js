'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs';
import path from 'path';
import JbdsInstall from 'model/jbds';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
import JbdsAutoInstallGenerator from 'model/jbds-autoinstall';
chai.use(sinonChai);

describe('JBDS installer', function() {
  let DataStub, installerDataSvc;
  let infoStub, errorStub, sandbox;
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    jbdsDir: function() { return 'installationFolder/developer-studio'; },
    jdkDir: function() { return 'install/jdk8'; },
    getInstallable: function(key) {},
    cdkVagrantfileDir: function() {}
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.jdkDir.returns('install/jdk8');
  installerDataSvc.jbdsDir.returns('installationFolder/developer-studio');
  installerDataSvc.cdkVagrantfileDir.returns('installationFolder/cdk/vagrant');

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

    mockfs({
      tempDirectory : { 'testFile': 'file content here' },
      installationFolder : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
  });

  beforeEach(function () {
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

  describe('when downloading jbds', function() {
    let downloadUrl = 'https://devstudio.jboss.com/10.0/snapshots/builds/devstudio.product_master/latest/all/jboss-devstudio-10.0.0.latest-installer-standalone.jar';
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/jbds.jar', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fs, 'createWriteStream');
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(streamSpy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'jbds.jar'));
    });

    it('should call a correct downloader request with the specified parameters once', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl);
    });
  });

  describe('when installing', function() {
    let downloadUrl = 'https://devstudio.jboss.com/10.0/snapshots/builds/devstudio.product_master/latest/all/jboss-devstudio-10.0.0.latest-installer-standalone.jar';
    let downloadedFile = path.join(installerDataSvc.tempDir(), 'jbds.jar');
    let fsextra = require('fs-extra');

    it('should set progress to "Installing"', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.postInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should load the install config contents', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(JbdsAutoInstallGenerator.prototype, 'fileContent');

      installer.postInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
    });

    it('should write the install configuration into temp/jbds-autoinstall.xml', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');

      let data = new JbdsAutoInstallGenerator(installerDataSvc.jbdsDir(), installerDataSvc.jdkDir()).fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'jbds-autoinstall.xml');
      installer.postInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(installConfigFile, data);
    });

    it('postJDKInstall should wait for JDK install to complete', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let helper = new Installer('jbds', fakeProgress, function() {}, function (err) {});
      let spy = sandbox.spy(installer, 'headlessInstall');

      installer.postJDKInstall(helper);
      expect(spy).not.called;
    });

    it('postJDKInstall should call headlessInstall if vagrant is installed', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let helper = new Installer('jbds', fakeProgress, function() {}, function (err) {});
      let spy = sandbox.spy(installer, 'headlessInstall');

      let fakeInstall = {
        isInstalled: function() { return true; }
      };
      installerDataSvc.getInstallable.returns(fakeInstall);

      installer.postJDKInstall(helper);
      expect(spy).calledOnce;
    });

    it('headlessInstall should perform JBDS headless install into the installation folder', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let helper = new Installer('jbds', fakeProgress, function() {}, function (err) {});

      let stub = sandbox.stub(require('child_process'), 'execFile').yields();
      let fsStub = sandbox.stub(fs, 'appendFile').yields();
      let spy = sandbox.spy(helper, 'execFile');

      let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java.exe');
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

    it('headlessInstall should trigger CDK setup when done', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let helper = new Installer('jbds', fakeProgress, function() {}, function (err) {});

      let stub = sandbox.stub(require('child_process'), 'execFile').yields();
      let fsStub = sandbox.stub(fs, 'appendFile').yields();
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

    it('setupCdk should append CDK info to runtime locations', function() {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let helper = new Installer('jbds', fakeProgress, function() {}, function (err) {});
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

    it('should catch errors thrown during the installation', function(done) {
      let installer = new JbdsInstall(installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(fsextra, 'writeFile');
      let err = new Error('critical error');
      stub.throws(err);

      try {
        installer.install(fakeProgress, null, null);
        done();
      } catch (error) {
        expect.fail('It did not catch the error');
      }
    });
  });
});
