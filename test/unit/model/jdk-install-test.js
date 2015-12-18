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
chai.use(sinonChai);

describe('JDK installer', function() {
  let sandbox, fakeProgress, DataStub, installerDataSvc;
  let fakeData = {
    tempDir: function() { return 'temp'; },
    installDir: function() { return 'install' },
    jdkDir: function() { return 'install/JDK8' }
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('temp');
  installerDataSvc.installDir.returns('install');
  installerDataSvc.jdkDir.returns('install/JDK8')

  before(function() {
    mockfs({
      'temp': {
        'jdk.zip': 'file content here',
      },
      'install': {
        'zulu' : {}
      }
    });
  });

  after(function() {
    mockfs.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    fakeProgress = {
      setStatus: function (desc) { return; },
      setCurrent: function (val) {},
      setLabel: function (label) {}
    };

    sandbox.stub(Logger, 'info');
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

it('should download jdk installer to temporary folder as jdk8.zip', function() {
  expect(new JdkInstall(installerDataSvc, 'url', null).downloadedFile).to.equal(
    path.join('temp', 'jdk8.zip'));
});

describe('when downloading the jdk zip', function() {

  it('should set progress to "Downloading"', function() {
    let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fakeProgress, 'setStatus');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith('Downloading');
  });

  it('should write the data into temp/jdk8.zip', function() {
    let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fs, 'createWriteStream');

    installer.downloadInstaller(fakeProgress, function() {}, function() {});

    expect(spy).to.have.been.calledOnce;
    expect(spy).to.have.been.calledWith(path.join('temp', 'jdk8.zip'));
  });

  it('should call a GET request with the specified parameters once', function() {
    let downloadUrl = 'http://www.azulsystems.com/products/zulu/downloads';
    let options = {
      url: downloadUrl,
      headers: {
        'Referer': 'http://www.azulsystems.com/products/zulu/downloads'
      }
    };
    let spy = sinon.spy(request, 'get');
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

    it('should set progress to "Installing"', function() {
      let installer = new JdkInstall(installerDataSvc, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let spy = sinon.spy(fakeProgress, 'setStatus');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should load the downloaded installer file', function() {
      let installer = new JdkInstall(installerDataSvc, 'url', null);
      let spy = sinon.spy(fs, 'createReadStream');

      installer.install(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(path.join('temp', 'jdk8.zip'));
    });

    it('should fail when install directory is null', function() {
      let installer = new JdkInstall(installerDataSvc, 'url', 'file');

      function throwsWithNull() {
        stub.installDir.returns(null);
        installer.install(fakeProgress, null, null);
      }
      expect(throwsWithNull).to.throw();
    });

    it('should fail when install directory is empty', function() {
      let installer = new JdkInstall(installerDataSvc, 'url', 'file');
      function throwsWithEmpty() {
        stub.installDir.returns('');
        installer.install(fakeProgress, null, null);
      }
      expect(throwsWithEmpty).to.throw();
    });
  });
});
