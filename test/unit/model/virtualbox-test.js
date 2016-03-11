'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import request from 'request';
import fs from 'fs';
import path from 'path';
import VirtualBoxInstall from 'model/virtualbox';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
chai.use(sinonChai);

let child_process = require('child_process');

describe('Virtualbox installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox;
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    virtualBoxDir: function() { return 'installationFolder/virtualbox'; }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.virtualBoxDir.returns('installationFolder/virtualbox');

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
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download virtualbox when an installation exists', function() {
    let jdk = new VirtualBoxInstall('ver', 'rev', installerDataSvc, 'url', 'file');
    expect(jdk.useDownload).to.be.false;
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

  it('should download virtualbox when no installation is found', function() {
    expect(new VirtualBoxInstall('ver', 'rev', installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download virtualbox installer to temporary folder as virtualBox-ver.exe', function() {
    expect(new VirtualBoxInstall('ver', 'rev', installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join(installerDataSvc.tempDir(), 'virtualBox-ver.exe'));
  });

  describe('when downloading the virtualbox installer', function() {
    let downloadUrl = 'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
        version = '5.0.8',
        revision = '103449',
        finalUrl = 'http://download.virtualbox.org/virtualbox/5.0.8/VirtualBox-5.0.8-103449-Win.exe';
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/virtualBox-version.exe', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'virtualBox-' + version + '.exe'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(finalUrl);
    });
  });

  describe('when installing virtualbox', function() {
    let downloadedFile = path.join('tempDirectory', 'virtualBox-5.0.8.exe');
    let downloadUrl = 'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe',
        version = '5.0.8',
        revision = '103449',
        finalUrl = 'http://download.virtualbox.org/virtualbox/5.0.8/VirtualBox-5.0.8-103449-Win.exe';

    it('should execute the silent extract', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(child_process, 'execFile').yields();
      installerDataSvc.downloading = true;

      let data = [
        '--extract',
        '-path',
        installerDataSvc.tempDir(),
        '--silent'
      ];

      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.install(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith(downloadedFile, data);
    });

    it('setup should wait for all downloads to complete', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(installer, 'installMsi');
      let progressSpy = sandbox.spy(fakeProgress, 'setStatus');

      installerDataSvc.downloading = true;

      installer.setup(fakeProgress, () => {}, () => {});

      expect(progressSpy).calledWith('Waiting for all downloads to finish');
      expect(spy).not.called;
    });

    it('setup should call installMsi if all downloads have finished', function() {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let helper = new Installer('virtualbox', fakeProgress);
      let spy = sandbox.stub(installer, 'installMsi');
      sandbox.stub(child_process, 'execFile').yields();

      installerDataSvc.downloading = false;

      installer.setup(fakeProgress, () => {}, () => {});
      expect(spy).calledOnce;
    });

    it('installMsi should set progress to "Installing"', function() {
      //node-windows can only be used on windows
      if(process.platform === 'win32') {
        sandbox.stub(require('node-windows'), 'elevate').yields();
      }

      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      try {
        installer.installMsi(fakeProgress, () => {}, () => {});
      } catch (err) {
        if (err.message.indexOf('node-windows') < 0) {
          throw err;
        }
      } finally {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith('Installing');
      }
    });

    it('installMsi should execute the msi installer', function() {
      //node-windows can only be used on windows
      if(process.platform !== 'win32') {
        return;
      }

      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(require('node-windows'), 'elevate').yields();
      let spy = sandbox.spy(installer, 'installMsi');

      let msiFile = path.join(installerDataSvc.tempDir(), '/VirtualBox-' + version + '-r' + revision + '-MultiArch_amd64.msi');

      let cmd = 'msiexec /qn /i ' + msiFile + ' /norestart';
      cmd += ' INSTALLDIR=' + installerDataSvc.virtualBoxDir();
      cmd += ' /log ' + path.join(installerDataSvc.installDir(), 'vbox.log');

      installerDataSvc.downloading = false;

      return installer.setup(fakeProgress).then((result) => {
        expect(spy).to.have.been.calledOnce;
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(cmd);
      });
    });

    it('should catch errors during the installation', function(done) {
      let installer = new VirtualBoxInstall(version, revision, installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(child_process, 'exec');
      stub.throws(new Error('critical error'));

      try {
        installer.install(fakeProgress, function() {}, function (err) {});
        stub.restore();
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });
  });
});
