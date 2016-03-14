'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import VagrantInstall from 'model/vagrant';
import VirtualBoxInstall from 'model/virtualbox';
import InstallerDataService from 'services/data';
import InstallableItem from 'model/installable-item';
import Logger from 'services/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';
chai.use(sinonChai);


describe('InstallerDataService', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  let logStub, fsStub, infoStub, errorStub;
  let fakeProgress = {
    installTrigger: function() {}
  };

  before(function() {
    logStub = sinon.stub(Logger, 'initialize');
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    fsStub = sinon.stub(fs, 'mkdirSync');
  });

  after(function() {
    logStub.restore();
    fsStub.restore();
    infoStub.restore();
    errorStub.restore();
  });

  describe('initial state', function() {
    it('should set installation folder according to OS', function() {
      let svc = new InstallerDataService();
      if (process.platform === 'win32') {
        expect(svc.installRoot).to.equal('c:\\DeveloperPlatform');
      } else {
        expect(svc.installRoot).to.equal(process.env.HOME + '/DeveloperPlatform');
    	}
    });

    it('should set default values correctly', function() {
      let svc = new InstallerDataService();
      expect(svc.tmpDir).to.equal(os.tmpdir());

      expect(svc.username).to.equal('');
      expect(svc.password).to.equal('');

      expect(svc.downloading).to.equal(false);
      expect(svc.installing).to.equal(false);

      expect(svc.installableItems).to.be.empty;
    });

    it('setup should correctly initialize folders', function() {
      let svc = new InstallerDataService();
      svc.setup('installRoot');

      expect(svc.installRoot).to.equal('installRoot');

      expect(svc.vboxRoot).to.equal(path.join(svc.installRoot, 'virtualbox'));
      expect(svc.jdkRoot).to.equal(path.join(svc.installRoot, 'jdk8'));
      expect(svc.jbdsRoot).to.equal(path.join(svc.installRoot, 'DeveloperStudio'));
      expect(svc.vagrantRoot).to.equal(path.join(svc.installRoot, 'vagrant'));
      expect(svc.cygwinRoot).to.equal(path.join(svc.installRoot, 'ssh-rsync'));
      expect(svc.cdkRoot).to.equal(path.join(svc.installRoot, 'cdk'));
      expect(svc.cdkBoxRoot).to.equal(path.join(svc.cdkRoot, 'boxes'));
      expect(svc.ocBinRoot).to.equal(path.join(svc.cdkRoot, 'bin'));
      expect(svc.cdkVagrantRoot).to.equal(path.join(svc.cdkRoot, 'openshift-vagrant'));
      expect(svc.cdkMarkerFile).to.equal(path.join(svc.cdkVagrantRoot, '.cdk'));
    })
  });

  describe('installables', function() {
    it('should be able to handle installables', function() {
      let svc = new InstallerDataService();
      let vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
      svc.addItemToInstall('key', vagrant);

      expect(svc.installableItems.size).to.equal(1);
      expect(svc.getInstallable('key')).to.equal(vagrant);
      expect(svc.allInstallables()).to.equal(svc.installableItems);
    });
  });

  describe('downloading', function() {
    it('startDownload should queue the installable for download', function() {
      let svc = new InstallerDataService();
      let vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
      sandbox.stub(vagrant, 'downloadInstaller').returns();

      svc.addItemToInstall('vagrant', vagrant);
      svc.startDownload('vagrant');
      expect(svc.isDownloading()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
      expect(svc.toDownload.has('vagrant')).to.be.true;
    });

    it('downloadDone should signal that the download has finished', function() {
      let svc = new InstallerDataService();
      let vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
      let vbox = new VirtualBoxInstall('5.0.8', '103449', svc,
        'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', null);

      svc.addItemToInstall('vagrant', vagrant);
      svc.addItemToInstall('vbox', vbox);

      svc.startDownload('vagrant');
      svc.startDownload('vbox');

      sandbox.stub(vagrant, 'downloadInstaller').returns();
      sandbox.stub(vbox, 'downloadInstaller').returns();
      let stub = sandbox.stub(vagrant, 'install');

      svc.downloadDone(fakeProgress, 'vagrant');

      expect(vagrant.isDownloaded()).to.be.true;
      expect(svc.toDownload.size).to.equal(1);
    });

    it('downloadDone should trigger install on the installable', function() {
      let svc = new InstallerDataService();
      let vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
      let vbox = new VirtualBoxInstall('5.0.8', '103449', svc,
        'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', null);

      svc.addItemToInstall('vagrant', vagrant);
      svc.addItemToInstall('vbox', vbox);

      svc.startDownload('vagrant');
      svc.startDownload('vbox');

      sandbox.stub(vagrant, 'downloadInstaller').returns();
      sandbox.stub(vbox, 'downloadInstaller').returns();
      let spy = sandbox.spy(svc, 'startInstall');
      let stub = sandbox.stub(vagrant, 'install').returns();

      svc.downloadDone(fakeProgress, 'vagrant');

      expect(spy).calledWith('vagrant');
      expect(stub).calledOnce;
    });
  });

  describe('installing', function() {
    it('startInstall should queue the installable for installing', function() {
      let svc = new InstallerDataService();
      let vagrant = new VagrantInstall(svc, 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);

      svc.addItemToInstall('vagrant', vagrant);
      svc.startInstall('vagrant');
      expect(svc.isInstalling()).to.be.true;
      expect(svc.toInstall.size).to.equal(1);
      expect(svc.toInstall.has('vagrant')).to.be.true;
    });
  });
});
