'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import VirtualBoxInstall from 'browser/model/virtualbox';
import InstallableItem from 'browser/model/installable-item';
import InstallerDataService from 'browser/services/data';
import Platform from 'browser/services/platform';
import Logger from 'browser/services/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fsExtra from 'fs-extra';
import child_process from 'child_process';
import TokenStore from 'browser/services/credentialManager';
chai.use(sinonChai);


describe('InstallerDataService', function() {
  let sandbox, svc, jdk, vbox, fxExtraStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    svc = new InstallerDataService();
    svc.ipcRenderer = {
      send: function() {}
    };
    svc.router = {
      go: function() {}
    };

    jdk = new InstallableItem('jdk', 'https://developers.redhat.com/download-manager/jdf/file/jdk.msi', 'jdk.msi', 'jdk', svc);
    vbox = new VirtualBoxInstall(svc, 'virtualbox',
      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', 'virtualbox.exe', 'sha', '5.0.8', '103449');
    sandbox.stub(Logger, 'initialize');
    sandbox.stub(Logger, 'info');
    sandbox.stub(Logger, 'error');
    sandbox.stub(fs, 'mkdirSync');
    fxExtraStub = sandbox.stub(fsExtra, 'copy');
  });

  afterEach(function() {
    sandbox.restore();
  });

  let fakeProgress = {
    installTrigger: function() {},
    setStatus: function() {},
    setTotalAmount: function() {},
    setProductName: function() {},
    setCurrent: function() {}
  };

  describe('initial state', function() {

    describe('on windows', function() {
      it('should set installation folder to C:\\Program Files\\Development Suite', function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        sandbox.stub(Platform, 'getEnv').returns({PROGRAMFILES: 'C:\\Program Files'});
        let svc = new InstallerDataService();
        expect(svc.installRoot).to.equal(path.join(Platform.getProgramFilesPath(), 'DevelopmentSuite'));
      });
    });

    describe('on macos', function () {
      it('should set installation folder /Applications/DevelopmentSuite', function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(Platform, 'getEnv').returns({HOME:'/home/username'});
        let svc = new InstallerDataService();
        expect(svc.installRoot).to.equal(path.join(Platform.getProgramFilesPath(), 'DevelopmentSuite'));
      });
    });

    it('should load requirements from requirements.json if requirements parameter is not provided', function() {
      let svc = new InstallerDataService();
      expect(svc.requirements['cdk'].name).to.be.equal('Red Hat Container Development Kit');
    });

    it('should set requirements to provided in requirements parameter', function() {
      let requirements = {'cdk.zip':{'url':'http.redhat.com'}};
      let svc = new InstallerDataService(undefined, requirements);

      expect(svc.requirements).to.deep.equal(requirements);
    });

    it('should set default values correctly', function() {
      expect(svc.tempDir()).to.equal(os.tmpdir());

      expect(svc.username).to.equal(TokenStore.getUserName());
      expect(svc.password).to.equal('');

      expect(svc.downloading).to.equal(false);
      expect(svc.installing).to.equal(false);

      expect(svc.installableItems).to.be.empty;
      expect(svc.requirements).to.be.not.equal(undefined);
    });

    it('setup should correctly initialize folders', function() {
      svc.installRoot = 'installRoot';

      svc.setup();

      expect(svc.installDir()).to.equal(svc.installRoot);
      expect(svc.virtualBoxDir()).to.equal(path.join(svc.installRoot, 'virtualbox'));
      expect(svc.jdkDir()).to.equal(path.join(svc.installRoot, 'jdk8'));
      expect(svc.devstudioDir()).to.equal(path.join(svc.installRoot, 'devstudio'));
      expect(svc.jbosseapDir()).to.equal(path.join(svc.installRoot, 'jbosseap'));
      expect(svc.cygwinDir()).to.equal(path.join(svc.installRoot, 'cygwin'));
      expect(svc.komposeDir()).to.equal(path.join(svc.installRoot, 'kompose'));
      expect(svc.cdkDir()).to.equal(path.join(svc.installRoot, 'cdk'));
      expect(svc.cdkBoxDir()).to.equal(svc.cdkRoot);
      expect(svc.cdkMarker()).to.equal(path.join(svc.cdkRoot, '.cdk'));
      expect(svc.ocDir()).to.equal(path.join(svc.cdkRoot, 'bin'));
    });

    it('should replace developers.redhat.com host with value from DM_STAGE_HOST environment variable', function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      sandbox.stub(Platform, 'getEnv').returns({DM_STAGE_HOST:'localhost', PROGRAMFILES: 'C:\\Program Files'});
      svc = new InstallerDataService();
      expect(svc.requirements.jdk.dmUrl.startsWith('https://localhost')).equals(true);
    });
  });

  describe('addItemsToInstall', function() {
    it('should add all items to installables', function() {
      svc.addItemsToInstall(jdk, vbox);
      expect(svc.installableItems.size).to.equal(2);
      expect(svc.getInstallable('jdk')).to.equal(jdk);
      expect(svc.getInstallable('virtualbox')).to.equal(vbox);
      expect(svc.allInstallables()).to.equal(svc.installableItems);
    });
  });

  describe('copyUninstaller', function() {

    beforeEach(function() {
      sandbox.spy(svc, 'copyUninstaller');
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should copy uninstaller powershell script to target install folder', function() {
        svc.setup();
        svc.setupTargetFolder();
        expect(svc.copyUninstaller).calledOnce;
      });

      it('should log error if copy operation failed', function() {
        fxExtraStub.yields('error');
        Logger.error.reset();
        svc.setup();
        svc.setupTargetFolder();
        expect(Logger.error).calledOnce;
      });

      it('should log sucess message if copy operation succeeded', function() {
        fxExtraStub.yields();
        Logger.info.reset();
        svc.setup();
        svc.setupTargetFolder();
        expect(Logger.info).calledTwice;
      });

      it('should add uninstaller entry to control panel and log info message about success', function() {
        fxExtraStub.yields();
        Logger.info.reset();
        Logger.error.reset();
        let resolve;
        let result = new Promise((r) => {
          resolve = r;
        });
        sandbox.stub(child_process, 'exec').callsFake(function(exec, cb) {
          cb(undefined, 'stdout', '');
          resolve();
        });
        svc.setup();
        svc.setupTargetFolder();
        return result.then(()=>{
          expect(child_process.exec).to.be.called;
          expect(Logger.info).calledThrice;
          expect(Logger.error).not.called;
        });
      });

      it('should add uninstaller entry to control panel and log error message in case of failure', function() {
        fxExtraStub.yields();
        Logger.info.reset();
        Logger.error.restore();
        let resolve;
        let result = new Promise((r) => {
          resolve = r;
        });
        sandbox.stub(child_process, 'exec').yields('error');
        sandbox.stub(Logger, 'error').callsFake(function() {
          resolve();
        });
        svc.setup();
        svc.setupTargetFolder();
        return result.then(()=>{
          expect(child_process.exec).to.be.called;
        });
      });
    });

    describe('on macos', function() {
      it('should not copy uninstaller powershell script to target install folder', function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        svc.setup();
        expect(svc.copyUninstaller).not.called;
      });
    });

    describe('on linux', function() {
      it('should not copy uninstaller powershell script to target install folder', function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
        svc.setup();
        expect(svc.copyUninstaller).not.called;
      });
    });

  });

  describe('verifyExistingFiles', function() {
    let checkStub;

    beforeEach(function() {
      svc.addItemToInstall('jdk', jdk);
      svc.addItemToInstall('vbox', vbox);

      checkStub = sandbox.stub(InstallableItem.prototype, 'checkFiles').resolves();
    });

    it('should call checkFiles for each component passed', function() {
      return svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox').then(() => {
        expect(checkStub).calledTwice;
        expect(checkStub).calledOn(jdk);
        expect(checkStub).calledOn(vbox);
      });
    });

    it('should set status to "Verifying previously downloaded components"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox');

      expect(spy).calledWith('Verifying previously downloaded components');
    });

    it('should set total amount to number of components passed', function() {
      let spy = sandbox.spy(fakeProgress, 'setTotalAmount');
      svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox');

      expect(spy).calledWith(2);
    });

    it('should set product info to currently processed component', function() {
      let spy = sandbox.spy(fakeProgress, 'setProductName');
      return svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox').then(() => {
        expect(spy).calledTwice;
        expect(spy).calledWith(jdk.productName);
        expect(spy).calledWith(vbox.productName);
      });
    });

    it('should increment current amount for each completed component', function() {
      let spy = sandbox.spy(fakeProgress, 'setCurrent');
      return svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox').then(() => {
        expect(spy).calledThrice;
      });
    });

    it('should skip checks when no components were passed', function() {
      let spy = sandbox.spy(svc.ipcRenderer, 'send');
      return svc.verifyExistingFiles(fakeProgress).then(() => {
        expect(checkStub).not.called;
        expect(spy).calledOnce;
        expect(spy).calledWith('checkComplete', 'all');
      });
    });

    it('should fire "checkComplete" event when complete', function() {
      let spy = sandbox.spy(svc.ipcRenderer, 'send');
      return svc.verifyExistingFiles(fakeProgress, 'jdk', 'vbox').then(() => {
        expect(spy).calledOnce;
        expect(spy).calledWith('checkComplete', 'all');
      });
    });
  });

  describe('download', function() {
    let dlStub;

    beforeEach(function() {
      svc.addItemToInstall('jdk', jdk);
      svc.addItemToInstall('vbox', vbox);

      dlStub = sandbox.stub(InstallableItem.prototype, 'downloadInstaller').returns();
    });

    it('should set status to "Downloading"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      svc.download(fakeProgress, 2, new Set(), '', 'vbox', 'jdk');

      expect(spy).calledOnce;
      expect(spy).calledWith('Downloading');
    });

    it('should call downloadInstaller for each component', function() {
      svc.download(fakeProgress, 2, new Set(), '', 'vbox', 'jdk');

      expect(dlStub).calledTwice;
      expect(dlStub).calledOn(jdk);
      expect(dlStub).calledOn(vbox);
    });

    it('should fire a "downloadingComplete" event when all downloads finish', function() {
      let spy = sandbox.spy(svc.ipcRenderer, 'send');
      svc.download(fakeProgress, 2, new Set(), '');

      expect(spy).calledOnce;
      expect(spy).calledWith('downloadingComplete', 'all');
    });
  });

  describe('installing', function() {
    beforeEach(function() {
      svc.addItemToInstall('jdk', jdk);
      svc.startInstall('jdk');
    });

    it('startInstall should queue the installable for installing', function() {
      expect(svc.isInstalling()).to.be.true;
      expect(svc.toInstall.size).to.equal(1);
      expect(svc.toInstall.has('jdk')).to.be.true;
    });

    it('installDone should trigger item setup', function() {
      let stub = sandbox.stub(jdk, 'setup').returns();

      svc.installDone(fakeProgress, 'jdk');

      expect(svc.toInstall.size).to.equal(1);
      expect(stub).calledOnce;
    });

    it('installDone should call setupDone when setup is finished', function() {
      svc.addItemsToInstall(jdk);
      sandbox.stub(jdk, 'setup').yields();
      sandbox.stub(svc, 'setupDone');
      svc.installDone(undefined, jdk.keyName);
      expect(svc.setupDone).to.be.calledOnce;
    });

    it('installDone should log error when setup is failed', function() {
      svc.addItemsToInstall(jdk);
      sandbox.stub(jdk, 'setup').callsArgWith(2, 'error');
      Logger.error.reset();
      svc.installDone(undefined, jdk.keyName);
      expect(Logger.error).to.be.calledOnce;
    });
  });

  describe('setup', function() {
    beforeEach(function() {
      svc.addItemToInstall('jdk', jdk);
      svc.addItemToInstall('vbox', vbox);

      svc.startInstall('jdk');
      svc.startInstall('vbox');
    });

    it('setupDone should send an event that a component has finished installing', function() {
      let spy = sandbox.spy(svc.ipcRenderer, 'send');

      svc.setupDone(fakeProgress, 'jdk');
      svc.setupDone(fakeProgress, 'vbox');

      expect(spy).calledThrice;
      expect(spy).calledWith('installComplete', 'jdk');
      expect(spy).calledWith('installComplete', 'vbox');
      expect(spy).calledWith('installComplete', 'all');
    });

    it('setupDone should not log info message for skipped installer', function() {
      sandbox.stub(jdk, 'isSkipped').returns(true);
      Logger.info.reset();
      svc.setupDone(fakeProgress, 'jdk');
      expect(Logger.info).not.called;
    });

  });

  describe('getRequirementByName', function() {
    it('returns requested requirement', function() {
      try {
        let result = svc.getRequirementByName('cdk');
        expect(result.name).equal('Red Hat Container Development Kit');
      } catch (error) {
        expect.fail();
      }
    });

    it('throws exception if requested environment is missing', function() {
      expect(function() {
        svc.getRequirementByName('eclipse');
      }).to.throw(Error);
    });
  });

  it('setCredentials saves userName and passwords', function() {
    svc.setCredentials('username', 'password');
    expect(svc.getUsername()).to.be.equal('username');
    expect(svc.getPassword()).to.be.equal('password');
  });

  it('static factory should call installer with provided $sate', function() {
    let svc = InstallerDataService.factory('value');
    expect(svc).not.equal(undefined);
  });

});
