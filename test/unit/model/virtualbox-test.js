'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import VirtualBoxInstall from 'browser/model/virtualbox';
import {VirtualBoxInstallWindows} from 'browser/model/virtualbox';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import Util from 'browser/model/helpers/util';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
chai.use(sinonChai);

let child_process = require('child_process');

describe('Virtualbox installer', function() {
  let installerDataSvc, installer;
  let infoStub, errorStub, sandbox, sha256Stub;

  let downloadUrl = 'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe';
  let version = '5.1.12';
  let revision = '112440';
  let finalUrl = 'http://download.virtualbox.org/virtualbox/5.1.12/VirtualBox-5.1.12-112440-Win.exe';

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.virtualBoxDir.returns('installationFolder/virtualbox');

  let fakeProgress;

  let success = () => {};
  let failure = () => {};

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256', function(file, cb) { cb('hash'); });

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
    installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, 'virtualbox.exe', 'virtualbox', 'sha');
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new VirtualBoxInstall('ver', 'rev', installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new VirtualBoxInstall('ver', 'rev', installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download virtualbox installer to temporary folder with name configured file name', function() {
    expect(new VirtualBoxInstall('ver', 'rev', installerDataSvc, 'url', 'virtualbox.exe', 'virtualbox', 'sha').downloadedFile).to.equal(
      path.join(installerDataSvc.tempDir(), 'virtualbox.exe'));
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

    it('should write the data into temp/virtualbox.exe', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'virtualbox.exe'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(finalUrl);
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {
    let downloadedFile = path.join('tempDirectory', 'virtualbox.exe');

    describe('on windows', function() {
      let installer;
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        installer = new VirtualBoxInstallWindows(version, revision, installerDataSvc, downloadUrl, 'virtualbox.exe', 'virtualbox', 'sha');
        installer.ipcRenderer = { on: function() {} };
      });

      it('should execute the silent extract', function() {
        sandbox.stub(child_process, 'execFile').yields('done');

        let data = [
          '--extract',
          '-path',
          installerDataSvc.tempDir(),
          '--silent'
        ];

        let spy = sandbox.spy(Installer.prototype, 'execFile');
        let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
        item2.setInstallComplete();
        item2.thenInstall(installer);
        installer.install(fakeProgress, success, failure);

        expect(spy).to.have.been.called;
        expect(spy).calledWith(downloadedFile, data);
      });

      it('setup should wait for all downloads to complete', function() {
        let helper = new Installer('virtualbox', fakeProgress);
        let spy = sandbox.spy(installer, 'installMsi');

        installerDataSvc.downloading = true;

        installer.configure(helper);

        expect(fakeProgress.setStatus).calledWith('Waiting for all downloads to finish');
        expect(spy).not.called;
      });

      describe('configure', function() {
        it('should call installMsi if all downloads have finished', function() {
          let helper = new Installer('virtualbox', fakeProgress);
          let spy = sandbox.spy(installer, 'installMsi');
          sandbox.stub(child_process, 'execFile').yields();

          installerDataSvc.downloading = false;

          installer.configure(helper);
          expect(spy).calledOnce;
        });
      });

      describe('installMsi', function() {
        let helper, resolve, reject;

        beforeEach(function() {
          helper = new Installer('virtualbox', fakeProgress, success, failure);
          sandbox.stub(child_process, 'execFile').yields();
          resolve = (argument) => { Promise.resolve(argument); };
          reject = (argument) => { Promise.reject(argument); };
        });

        it('should set progress to "Installing"', function() {
          installer.installMsi(helper, resolve, reject);

          expect(fakeProgress.setStatus).to.have.been.calledOnce;
          expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
        });

        it('should execute the msi installer', function() {
          let spy = sandbox.spy(Installer.prototype, 'execFile');

          let msiFile = path.join(installerDataSvc.tempDir(), 'VirtualBox-' + version + '-r' + revision + '-MultiArch_amd64.msi');
          let opts = [
            '/i',
            msiFile,
            'INSTALLDIR=' + installerDataSvc.virtualBoxDir(),
            'ADDLOCAL=VBoxApplication,VBoxNetwork,VBoxNetworkAdp',
            '/qn',
            '/norestart',
            '/Liwe',
            path.join(installerDataSvc.installDir(), 'vbox.log')
          ];

          installer.installMsi(helper, resolve, reject);

          expect(spy).to.have.been.calledOnce;
          expect(spy).to.have.been.calledWith('msiexec', opts);
        });
      });
    });

    it('should catch errors during the installation', function(done) {
      sandbox.stub(child_process, 'execFile').yields(new Error('critical error'));
      sandbox.stub(child_process, 'exec').yields(new Error('critical error'));
      let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);

      try {
        installer.install(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it('should skip installation when an existing version is used', function() {
      installer.selectedOption = 'detect';
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      let item2 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(spy).to.have.not.been.called;
    });
  });

  describe('detection', function() {
    let validateStub;

    beforeEach(function() {
      let stub = sandbox.stub(Util, 'executeCommand');
      if (process.platform === 'win32') {
        stub.onCall(0).resolves('%VBOX_INSTALL_PATH%');
        stub.onCall(1).resolves('folder/vbox');
        stub.onCall(2).resolves('5.0.26r1234');
      } else {
        stub.onCall(0).resolves('folder/vbox');
        stub.onCall(1).resolves('5.0.26r1234');
        sandbox.stub(Util, 'findText').resolves('dir=folder/vbox');
      }
      sandbox.stub(Util, 'folderContains').resolves('folder/vbox');
      validateStub = sandbox.stub(installer, 'validateVersion').returns();
    });

    it('should set virtualbox as detected in the appropriate folder when found', function(done) {
      return installer.detectExistingInstall(function() {
        expect(installer.option['detected'].location).to.equal('folder/vbox');
        done();
      });
    });

    it('should check the detected version', function(done) {
      return installer.detectExistingInstall(function() {
        expect(installer.option['detected'].version).to.equal('5.0.26');
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
      installer.addOption('detected', '', '', false);
      installer.selectedOption = 'detected';
      option = installer.option[installer.selectedOption];
    });

    it('should add warning for newer version', function() {
      installer.option['detected'].version = '5.1.99';
      installer.validateVersion();

      expect(option.error).to.equal('');
      expect(option.warning).to.equal('newerVersion');
      expect(option.valid).to.equal(true);
    });

    it('should add error for older version', function() {
      installer.option['detected'].version = '5.1.1';
      installer.validateVersion();

      expect(option.error).to.equal('oldVersion');
      expect(option.warning).to.equal('');
      expect(option.valid).to.equal(false);
    });

    it('should add neither warning nor error for recomended version', function() {
      installer.option['detected'].version = '5.1.12';
      installer.validateVersion();

      expect(option.error).to.equal('');
      expect(option.warning).to.equal('');
      expect(option.valid).to.equal(true);
    });
  });
});
