'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import VagrantInstall from 'browser/model/vagrant';
import VirtualBoxInstall from 'browser/model/virtualbox';
import InstallerDataService from 'browser/services/data';
import InstallableItem from 'browser/model/installable-item';
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
      send: function(event, key) {}
    };
    svc.router = {
      go: function(route) {}
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
    setStatus: function(status) {}
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
    it('should set installation folder according to OS', function() {
      if (process.platform === 'win32') {
        expect(svc.installRoot).to.equal('c:\\DevelopmentSuite');
      } else {
        expect(svc.installRoot).to.equal(process.env.HOME + '/DevelopmentSuite');
    	}
    });

    it('should set default values correctly', function() {
      expect(svc.tmpDir).to.equal(os.tmpdir());

      expect(svc.username).to.equal('');
      expect(svc.password).to.equal('');

      expect(svc.downloading).to.equal(false);
      expect(svc.installing).to.equal(false);

      expect(svc.installableItems).to.be.empty;
    });

    it('setup should correctly initialize folders', function() {
      svc.installRoot = 'installRoot';

      svc.setup();

      expect(svc.vboxRoot).to.equal(path.join(svc.installRoot, 'virtualbox'));
      expect(svc.jdkRoot).to.equal(path.join(svc.installRoot, 'jdk8'));
      expect(svc.jbdsRoot).to.equal(path.join(svc.installRoot, 'devstudio'));
      expect(svc.vagrantRoot).to.equal(path.join(svc.installRoot, 'vagrant'));
      expect(svc.cygwinRoot).to.equal(path.join(svc.installRoot, 'cygwin'));
      expect(svc.cdkRoot).to.equal(path.join(svc.installRoot, 'cdk'));
      expect(svc.cdkBoxRoot).to.equal(path.join(svc.cdkRoot, 'boxes'));
      expect(svc.ocBinRoot).to.equal(path.join(svc.cdkRoot, 'bin'));
      expect(svc.cdkVagrantRoot).to.equal(path.join(svc.cdkRoot, 'components', 'rhel', 'rhel-ose'));
      expect(svc.cdkMarkerFile).to.equal(path.join(svc.cdkVagrantRoot, '.cdk'));
    })
  });

  describe('installables', function() {
    it('should be able to handle installables', function() {
      svc.addItemToInstall('key', vagrant);

      expect(svc.installableItems.size).to.equal(1);
      expect(svc.getInstallable('key')).to.equal(vagrant);
      expect(svc.allInstallables()).to.equal(svc.installableItems);
    });
  });

  describe('downloading', function() {
    beforeEach(function() {
      svc.addItemToInstall('vagrant', vagrant);
      svc.addItemToInstall('vbox', vbox);

      sandbox.stub(vagrant, 'downloadInstaller').returns();
      sandbox.stub(vbox, 'downloadInstaller').returns();
    })

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
  });
});
