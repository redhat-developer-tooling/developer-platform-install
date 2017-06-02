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
chai.use(sinonChai);


describe('InstallerDataService', function() {
  let sandbox = sinon.sandbox.create();
  let svc;
  let jdk;
  let vbox;

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

  });

  afterEach(function() {
    sandbox.restore();
  });

  let logStub, fsStub, infoStub, errorStub, fxExtraStub;
  let fakeProgress = {
    installTrigger: function() {},
    setStatus: function() {}
  };

  before(function() {
    logStub = sinon.stub(Logger, 'initialize');
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    fsStub = sinon.stub(fs, 'mkdirSync');
    fxExtraStub  = sinon.stub(fsExtra, 'copy');
  });

  after(function() {
    logStub.restore();
    fsStub.restore();
    infoStub.restore();
    errorStub.restore();
    fxExtraStub.restore();
  });

  describe('initial state', function() {

    describe('on windows', function() {
      it('should set installation folder to C:\\DevelopmentSuite', function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        let svc = new InstallerDataService();
        expect(svc.installRoot).to.equal('c:\\DevelopmentSuite');
      });
    });

    describe('on macos', function () {
      it('should set installation folder $HOME\\DevelopmentSuite', function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(Platform, 'getEnv').returns({HOME:'/home/username'});
        let svc = new InstallerDataService();
        expect(svc.installRoot).to.equal('/Applications/DevelopmentSuite');
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
      expect(svc.tmpDir).to.equal(os.tmpdir());

      expect(svc.username).to.equal('');
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
      expect(svc.cygwinDir()).to.equal(path.join(svc.installRoot, 'cygwin'));
      expect(svc.komposeDir()).to.equal(path.join(svc.installRoot, 'kompose'));
      expect(svc.cdkDir()).to.equal(path.join(svc.installRoot, 'cdk'));
      expect(svc.cdkBoxDir()).to.equal(svc.cdkRoot);
      expect(svc.cdkMarker()).to.equal(path.join(svc.cdkRoot, '.cdk'));
      expect(svc.ocDir()).to.equal(path.join(svc.cdkRoot, 'bin'));
    });

    it('should replace developers.redhat.com host with value from DM_STAGE_HOST environment variable', function(){
      sandbox.stub(Platform, 'getOS').returns('win32');
      sandbox.stub(Platform, 'getEnv').returns({DM_STAGE_HOST:'localhost'});
      svc = new InstallerDataService();
      expect(svc.requirements.jdk.dmUrl.startsWith('https://localhost')).equals(true);
    });
  });

  describe('addItemsToInstall', function() {
    it('should add all items to installables', function() {
      svc.addItemsToInstall(jdk,vbox);
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
        expect(svc.copyUninstaller).calledOnce;
      });

      it('should log error if copy operation failed', function() {
        fxExtraStub.yields('error');
        Logger.error.reset();
        svc.setup();
        expect(Logger.error).calledOnce;
      });

      it('should log sucess message if copy operation succed', function() {
        fxExtraStub.yields();
        Logger.info.reset();
        svc.setup();
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
        sandbox.stub(child_process, 'exec').callsFake(function(exec, cb){
          cb(undefined,'stdout','');
          resolve();
        });
        svc.setup();
        return result.then(()=>{
          expect(child_process.exec).to.be.called;
          expect(Logger.info).calledThrice;
          expect(Logger.error).not.called;
        });
      });

      it('should add uninstaller entry to control panel and log error message in case of failure', function() {
        fxExtraStub.yields();
        Logger.info.reset();
        Logger.error.reset();
        let resolve;
        let result = new Promise((r) => {
          resolve = r;
        });
        sandbox.stub(child_process, 'exec').callsFake(function(exec, cb){
          cb('error','stdout','');
          resolve();
        });
        svc.setup();
        return result.then(()=>{
          expect(child_process.exec).to.be.called;
          expect(Logger.error).to.be.calledOnce;
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

  describe('downloading', function() {
    beforeEach(function() {
      svc.addItemToInstall('jdk', jdk);
      svc.addItemToInstall('vbox', vbox);

      sandbox.stub(jdk, 'downloadInstaller').returns();
      sandbox.stub(vbox, 'downloadInstaller').returns();
    });

    it('startDownload should queue the installable for download', function() {
      svc.startDownload('jdk');
      expect(svc.isDownloading()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
      expect(svc.toDownload.has('jdk')).to.be.true;
    });

    it('downloadDone should signal that the download has finished', function() {
      svc.startDownload('jdk');
      svc.startDownload('vbox');
      sandbox.stub(jdk, 'install');

      svc.downloadDone(fakeProgress, 'jdk');

      expect(jdk.isDownloaded()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
    });

    it('downloadDone should trigger install on the installable', function() {
      svc.startDownload('jdk');
      svc.startDownload('vbox');

      let spy = sandbox.spy(svc, 'startInstall');
      let stub = sandbox.stub(jdk, 'install').returns();

      svc.downloadDone(fakeProgress, 'jdk');

      expect(spy).calledWith('jdk');
      expect(stub).calledOnce;
    });

    it('downloadDone should call installDone when installation is finished', function() {
      svc.addItemsToInstall(jdk);
      sandbox.stub(jdk, 'install').yields();
      sandbox.stub(svc, 'installDone');
      svc.downloadDone(undefined, jdk.keyName);
      expect(svc.installDone).to.be.calledOnce;
    });

    it('downloadDone should log error when installation is failed', function() {
      svc.addItemsToInstall(jdk);
      sandbox.stub(jdk, 'install').callsArgWith(2, 'error');
      Logger.error.reset();
      svc.downloadDone(undefined, jdk.keyName);
      expect(Logger.error).to.be.calledOnce;
    });

    it('downloadDone should send an event when all downloads have finished', function() {
      svc.startDownload('jdk');
      svc.startDownload('vbox');

      sandbox.stub(jdk, 'install').returns();
      sandbox.stub(vbox, 'install').returns();
      let spy = sandbox.spy(svc.ipcRenderer, 'send');

      svc.downloadDone(fakeProgress, 'jdk');
      svc.downloadDone(fakeProgress, 'vbox');

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

      expect(spy).calledTwice;
      expect(spy).calledWith('installComplete', 'jdk');
      expect(spy).calledWith('installComplete', 'vbox');
    });

    it('setupDone should switch to final page when all installs have finished', function() {
      let spy = sandbox.spy(svc.router, 'go');

      svc.setupDone(fakeProgress, 'jdk');
      svc.setupDone(fakeProgress, 'vbox');

      expect(svc.installing).to.be.false;
      expect(spy).calledOnce;
      expect(spy).calledWith('start');
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
