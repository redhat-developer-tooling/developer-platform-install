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
chai.use(sinonChai);

describe('JDK installer', function() {
  let DataStub, installerDataSvc;
  let infoStub, errorStub;
  let fakeData = {
    tempDir: function() { return 'tempDirectory'; },
    installDir: function() { return 'installationFolder' },
    jdkDir: function() { return 'install/jdk8' }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('tempDirectory');
  installerDataSvc.installDir.returns('installationFolder');
  installerDataSvc.jdkDir.returns('install/jdk8');

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
        'jdk.zip': 'file content here',
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
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
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

it('should download jdk installer to temporary folder as jdk8.zip', function() {
  expect(new JdkInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
    path.join('tempDirectory', 'jdk8.zip'));
});

describe('when downloading the jdk zip', function() {

  it('should set progress to "Downloading"', function() {
    let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fakeProgress, 'setStatus');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith('Downloading');

    spy.restore();
  });

  it('should write the data into temp/jdk8.zip', function() {
    let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fs, 'createWriteStream');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(path.join('tempDirectory', 'jdk8.zip'));

    spy.restore();
  });

  it('should call downloader#download with the specified parameters once', function() {
    let downloadUrl = 'http://www.azulsystems.com/products/zulu/downloads';
    let options = {
      url: downloadUrl,
      headers: {
        'Referer': 'http://www.azulsystems.com/products/zulu/downloads'
      }
    };
    let spy = sinon.spy(Downloader.prototype, 'download');
    let installer = new JdkInstall(installerDataSvc, downloadUrl, null);

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(options);

    spy.restore();
  });

  it('should fail with an invalid url', function(done) {
    let url = 'url';
    function failsWithInvalidUrl() {
      let installer = new JdkInstall(installerDataSvc, url, null);
      installer.downloadInstaller(fakeProgress,
        function() { return success(); }, function() {});
      }
      expect(failsWithInvalidUrl).to.throw('Invalid URI "' + url + '"');
      done();
    });
  });

  describe('when installing jdk', function() {
    let downloadedFile = path.join('tempDirectory', 'jdk8.zip');

    it('should set progress to "Installing"', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let spy = sinon.spy(fakeProgress, 'setStatus');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');

      spy.restore();
    });

    it('should unzip the downloaded file into install folder', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);

      let spy = sinon.spy(Installer.prototype, 'unzip');
      installer.install(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith(downloadedFile, installerDataSvc.installDir());

      spy.restore();
    });

    it('should catch errors during the installation', function(done) {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
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

    it('getFolderContents should list files in a folder', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let spy = sinon.spy(fs, 'readdir');

      return installer.getFolderContents('tempDirectory')
      .then((files) => {
        expect(spy).calledOnce;
        expect(spy).calledWith('tempDirectory');
        expect(files).to.contain('jdk.zip');
        spy.restore();
      });
    });

    it('getFolderContents should reject on error', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let err = new Error('critical error');
      let stub = sinon.stub(fs, 'readdir').throws(err);

      return installer.getFolderContents('tempDirectory')
      .then((files) => {
        expect.fail('it did not reject');
      })
      .catch((error) => {
        stub.restore();
        expect(error).to.equal(err);
      });
    });

    it('getFileByName should return a filename from an array', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let files = ['abc', 'def', 'ghi'];

      return installer.getFileByName('de', files)
      .then((filename) => {
        expect(filename).to.equal('def');
      });
    });

    it('renameFile should rename a file with given path', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let spy = sinon.spy(fs, 'rename');

      return installer.renameFile('tempDirectory', 'test', 'newName')
      .then((result) => {
        expect(result).to.be.true;
        expect(spy).calledOnce;
        expect(spy).calledWith(path.join('tempDirectory', 'test'), 'newName');
        spy.restore();
      });
    });
  });
});
