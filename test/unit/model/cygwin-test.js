'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import CygwinInstall from 'browser/model/cygwin';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import InstallerDataService from 'browser/services/data';
import child_process from 'child_process';
import {ProgressState} from 'browser/pages/install/controller';
chai.use(sinonChai);

describe('Cygwin installer', function() {
  let installerDataSvc, sandbox, installer;
  let infoStub, errorStub, sha256Stub;
  let downloadUrl = 'https://cygwin.com/setup-x86_64.exe';
  let fakeInstallable = {
    isInstalled: function() { return false; }
  };

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.getInstallable.returns(fakeInstallable);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.cygwinDir.returns('install/Cygwin');
  installerDataSvc.getInstallable.returns(fakeInstallable);

  let fakeProgress;

  let success = () => {};
  let failure = () => {};

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype,'SHA256', function(file,cb) {
      cb('hash');
    });

    mockfs({
      tempDirectory: {},
      installationFolder: {}
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
    installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download cygwin when an installation exists', function() {
    let cygwin = new CygwinInstall(installerDataSvc, 'url', 'file');
    expect(cygwin.useDownload).to.be.false;
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new CygwinInstall(installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new CygwinInstall(installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download cygwin when no installation is found', function() {
    expect(new CygwinInstall(installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download cygwin installer to temporary folder as ssh-rsync.zip', function() {
    expect(new CygwinInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join('tempDirectory', 'cygwin.exe'));
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

    it('should write the data into temp/cygwin.exe', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(streamSpy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'cygwin.exe'));
    });

    it('should call a correct downloader request with the specified parameters once', function() {
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

    it('should not start until virtualbox has finished installing', function() {
      let installSpy = sandbox.spy(installer, 'postVirtualboxInstall');
      let item2 = new InstallableItem('virtualbox', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.thenInstall(installer);

      installer.install(fakeProgress, success, failure);

      expect(installSpy).not.called;
      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Waiting for Oracle VirtualBox to finish installation');
    });

    it('should install once virtualbox has finished', function() {
      let stub = sandbox.stub(installer, 'postVirtualboxInstall').returns();
      sandbox.stub(fakeInstallable, 'isInstalled').returns(true);
      let item2 = new InstallableItem('virtualbox', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'execFile').rejects('done');

      installer.postVirtualboxInstall(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should run the installer with correct parameters', function() {
      sandbox.stub(child_process, 'execFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'execFile');

      installer.postVirtualboxInstall(fakeProgress, success, failure);

      expect(spy).to.have.been.calledWith(installer.downloadedFile,
        ['--no-admin', '--quiet-mode', '--only-site', '-l',
          path.join(installerDataSvc.cygwinDir(),'packages'),
          '--site', 'http://mirrors.xmission.com/cygwin',
          '--root', 'install/Cygwin', '--categories', 'Base',
          '--packages', 'openssh,rsync']);
    });

    it('should catch errors thrown during the installation', function(done) {
      let err = new Error('critical error');
      sandbox.stub(child_process, 'execFile').yields(err);

      try {
        installer.postVirtualboxInstall(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('It did not catch the error');
      }
    });
  });
});
