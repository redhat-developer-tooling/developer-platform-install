'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import path from 'path';
import rimraf from 'rimraf';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Downloader from 'browser/model/helpers/downloader';
import Util from 'browser/model/helpers/util';
import JdkInstall from 'browser/model/jdk-install';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import mockfs from 'mock-fs';
chai.use(sinonChai);

describe('JDK installer', function() {
  let installerDataSvc, sandbox, installer;
  let infoStub, errorStub, sha256Stub;
  let downloadUrl = 'http://www.azulsystems.com/products/zulu/downloads';

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.jdkDir.returns('install/jdk8');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('passwd');

  let fakeProgress;

  let success = () => {};
  let failure = () => {};

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256', function(file, cb) { cb('hash'); });

    mockfs({
      'tempDirectory' : {
        'jdk.msi': 'file content here',
        'test' : 'empty'
      },
      'installationFolder' : {
        'zulu': {}
      }
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
    sandbox = sinon.sandbox.create();
    installer = new JdkInstall(installerDataSvc, downloadUrl, 'jdk.msi', 'jdk8', 'sha');
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  function mockDetectedJvm(version, location = 'java.home = /java/home\n') {
    sandbox.stub(JdkInstall.prototype, 'findMsiInstalledJava').returns(Promise.resolve(''));
    sandbox.stub(Util, 'executeCommand')
      .onFirstCall().returns(Promise.resolve(`version "${version}"`))
      .onSecondCall().returns(Promise.resolve(location));
    sandbox.stub(Util, 'writeFile').returns(Promise.resolve(true));
    sandbox.stub(Util, 'executeFile').returns(Promise.resolve(true));
  }

  describe('when instantiated', function() {

    it('should fail when no url is set and installed file not defined', function() {
      expect(function() {
        new JdkInstall(installerDataSvc, null, null);
      }).to.throw('No download URL set');
    });

    it('should fail when no url is set and installed file is empty', function() {
      expect(function() {
        new JdkInstall(installerDataSvc, null, '');
      }).to.throw('No download URL set');
    });

    it('should download jdk installer to temporary folder with confiugured file name', function() {
      expect(new JdkInstall(installerDataSvc, 'url', 'jdk.msi', 'jdk8', 'sha').downloadedFile).to.equal(
        path.join('tempDirectory', 'jdk.msi'));
    });
  });

  // FIXME expect calls in done callback does not report errors
  // because if expect fails it gets cought in catch() and then
  // function callback done called again
  describe('when detecting existing installation', function() {

    it('should detect java location if installed', function(done) {
      let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
      mockDetectedJvm('1.8.0_111');
      return jdk.detectExistingInstall(function() {
        expect(jdk.selectedOption).to.be.equal('detected');
        expect(jdk.hasOption('detected')).to.be.equal(true);
        expect(jdk.getLocation()).to.be.equal('/java/home');
        done();
      });
    });

    it('should create deafult empty callback if not provided', function() {
      let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
      mockDetectedJvm('1.8.0_1');
      try {
        jdk.detectExistingInstall();
      } catch (exception)  {
        expect.fail('Did not created default empty callback');
      }
    });

    it('should not fail if selected option is not present in available options', function() {
      let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
      jdk.selectedOption = 'detected';
      jdk.validateVersion();
    });

    describe('on windows', function() {
      it('should select openjdk for installation if no java detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('install');
          expect(jdk.getLocation()).to.be.equal('');
          done();
        });
      });


      // FIXME is not the case for JDK 9, because version has different format
      it('should select openjdk for installation if newer than supported java version detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('detected');
          done();
        });
      });

      it('should select openjdk for installation if older than supported java version detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('1.7.0_1');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('install');
          done();
        });
      });

      it('should select openjdk for installation if location for java is not found', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('1.8.0_1', '');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('install');
          done();
        });
      });

      it('should check for available msi installtion', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        mockDetectedJvm('1.8.0_1');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        jdk.findMsiInstalledJava.restore();
        return jdk.detectExistingInstall(function() {
          expect(Util.writeFile).to.have.been.calledWith(
            jdk.getMsiSearchScriptLocation(), jdk.getMsiSearchScriptData());
          expect(Util.executeFile).to.have.been.calledWith(
            'powershell', jdk.getMsiSearchScriptPowershellArgs(jdk.getMsiSearchScriptLocation()));
          done();
        });
      });
    });

    describe('on macos', function() {
      it('should not select jdk for installation if no java detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('detected');
          done();
        });
      });

      it('should not select openjdk for installation if newer than supported supported version detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('detected');
          done();
        });
      });

      it('should not select openjdk for installation if older than supported supported java version detected', function(done) {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        mockDetectedJvm('1.7.0_1');
        return jdk.detectExistingInstall(function() {
          expect(jdk.selectedOption).to.be.equal('detected');
          done();
        });
      });

      it('should not check for available msi installtion', function(done) {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        mockDetectedJvm('1.8.0_1');
        let jdk = new JdkInstall(installerDataSvc, 'url', 'jdk8.msi', 'jdk8', 'sha');
        jdk.findMsiInstalledJava.restore();
        return jdk.detectExistingInstall(function() {
          expect(Util.executeFile).to.have.not.been.called;
          expect(Util.writeFile).to.have.not.been.called;
          done();
        });
      });
    });
  });

  describe('when downloading the jdk msi', function() {
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      sandbox.stub(fs, 'existsSync').returns(false);
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/jdk.msi', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'jdk.msi'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl);
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('when installing jdk', function() {

    it('should set progress to "Installing"', function() {
      installer.install(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should remove an existing folder with the same name', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      let stub = sandbox.stub(rimraf, 'sync').returns();

      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should call the installer with appropriate parameters', function() {
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.install(fakeProgress, success, failure);

      expect(spy).to.have.been.called;
      expect(spy).calledWith('msiexec', installer.createMsiExecParameters());
    });

    it('should catch errors during the installation', function(done) {
      sandbox.stub(require('child_process'), 'execFile').yields(new Error('critical error'));

      try {
        installer.install(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it('should call success callback if install was sucessful but redirected to different location', function(done) {
      sandbox.stub(require('child_process'), 'execFile').yields(new Error('critical error'));
      sandbox.stub(Installer.prototype, 'execFile').returns(Promise.resolve(true));
      sandbox.stub(Util, 'findText').returns(Promise.resolve('Dir (target): Key: INSTALLDIR	, Object: target/install'));
      installer = new JdkInstall(installerDataSvc, downloadUrl, 'jdk8.msi', 'jdk8', 'sha');
      return installer.install(fakeProgress, function() {
        done();
      }, function() {
        expect.fail('it should not fail');
      });
    });

    it('should call success callback if install was sucessful but search for actual location failed', function(done) {
      sandbox.stub(require('child_process'), 'execFile').yields(new Error('critical error'));
      sandbox.stub(Installer.prototype, 'execFile').returns(Promise.resolve(true));
      sandbox.stub(Util, 'findText').returns(Promise.reject('failure'));
      installer = new JdkInstall(installerDataSvc, downloadUrl, 'jdk8.msi', 'jdk8', 'sha');
      return installer.install(fakeProgress, function() {
        done();
      }, function() {
        expect.fail('it should not fail');
      });
    });

    it('should skip the installation if it is not selected', function() {
      installer.selectedOption = 'do nothing';
      let calls = 0;
      let succ = function() { return calls++; };

      installer.install(fakeProgress, succ, failure);

      expect(fakeProgress.setStatus).not.called;
      expect(calls).to.equal(1);
    });

    it('setup should call success callback', function() {
      let calls = 0;
      let succ = function() { return calls++; };

      installer.setup(fakeProgress, succ, failure);

      expect(calls).to.equal(1);
    });

    it('should not change installerDataSvc.jdkRoot if the same location found in install log', function(done) {
      sandbox.stub(require('child_process'), 'execFile').yields();
      sandbox.stub(Installer.prototype, 'execFile').returns(Promise.resolve(true));
      sandbox.stub(Util, 'findText').returns(Promise.resolve('Dir \(target\): Key: INSTALLDIR	, Object: target/install'));
      installer = new JdkInstall(installerDataSvc, downloadUrl, 'jdk8.msi', 'jdk8', 'sha');
      sandbox.stub(installer, 'getLocation').returns('target/install');
      installerDataSvc.jdkRoot = 'install/jdk8';
      return installer.install(fakeProgress, function() {
        expect(installerDataSvc.jdkRoot).to.be.equal('install/jdk8');
        done();
      }, function() {
        expect.fail('it should not fail');
      });
    });

    describe('files manipulation', function() {
      let err = new Error('critical error');

      it('getFolderContents should list files in a folder', function() {
        let spy = sandbox.spy(fs, 'readdir');

        return installer.getFolderContents('tempDirectory')
        .then((files) => {
          expect(spy).calledOnce;
          expect(spy).calledWith('tempDirectory');
          expect(files).to.contain('jdk.msi');
        });
      });

      it('getFolderContents should reject on error', function() {
        sandbox.stub(fs, 'readdir').yields(err);

        return installer.getFolderContents('tempDirectory')
        .then(() => {
          expect.fail('it did not reject');
        })
        .catch((error) => {
          expect(error).to.equal(err);
        });
      });

      it('getFileByName should return a filename from an array', function() {
        let files = ['abc', 'def', 'ghi'];

        return installer.getFileByName('de', files)
        .then((filename) => {
          expect(filename).to.equal('def');
        });
      });

      it('renameFile should rename a file with given path', function() {
        let spy = sandbox.spy(fs, 'rename');

        return installer.renameFile('tempDirectory', 'test', 'newName')
        .then((result) => {
          expect(result).to.be.true;
          expect(spy).calledOnce;
          expect(spy).calledWith(path.join('tempDirectory', 'test'), 'newName');
        });
      });

      it('renameFile should reject on error', function() {
        sandbox.stub(fs, 'rename').yields(err);

        return installer.renameFile('tempDirectory', 'test', 'newName')
        .then(() => {
          expect.fail('it did not reject');
        })
        .catch((error) => {
          expect(error).to.equal(err);
        });
      });
    });
  });
});
