'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs-extra';
import path from 'path';
import VagrantInstall from 'model/vagrant';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
import Util from 'model/helpers/util';
import child_process from 'child_process';
chai.use(sinonChai);

describe('Vagrant installer', function() {
  let installer;
  let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';
  let installerDataSvc;
  let infoStub, errorStub, sandbox;
  let fakeInstallable = {
    isInstalled: function() { return false; }
  };
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    vagrantDir: function() { return path.join('installationFolder','vagrant'); },
    getInstallable: function(key) { return fakeInstallable; }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.vagrantDir.returns(path.join('installationFolder','vagrant'));
  installerDataSvc.getInstallable.returns(fakeInstallable);

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
      'tempDirectory' : {},
      'installationFolder' : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    mockfs.restore();
    infoStub.restore();
    errorStub.restore();
  });

  beforeEach(function () {
    installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download vagrant when an installation exists', function() {
    let vagrant = new VagrantInstall(installerDataSvc, 'url', 'file');
    expect(vagrant.useDownload).to.be.false;
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new VagrantInstall(installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new VagrantInstall(installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download vagrant when no installation is found', function() {
    expect(new VagrantInstall(installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download vagrant installer to temporary folder as vagrant.zip', function() {
    expect(new VagrantInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join(installerDataSvc.tempDir(), 'vagrant.msi'));
  });

  describe('installer download', function() {
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/vagrant.zip', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'vagrant.msi'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl);
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {
    let downloadedFile = path.join('tempDirectory', 'vagrant.zip');

    it('should not start until Cygwin has finished installing', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      let installSpy = sandbox.spy(installer, 'postCygwinInstall');

      try {
        installer.install(fakeProgress, null, null);
      } catch (err) {
        //workaround for ipcRenderer
      } finally {
        expect(installSpy).not.called;
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith('Waiting for Cygwin to finish installation');
      }
    });

    it('should install once Cygwin has finished', function() {
      let stub = sandbox.stub(installer, 'postCygwinInstall').returns();
      sandbox.stub(fakeInstallable, 'isInstalled').returns(true);

      installer.install(fakeProgress, () => {}, (err) => {});

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      sandbox.stub(Installer.prototype, 'execFile').rejects('done');

      installer.postCygwinInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should exec the downloaded file with temporary folder as target destination', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields('done');
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith('msiexec', [
        '/i', path.join('tempDirectory','vagrant.msi'),
        'VAGRANTAPPDIR=' + path.join('installationFolder','vagrant'), '/qn', '/norestart', '/Liwe',
        path.join('installationFolder','vagrant.log')]);
    });

    it('should catch errors during the installation', function(done) {
      let stub = sandbox.stub(require('unzip'), 'Extract').throws(new Error('critical error'));

      try {
        installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it('should skip the installation if it is not selected', function() {
      let helper = new Installer('vagrant', fakeProgress, () => {}, () => {});
      installer.selectedOption = 'do nothing';
      let spy = sandbox.spy(helper, 'execFile');
      let calls = 0;
      let succ = function() { return calls++; };

      installer.postCygwinInstall(fakeProgress, succ, function (err) {});

      expect(spy).not.called;
      expect(calls).to.equal(1);
    });
  });

  describe('setup', function() {
    it('should set progress to "setting up"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      sandbox.stub(Installer.prototype, 'writeFile').rejects('done');
      installer.setup(fakeProgress, () => {}, () => {});

      expect(spy).calledOnce;
      expect(spy).calledWith('Setting up');
    });
  });

  describe('detection', function() {
    let stub, validateStub;

    beforeEach(function() {
      stub = sandbox.stub(Util, 'executeCommand');
      stub.onCall(0).resolves('folder/subfolder/subsubfolder');
      stub.onCall(1).resolves('Vagrant 1.8.1');
      validateStub = sandbox.stub(installer, 'validateVersion').returns();
    });

    it('should set vagrant as detected in the appropriate folder when found', function(done) {
      return installer.detectExistingInstall(function(err) {
        expect(installer.option['detected'].location).to.equal('folder');
        done();
      });
    });

    it('should check the detected version', function(done) {
      return installer.detectExistingInstall(function() {
        expect(installer.option['detected'].version).to.equal('1.8.1');
        done();
      });
    });

    it('should validate the detected version against the required one', function(done) {
      return installer.detectExistingInstall(function() {
        expect(validateStub).calledOnce;
        done();
      });
    });
  });

  describe('version validation', function() {
    let option;

    beforeEach(function() {
      installer.addOption('detected','', 'folder',false);
      installer.selectedOption = 'detected';
      option = installer.option[installer.selectedOption];
    })

    it('should mark the version as valid if it at least matches the required', function() {
      installer.option['detected'].version = '1.8.1';
      installer.validateVersion();

      expect(option.valid).to.be.true;
      expect(option.error).to.equal('');
      expect(option.warning).to.equal('');
    });

    it('should set a warning when the version is newer than recommended', function() {
      installer.option['detected'].version = '1.8.2';
      installer.validateVersion();

      expect(option.valid).to.be.true;
      expect(option.error).to.equal('');
      expect(option.warning).to.equal('newerVersion');
    });

    it('should set an older than recommended version as invalid', function() {
      installer.option['detected'].version = '1.4.0';
      installer.validateVersion();

      expect(option.valid).to.be.false;
      expect(option.error).to.equal('oldVersion');
    });
  });
});
