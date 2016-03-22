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
let child_process = require('child_process');
chai.use(sinonChai);

describe('Vagrant installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox;
  let fakeInstallable = {
    isInstalled: function() { return true; }
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
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download vagrant when an installation exists', function() {
    let jdk = new VagrantInstall(installerDataSvc, 'url', 'file');
    expect(jdk.useDownload).to.be.false;
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

  describe('when downloading the vagrant zip', function() {
    let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';
    let downloadStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/vagrant.zip', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'vagrant.msi'));
    });

    it('should call downloader#download with the specified parameters once', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).to.have.been.calledOnce;
      expect(downloadStub).to.have.been.calledWith(downloadUrl);
    });
  });

  describe('when installing vagrant', function() {
    let downloadedFile = path.join('tempDirectory', 'vagrant.zip');
    let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';

    it('should set progress to "Installing"', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.postCygwinInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should exec the downloaded file with temporary folder as target destination', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(child_process, 'execFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'execFile');
      installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith('msiexec', ['/i', path.join('tempDirectory','vagrant.msi'), 'VAGRANTAPPDIR=' + path.join('installationFolder','vagrant'), '/qb!', '/norestart', '/Liwe', path.join('installationFolder','vagrant.log')]);
    });

    it('should catch errors during the installation', function(done) {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let stub = sandbox.stub(require('unzip'), 'Extract');
      stub.throws(new Error('critical error'));

      try {
        installer.postCygwinInstall(fakeProgress, function() {}, function (err) {});
        done();
      } catch (error) {
        expect.fail('it did not catch the error');
      }
    });
  });
});
