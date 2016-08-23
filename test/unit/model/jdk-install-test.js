'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs';
import path from 'path';
import JdkInstall from 'model/jdk-install';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
import rimraf from 'rimraf';
chai.use(sinonChai);

describe('JDK installer', function() {
  let installerDataSvc, sandbox, installer;
  let infoStub, errorStub;
  let downloadUrl = 'http://www.azulsystems.com/products/zulu/downloads';
  let fakeInstallable = {
    isInstalled: function() { return true; }
  };
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder' },
    jdkDir: function() { return 'install/jdk' },
    getInstallable: function(key) { return fakeInstallable; },
    getUsername: function() {},
    getPassword: function() {}
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.jdkDir.returns('install/jdk8');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('passwd');

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
      'tempDirectory' : {
        'jdk.msi': 'file content here',
        'test' : 'empty'
      },
      'installationFolder' : {
        'zulu': {}
      }
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
    sandbox = sinon.sandbox.create();
    installer = new JdkInstall(installerDataSvc, downloadUrl, null);
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download jdk when an installation exists', function() {
    let jdk = new JdkInstall(installerDataSvc, 'url', 'file');
    expect(jdk.useDownload).to.be.false;
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new JdkInstall(installerDataSvc, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new JdkInstall(installerDataSvc, null, '');
    }).to.throw('No download URL set');
  });

  it('should download jdk when no installation is found', function() {
    expect(new JdkInstall(installerDataSvc, 'url', null).useDownload).to.be.true;
  });

  it('should download jdk installer to temporary folder as jdk8.msi', function() {
    expect(new JdkInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
      path.join('tempDirectory', 'jdk.msi'));
  });

  describe('when downloading the jdk msi', function() {
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/jdk.msi', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'jdk.msi'));
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

  describe('when installing jdk', function() {
    let downloadedFile = path.join('tempDirectory', 'jdk.msi');

    it('should set progress to "Installing"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should remove an existing folder with the same name', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      let stub = sandbox.stub(rimraf, 'sync').returns();

      installer.install(fakeProgress, function() {}, function (err) {})

      expect(stub).calledOnce;
    });

    it('should call the installer with appropriate parameters', function() {
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.install(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith('msiexec', installer.createMsiExecParameters());
    });

    it('should catch errors during the installation', function(done) {
      sandbox.stub(require('child_process'), 'execFile').yields(new Error('critical error'));

      try {
        installer.install(fakeProgress, function() {}, function (err) {});
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });

    it('should skip the installation if it is not selected', function() {
      installer.selectedOption = 'do nothing';
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      let calls = 0;
      let succ = function() { return calls++; };

      installer.install(fakeProgress, succ, function (err) {});

      expect(spy).not.called;
      expect(calls).to.equal(1);
    });

    it('setup should call success callback', function() {
      let calls = 0;
      let succ = function() { return calls++; };

      installer.setup(fakeProgress, succ, function (err) {});

      expect(calls).to.equal(1);
    });

    describe('files manipulation', function() {
      let err = new Error('critical error');

      it('getFolderContents should list files in a folder', function() {
        let spy = sandbox.spy(fs, 'readdir');

        return installer.getFolderContents('tempDirectory')
        .then((files) => {
          expect(spy).calledOnce;
          expect(spy).calledWith('tempDirectory');
          expect(files).to.contain('jdk.msi');
        });
      });

      it('getFolderContents should reject on error', function() {
        let stub = sandbox.stub(fs, 'readdir').yields(err);

        return installer.getFolderContents('tempDirectory')
        .then((files) => {
          expect.fail('it did not reject');
        })
        .catch((error) => {
          expect(error).to.equal(err);
        });
      });

      it('getFileByName should return a filename from an array', function() {
        let files = ['abc', 'def', 'ghi'];

        return installer.getFileByName('de', files)
        .then((filename) => {
          expect(filename).to.equal('def');
        });
      });

      it('renameFile should rename a file with given path', function() {
        let spy = sandbox.spy(fs, 'rename');

        return installer.renameFile('tempDirectory', 'test', 'newName')
        .then((result) => {
          expect(result).to.be.true;
          expect(spy).calledOnce;
          expect(spy).calledWith(path.join('tempDirectory', 'test'), 'newName');
        });
      });

      it('renameFile should reject on error', function() {
        sandbox.stub(fs, 'rename').yields(err);

        return installer.renameFile('tempDirectory', 'test', 'newName')
        .then((result) => {
          expect.fail('it did not reject');
        })
        .catch((error) => {
          expect(error).to.equal(err);
        });
      });
    });
  });
});
