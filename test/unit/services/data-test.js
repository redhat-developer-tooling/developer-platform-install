'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import VagrantInstall from 'browser/model/vagrant';
import VirtualBoxInstall from 'browser/model/virtualbox';
import InstallerDataService from 'browser/services/data';
import Platform from 'browser/services/platform';
import Logger from 'browser/services/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fsExtra from 'fs-extra';
chai.use(sinonChai);


describe('InstallerDataService', function() {
  let sandbox, svc, vagrant, vbox;

  beforeEach(function() {
    svc = new InstallerDataService();
    svc.ipcRenderer = {
      send: function() {}
    };
    svc.router = {
      go: function() {}
    };
    sandbox = sinon.sandbox.create();
    vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
    vbox = new VirtualBoxInstall('5.0.8', '103449', svc,
      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', null);
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
        expect(svc.installRoot).to.equal(Platform.ENV.HOME + '/DevelopmentSuite');
      });
    });

    it('should load requirements from requirements.json if requirements parameter is not provided', function() {
      let svc = new InstallerDataService();
      expect(svc.requirements['cdk.zip'].name).to.be.equal('Red Hat Container Development Kit');
    });

    it('should set requirements to provided in requirements parameter', function() {
      let requirements = {'cdk.zip':{'url':'http.redhat.com'}};
      let svc = new InstallerDataService(undefined, requirements);
      expect(svc.requirements).to.be.equal(requirements);
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
      expect(svc.jbdsDir()).to.equal(path.join(svc.installRoot, 'devstudio'));
      expect(svc.vagrantDir()).to.equal(path.join(svc.installRoot, 'vagrant'));
      expect(svc.cygwinDir()).to.equal(path.join(svc.installRoot, 'cygwin'));
      expect(svc.cdkDir()).to.equal(path.join(svc.installRoot, 'cdk'));
      expect(svc.cdkBoxDir()).to.equal(path.join(svc.cdkRoot, 'boxes'));
      expect(svc.ocDir()).to.equal(path.join(svc.cdkRoot, 'bin'));
      expect(svc.cdkVagrantfileDir()).to.equal(path.join(svc.cdkRoot, 'components', 'rhel', 'rhel-ose'));
      expect(svc.cdkMarker()).to.equal(path.join(svc.cdkVagrantRoot, '.cdk'));
    });
  });

  describe('installables', function() {
    it('should be able to handle installables', function() {
      svc.addItemToInstall('key', vagrant);

      expect(svc.installableItems.size).to.equal(1);
      expect(svc.getInstallable('key')).to.equal(vagrant);
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
      svc.addItemToInstall('vagrant', vagrant);
      svc.addItemToInstall('vbox', vbox);

      sandbox.stub(vagrant, 'downloadInstaller').returns();
      sandbox.stub(vbox, 'downloadInstaller').returns();
    });

    it('startDownload should queue the installable for download', function() {
      svc.startDownload('vagrant');
      expect(svc.isDownloading()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
      expect(svc.toDownload.has('vagrant')).to.be.true;
    });

    it('downloadDone should signal that the download has finished', function() {
      svc.startDownload('vagrant');
      svc.startDownload('vbox');
      sandbox.stub(vagrant, 'install');

      svc.downloadDone(fakeProgress, 'vagrant');

      expect(vagrant.isDownloaded()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
    });

    it('downloadDone should trigger install on the installable', function() {
      svc.startDownload('vagrant');
      svc.startDownload('vbox');

      let spy = sandbox.spy(svc, 'startInstall');
      let stub = sandbox.stub(vagrant, 'install').returns();

      svc.downloadDone(fakeProgress, 'vagrant');

      expect(spy).calledWith('vagrant');
      expect(stub).calledOnce;
    });

    it('downloadDone should call installDone when installation is finished', function() {
      svc.addItemsToInstall(vagrant);
      sandbox.stub(vagrant, 'install').yields();
      sandbox.stub(svc, 'installDone');
      svc.downloadDone(undefined, vagrant.keyName);
      expect(svc.installDone).to.be.calledOnce;
    });

    it('downloadDone should log error when installation is failed', function() {
      svc.addItemsToInstall(vagrant);
      sandbox.stub(vagrant, 'install').callsArgWith(2, 'error');
      Logger.error.reset();
      svc.downloadDone(undefined, vagrant.keyName);
      expect(Logger.error).to.be.calledOnce;
    });

    it('downloadDone should send an event when all downloads have finished', function() {
      svc.startDownload('vagrant');
      svc.startDownload('vbox');

      sandbox.stub(vagrant, 'install').returns();
      sandbox.stub(vbox, 'install').returns();
      let spy = sandbox.spy(svc.ipcRenderer, 'send');

      svc.downloadDone(fakeProgress, 'vagrant');
      svc.downloadDone(fakeProgress, 'vbox');

      expect(spy).calledOnce;
      expect(spy).calledWith('downloadingComplete', 'all');
    });
  });

  describe('installing', function() {
    beforeEach(function() {
      svc.addItemToInstall('vagrant', vagrant);
      svc.startInstall('vagrant');
    });

    it('startInstall should queue the installable for installing', function() {
      expect(svc.isInstalling()).to.be.true;
      expect(svc.toInstall.size).to.equal(1);
      expect(svc.toInstall.has('vagrant')).to.be.true;
    });

    it('installDone should trigger item setup', function() {
      let stub = sandbox.stub(vagrant, 'setup').returns();

      svc.installDone(fakeProgress, 'vagrant');

      expect(svc.toInstall.size).to.equal(1);
      expect(stub).calledOnce;
    });

    it('installDone should call setupDone when setup is finished', function() {
      svc.addItemsToInstall(vagrant);
      sandbox.stub(vagrant, 'setup').yields();
      sandbox.stub(svc, 'setupDone');
      svc.installDone(undefined, vagrant.keyName);
      expect(svc.setupDone).to.be.calledOnce;
    });

    it('installDone should log error when setup is failed', function() {
      svc.addItemsToInstall(vagrant);
      sandbox.stub(vagrant, 'setup').callsArgWith(2, 'error');
      Logger.error.reset();
      svc.installDone(undefined, vagrant.keyName);
      expect(Logger.error).to.be.calledOnce;
    });
  });

  describe('setup', function() {
    beforeEach(function() {
      svc.addItemToInstall('vagrant', vagrant);
      svc.addItemToInstall('vbox', vbox);

      svc.startInstall('vagrant');
      svc.startInstall('vbox');
    });

    it('setupDone should send an event that a component has finished installing', function() {
      let spy = sandbox.spy(svc.ipcRenderer, 'send');

      svc.setupDone(fakeProgress, 'vagrant');
      svc.setupDone(fakeProgress, 'vbox');

      expect(spy).calledTwice;
      expect(spy).calledWith('installComplete', 'vagrant');
      expect(spy).calledWith('installComplete', 'vbox');
    });

    it('setupDone should switch to final page when all installs have finished', function() {
      let spy = sandbox.spy(svc.router, 'go');

      svc.setupDone(fakeProgress, 'vagrant');
      svc.setupDone(fakeProgress, 'vbox');

      expect(svc.installing).to.be.false;
      expect(spy).calledOnce;
      expect(spy).calledWith('start');
    });

    it('setupDone should not log info message for skipped installer', function() {
      sandbox.stub(vagrant, 'isSkipped').returns(true);
      Logger.info.reset();
      svc.setupDone(fakeProgress, 'vagrant');
      expect(Logger.info).not.called;
    });

  });

  describe('getRequirementByName', function() {
    it('returns requested requirement', function() {
      svc.addItemsToInstall(vagrant);
      try {
        let result = svc.getRequirementByName('vagrant');
        console.log(result);
        expect(result.name).equal('Vagrant');
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
