'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs';
import path from 'path';
import CygwinInstall from 'model/cygwin';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
chai.use(sinonChai);

describe('Cygwin installer', function() {
  let DataStub, installerDataSvc;
  let infoStub, errorStub;
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    cygwinDir: function() { return 'install/Cygwin'; }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.cygwinDir.returns('install/Cygwin');

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
      tempDirectory : { 'testFile': 'file content here' },
      installationFolder : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
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

  it('should download cygwin installer to temporary folder as cygwin.exe', function() {
    expect(new CygwinInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join('tempDirectory', 'cygwin.exe'));
  });

  describe('when downloading cygwin', function() {
    let downloadUrl = 'https://cygwin.com/setup-x86_64.exe';

    it('should set progress to "Downloading"', function() {
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
      let spy = sinon.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');

      spy.restore();
    });

    it('should write the data into temp/cygwin.exe', function() {
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
      let spy = sinon.spy(fs, 'createWriteStream');
      let streamSpy = sinon.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(streamSpy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'cygwin.exe'));

      streamSpy.restore();
      spy.restore();
    });

    it('should call a correct downloader request with the specified parameters once', function() {
      let spy = sinon.spy(Downloader.prototype, 'download');
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(downloadUrl);

      spy.restore();
    });

    it('should fail with an invalid url', function(done) {
      let url = 'url';
      function failsWithInvalidUrl() {
        let installer = new CygwinInstall(installerDataSvc, url, null);
        installer.downloadInstaller(fakeProgress,
          function() { return success(); }, function() {});
      }
      expect(failsWithInvalidUrl).to.throw('Invalid URI "' + url + '"');
      done();
    });
  });

  describe('when installing', function() {
    let downloadUrl = 'https://cygwin.com/setup-x86_64.exe';
    let downloadedFile = path.join(installerDataSvc.tempDir(), 'cygwin.exe');

    it('should set progress to "Installing"', function() {
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
      let spy = sinon.spy(fakeProgress, 'setStatus');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');

      spy.restore();
    });

    it('should execute the installer with correct parameters', function() {
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
      let stub = sinon.stub(require('child_process'), 'execFile');
      stub.yields();
      let spy = sinon.spy(Installer.prototype, 'execFile');

      let opts = [
        '--no-admin',
        '--quiet-mode',
        '--only-site',
        '--site',
        'http://mirrors.kernel.org/sourceware/cygwin',
        '--root',
        installerDataSvc.cygwinDir(),
        '--categories',
        'Base',
        '--packages',
        'openssh,rsync'
      ];

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledWith(downloadedFile, opts);
      spy.restore();
      stub.restore();
    });

    it('should catch errors thrown during the installation', function(done) {
      let installer = new CygwinInstall(installerDataSvc, downloadUrl, null);
      let stub = sinon.stub(require('child_process'), 'execFile');
      let err = new Error('critical error');
      stub.throws(err);

      try {
        installer.install(fakeProgress, null, null);
        stub.restore();
        done();
      } catch (error) {
        expect.fail('It did not catch the error');
      }
    });
  });
});
