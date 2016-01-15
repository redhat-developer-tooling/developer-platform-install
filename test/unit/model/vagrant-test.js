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
chai.use(sinonChai);

describe('Vagrant installer', function() {
  let installerDataSvc;
  let infoStub, errorStub;
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder'; },
    vagrantDir: function() { return 'installationFolder/vagrant'; }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.vagrantDir.returns('installationFolder/vagrant');

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
    path.join(installerDataSvc.tempDir(), 'vagrant.zip'));
});

describe('when downloading the vagrant zip', function() {
  let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';

  it('should set progress to "Downloading"', function() {
    let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
    let spy = sinon.spy(fakeProgress, 'setStatus');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith('Downloading');

    spy.restore();
  });

  it('should write the data into temp/vagrant.zip', function() {
    let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
    let spy = sinon.spy(fs, 'createWriteStream');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'vagrant.zip'));

    spy.restore();
  });

  it('should call downloader#download with the specified parameters once', function() {
    let spy = sinon.spy(Downloader.prototype, 'download');
    let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(downloadUrl);

    spy.restore();
  });

  it('should fail with an invalid url', function(done) {
    let url = 'url';
    function failsWithInvalidUrl() {
      let installer = new VagrantInstall(installerDataSvc, 'url', null);
      installer.downloadInstaller(fakeProgress,
        function() { return success(); }, function() {});
      }
      expect(failsWithInvalidUrl).to.throw('Invalid URI "' + url + '"');
      done();
    });
  });

  describe('when installing vagrant', function() {
    let downloadedFile = path.join('tempDirectory', 'vagrant.zip');
    let downloadUrl = 'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip';

    it('should set progress to "Installing"', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let spy = sinon.spy(fakeProgress, 'setStatus');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');

      spy.restore();
    });

    it('should unzip the downloaded file into temporary folder', function() {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);

      let spy = sinon.spy(Installer.prototype, 'unzip');
      installer.install(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith(downloadedFile, installerDataSvc.tempDir());

      spy.restore();
    });

    it('should catch errors during the installation', function(done) {
      let installer = new VagrantInstall(installerDataSvc, downloadUrl, null);
      let stub = sinon.stub(require('unzip'), 'Extract');
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
