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
import InstallableItem from 'browser/model/installable-item';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import mockfs from 'mock-fs';
import child_process from 'child_process';
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
  installerDataSvc.localAppData.restore();

  let fakeProgress;

  let success = () => {};
  let failure = () => {};

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256').callsFake(function(file, cb) { cb('hash'); });

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
    installer = new JdkInstall(installerDataSvc, 'jdk8', downloadUrl, 'jdk.msi', 'sha');
    fakeProgress = sandbox.stub(new ProgressState());
    fakeProgress.$timeout = sinon.stub();
    fakeProgress.$scope = {$apply: function () {}};
  });

  afterEach(function () {
    sandbox.restore();
  });

  function mockDetectedJvm(version, location = 'java.home = /java/home\n', buildDate = '2018-03-20') {
    sandbox.stub(JdkInstall.prototype, 'findMsiInstalledJava').resolves('');
    sandbox.stub(JdkInstall.prototype, 'findDarwinJava').resolves('');
    sandbox.stub(Util, 'executeCommand')
      .onFirstCall().resolves(`version "${version}" ${buildDate}`)
      .onSecondCall().resolves(location);
    sandbox.stub(Util, 'executeFile').resolves('optput');
    sandbox.stub(child_process, 'exec').yields(undefined, 'output');
  }

  describe('when instantiated', function() {

    it('should fail when no url is set and installed file not defined', function() {
      expect(function() {
        new JdkInstall(installerDataSvc, null, null, null);
      }).to.throw('No download URL set');
    });

    it('should fail when no url is set and installed file is empty', function() {
      expect(function() {
        new JdkInstall(installerDataSvc, null, null, '');
      }).to.throw('No download URL set');
    });

    it('should download jdk installer to temporary folder with confiugured file name', function() {
      expect(new JdkInstall(installerDataSvc, 'jdk8', 'url', 'jdk.msi', 'sha').downloadedFile).to.equal(
        path.join(installerDataSvc.localAppData(), 'cache', 'jdk.msi'));
    });
  });

  // FIXME expect calls in done callback does not report errors
  // because if expect fails it gets cought in catch() and then
  // function callback done called again
  describe('when detecting existing installation', function() {
    let jdk;
    beforeEach(function() {
      jdk = new JdkInstall(installerDataSvc, 'jdk8', 'url', 'jdk8.msi', 'sha');
    });

    it('should detect java location if installed', function() {
      mockDetectedJvm('1.8.0_111');
      return jdk.detectExistingInstall().then(()=>{
        expect(jdk.selectedOption).to.be.equal('detected');
        expect(jdk.hasOption('detected')).to.be.equal(true);
        expect(jdk.getLocation()).to.be.equal('/java/home');
      });
    });

    it('should create deafult empty callback if not provided', function() {
      mockDetectedJvm('1.8.0_1');
      try {
        jdk.detectExistingInstall();
      } catch (exception)  {
        expect.fail('Did not created default empty callback');
      }
    });

    it('should not fail if selected option is not present in available options', function() {
      jdk.selectedOption = 'detected';
      jdk.validateVersion();
    });

    it('should detect Java 9 and mark it as invalid', function() {
      mockDetectedJvm('9.0.4.1-redhat');
      return jdk.detectExistingInstall().then(()=>{
        expect(jdk.selectedOption).to.be.equal('detected');
        expect(jdk.option.detected.valid).to.be.equal(false);
      });
    });

    it('should detect Java 10 and mark it as invalid', function() {
      mockDetectedJvm('10');
      return jdk.detectExistingInstall().then(()=>{
        expect(jdk.selectedOption).to.be.equal('detected');
        expect(jdk.option.detected.valid).to.be.equal(false);
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should select openjdk for installation if no java detected', function() {
        mockDetectedJvm('');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('install');
          expect(jdk.getLocation()).to.be.equal(installerDataSvc.jdkDir());
        });
      });

      // FIXME is not the case for JDK 9, because version has different format
      it('should select openjdk for installation if newer than supported java version detected', function() {
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
        });
      });

      it('should select openjdk for installation if older than supported java version detected', function() {
        mockDetectedJvm('1.7.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.hasOption('install')).to.be.equal(true);
        });
      });

      it('should reject openjdk if location for java is not found', function() {
        mockDetectedJvm('', '');
        return jdk.detectExistingInstall().then(()=> {
          expect(jdk.selectedOption).to.be.equal('install');
        });
      });

      it('should check for available msi installtion', function() {
        mockDetectedJvm('1.8.0_1');
        jdk.findMsiInstalledJava.restore();
        return jdk.detectExistingInstall().then(()=>{
          expect(child_process.exec).calledWith(jdk.getMsiSearchScriptData());
        });
      });

      it('should skip darwin JVM detection', function() {
        mockDetectedJvm('1.8.0_1');
        jdk.findDarwinJava.restore();
        return jdk.detectExistingInstall().then(()=>{
          expect(Util.executeFile).not.calledWith('/usr/libexec/java_home');
        });
      });

      it('should remove detected option and mark for installation in case detection ran agian an nothing detected', function() {
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
          Util.executeCommand.rejects();
          return jdk.detectExistingInstall();
        }).then(()=>{
          expect(jdk.hasOption('install')).equals(true);
          expect(jdk.option['detected']).to.equal(undefined);
        });
      });
    });

    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });

      it('should not select jdk for installation if no java detected', function() {
        mockDetectedJvm('');
        jdk.selectedOption = 'detected';
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
        });
      });

      it('should not select openjdk for installation if newer than supported supported version detected', function() {
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
        });
      });

      it('should not select openjdk for installation if older than supported supported java version detected', function() {
        mockDetectedJvm('1.7.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
        });
      });

      it('should not check for available msi installtion', function() {
        mockDetectedJvm('1.8.0_1');
        jdk.findMsiInstalledJava.restore();
        return jdk.detectExistingInstall().then(()=>{
          expect(Util.executeFile).to.have.not.been.called;
          expect(child_process.exec).to.have.not.been.called;
        });
      });

      it('should check if a JVM exists first', function() {
        mockDetectedJvm('1.8.0_1');
        jdk.findDarwinJava.restore();
        return jdk.detectExistingInstall().then(()=>{
          expect(Util.executeFile).to.have.been.called;
          expect(Util.executeFile).calledWith('/usr/libexec/java_home');
        });
      });

      it('should not call java if no JVM installed', function() {
        mockDetectedJvm('1.8.0_1');
        jdk.findDarwinJava.restore();
        Util.executeFile.restore();
        sandbox.stub(Util, 'executeFile');
        Util.executeFile.resolves('Unable to find any JVMs');
        return jdk.detectExistingInstall().then(()=>{
          expect(Util.executeCommand).not.calledWith('java -version');
        });
      });

      it('should call java if JVM exists', function() {
        mockDetectedJvm('1.8.0_1');
        Util.executeFile.resolves('location');
        return jdk.detectExistingInstall().then(()=>{
          expect(Util.executeFile).to.not.have.been.called;
        });
      });

      it('should remove detected option and mark as detected in case detection ran agian an nothing detected', function() {
        mockDetectedJvm('1.9.0_1');
        return jdk.detectExistingInstall().then(()=>{
          expect(jdk.selectedOption).to.be.equal('detected');
          expect(jdk.option.detected.version).to.be.equal('1.9.0_1');
          Util.executeCommand.rejects();
          return jdk.detectExistingInstall();
        }).then(()=>{
          expect(jdk.option['detected']).to.be.equal(undefined);
          expect(jdk.selectedOption).to.be.equal('detected');
        });
      });
    });
  });

  describe('after detection', function() {
    it('isConfigured function should not be overriden on windows', function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      let stub = sandbox.stub(InstallableItem.prototype, 'isConfigured');
      installer.isConfigured();
      expect(stub).to.have.been.calledOnce;
    });

    it('should only be configured properly when detected and valid on mac', function() {
      sandbox.stub(Platform, 'getOS').returns('darwin');
      sandbox.stub(installer, 'isDetected').returns(true);

      installer.option.detected = { valid: false };
      expect(installer.isConfigured()).to.be.false;

      installer.option.detected.valid = true;
      expect(installer.isConfigured()).to.be.true;
    });
  });

  describe('when downloading the jdk msi', function() {
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should write the data into temp/jdk.msi', function() {

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl, 'user', 'passwd', path.join(installerDataSvc.localAppData(), 'cache', 'jdk.msi'));
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
      sandbox.stub(Installer.prototype, 'execFile').resolves();
      sandbox.stub(Util, 'findText').rejects();
      sandbox.stub(fs, 'existsSync').returns(true);
      installer.install(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should remove an existing folder with the same name', function() {
      sandbox.stub(Installer.prototype, 'execFile').resolves();
      sandbox.stub(Util, 'findText').rejects();
      sandbox.stub(fs, 'existsSync').returns(true);
      let stub = sandbox.stub(rimraf, 'sync').returns();

      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should call the installer with appropriate parameters', function() {
      let spy =   sandbox.stub(Installer.prototype, 'exec').resolves();
      sandbox.stub(Util, 'findText').rejects();
      installer.install(fakeProgress, success, failure);

      expect(spy).to.have.been.called;
      expect(spy).calledWith(installer.createMsiExecParameters().join(' '));
    });

    it('should catch errors during the installation', function() {
      sandbox.stub(require('child_process'), 'execFile').yields(new Error('critical error'), 'stdout', 'stderr');
      sandbox.spy(installer, 'installAfterRequirements');
      return new Promise((resolve, reject)=> {
        installer.installAfterRequirements(fakeProgress, resolve, reject);
      }).then(()=>{
        expect.fail();
      }).catch((error)=>{
        expect(installer.installAfterRequirements).has.been.called;
        expect(error.message).equals('critical error');
      });
    });

    it('should call success callback if install was sucessful but redirected to different location', function() {
      sandbox.stub(Installer.prototype, 'execFile').returns(Promise.resolve(true));
      sandbox.stub(Util, 'findText').returns(Promise.resolve('Dir (target): Key: INSTALLDIR	, Object: target/install'));
      installer = new JdkInstall(installerDataSvc, 'jdk8', downloadUrl, 'jdk8.msi', 'sha');
      return new Promise((resolve, reject)=> {
        installer.install(fakeProgress, resolve, reject);
      }).catch((error)=>{
        expect(error).is.not.undefined;
      });
    });

    it('should call success callback if install was sucessful but search for actual location failed', function(done) {
      sandbox.stub(Installer.prototype, 'exec').returns(Promise.resolve(true));
      sandbox.stub(Util, 'findText').returns(Promise.reject('failure'));
      installer = new JdkInstall(installerDataSvc, 'jdk8', downloadUrl, 'jdk8.msi', 'sha');
      return installer.install(fakeProgress, function() {
        done();
      }, function() {
        expect.fail('it should not fail');
      });
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
      sandbox.stub(Util, 'findText').returns(Promise.resolve('Dir \\(target\\): Key: INSTALLDIR	, Object: target/install'));
      installer = new JdkInstall(installerDataSvc, 'jdk8', downloadUrl, 'jdk8.msi', 'sha');
      sandbox.stub(installer, 'getLocation').returns('target/install');
      installerDataSvc.jdkRoot = 'install/jdk8';
      return installer.install(fakeProgress, function() {
        expect(installerDataSvc.jdkRoot).to.be.equal('install/jdk8');
        done();
      }, function() {
        expect.fail('it should not fail');
      });
    });
  });
});
