'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import VagrantInstall from 'browser/model/vagrant';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import Util from 'browser/model/helpers/util';
import InstallerDataService from 'browser/services/data';
import child_process from 'child_process';
import {ProgressState} from 'browser/pages/install/controller';
chai.use(sinonChai);

describe('Vagrant installer', function() {
  let installer;
  let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';
  let installerDataSvc;
  let infoStub, errorStub, sandbox, sha256Stub;
  let fakeInstallable = {
    isInstalled: function() { return false; }
  };

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.vagrantDir.returns(path.join('installationFolder','vagrant'));
  installerDataSvc.getInstallable.returns(fakeInstallable);

  let fakeProgress;

  let success = () => {};
  let failure = () => {};

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype,'SHA256', function(file,cb) {cb('hash');});

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
    sha256Stub.restore();
  });

  beforeEach(function () {
    installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
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
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/vagrant.zip', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'vagrant.msi'));
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

  describe('installation', function() {

    it('should not start until Cygwin has finished installing', function() {
      let installSpy = sandbox.spy(installer, 'postCygwinInstall');
      let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.thenInstall(installer);

      installer.install(fakeProgress, success, failure);

      expect(installSpy).not.called;
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Waiting for Cygwin to finish installation');
    });

    it('should install once Cygwin has finished', function() {
      let stub = sandbox.stub(installer, 'postCygwinInstall').returns();
      sandbox.stub(fakeInstallable, 'isInstalled').returns(true);
      let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);

      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'execFile').rejects('done');

      installer.postCygwinInstall(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should exec the downloaded file with temporary folder as target destination', function() {
      sandbox.stub(child_process, 'execFile').yields('done');
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.postCygwinInstall(fakeProgress, success, failure);

      expect(spy).to.have.been.called;
      expect(spy).calledWith('msiexec', [
        '/i', path.join('tempDirectory','vagrant.msi'),
        'VAGRANTAPPDIR=' + path.join('installationFolder','vagrant'), '/qn', '/norestart', '/Liwe',
        path.join('installationFolder','vagrant.log')]);
    });

    it('should catch errors during the installation', function(done) {
      sandbox.stub(require('unzip'), 'Extract').throws(new Error('critical error'));

      try {
        installer.postCygwinInstall(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it('should skip the installation if it is not selected', function() {
      let helper = new Installer('vagrant', fakeProgress, success, failure);
      installer.selectedOption = 'do nothing';
      let spy = sandbox.spy(helper, 'execFile');
      let calls = 0;
      let succ = function() { return calls++; };

      installer.postCygwinInstall(fakeProgress, succ, failure);

      expect(spy).not.called;
      expect(calls).to.equal(1);
    });
  });

  describe('setup', function() {
    it('should set progress to "setting up"', function() {
      sandbox.stub(Installer.prototype, 'writeFile').rejects('done');
      installer.setup(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Setting up');
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
      return installer.detectExistingInstall(function() {
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
    });

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
