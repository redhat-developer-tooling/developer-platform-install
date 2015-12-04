'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import JdkInstall from 'model/jdk-install';
chai.use(sinonChai);

let sinon = require('sinon');
let mock = require('mock-fs');
let request = require('request')
let fs = require('fs');

describe('JDK installer', function() {
  let sandbox, fakeProgress, DataStub, stub;
  let fakeData = {
    tempDir: function() { return 'temp'; },
    installDir: function() { return 'install' },
    jdkDir: function() { return 'install/JDK8' }
  };

  stub = sinon.stub(fakeData);
  stub.tempDir.returns('temp');
  stub.installDir.returns('install');
  stub.jdkDir.returns('install/JDK8')

  before(function() {
    mock({
      'temp': {
        'jdk.zip': 'file content here',
      },
      'install': {
        'zulu' : {}
      }
    });
  });

  after(function() {
    mock.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();

    fakeProgress = { setDesc: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {}
  };
});

afterEach(function () {
  sandbox.restore();
});

it('should not download jdk when an installation exists', function() {
  let jdk = new JdkInstall(stub, 'url', 'file');
  expect(jdk.useDownload).to.be.false;
});

it('should fail when no url is set and installed file not defined', function() {
  expect(function() {
    new JdkInstall(stub, null, null);
  }).to.throw('No download URL set');
});

it('should fail when no url is set and installed file is empty', function() {
  expect(function() {
    new JdkInstall(stub, null, '');
  }).to.throw('No download URL set');
});

it('should download jdk when no installation is found', function() {
  expect(new JdkInstall(stub, 'url', null).useDownload).to.equal(true);
});

it('should download jdk installer to temporary folder as jdk8.zip', function() {
  expect(new JdkInstall(stub, 'url', null).downloadedFile).to.equal('temp/jdk8.zip');
});

describe('when downloading the jdk zip', function() {

  it('should set progress to "Downloading JDK 8"', function(done) {
    let installer = new JdkInstall(stub, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fakeProgress, 'setDesc');
    installer.downloadInstaller(fakeProgress, function() {}, function() {});
    expect(spy.withArgs('Downloading JDK 8')).called.once;
    done();
  });

  it('should write the data into temp/jdk8.zip', function(done) {
    let installer = new JdkInstall(stub, 'http://www.azulsystems.com/products/zulu/downloads', null);
    let spy = sinon.spy(fs, 'createWriteStream');
    installer.downloadInstaller(fakeProgress, function() {}, function() {});
    expect(spy.withArgs('temp/jdk8.zip')).called.once;
    done();
  });

  it('should call a GET request with the specified parameters once', function(done) {
    let downloadUrl = 'http://www.azulsystems.com/products/zulu/downloads';
    let options = {
      url: downloadUrl,
      headers: {
        'Referer': 'http://www.azulsystems.com/products/zulu/downloads'
      }
    };
    let spy = sinon.spy(request, 'get');
    let installer = new JdkInstall(stub, downloadUrl, null);
    installer.downloadInstaller(fakeProgress, function() {}, function() {});
    expect(spy.withArgs(options)).called.once;
    spy.restore();
    done();
  });

  it('should fail with an invalid url', function(done) {
    let url = 'url';
    function failsWithInvalidUrl() {
      let installer = new JdkInstall(stub, url, null);
      installer.downloadInstaller(fakeProgress,
        function() { return success(); }, function() {});
      }
      expect(failsWithInvalidUrl).to.throw('Invalid URI "' + url + '"');
      done();
    });
  });

  describe('when installing jdk', function() {

    it('should set progress to "Installing JDK 8"', function(done) {
      let installer = new JdkInstall(stub, 'http://www.azulsystems.com/products/zulu/downloads', null);
      let spy = sinon.spy(fakeProgress, 'setDesc');
      installer.install(fakeProgress, null, null);
      expect(spy.withArgs('Installing JDK 8')).called.once;
      done();
    });

    it('should load the downloaded installer file', function(done) {
      let installer = new JdkInstall(stub, 'url', null);
      let spy = sinon.spy(fs, 'createReadStream');
      installer.install(fakeProgress, null, null);
      expect(spy.withArgs('temp/jdk8.zip')).called.once;
      done();
    });

    it('should fail when install directory is null', function(done) {
      let installer = new JdkInstall(stub, 'url', 'file');

      function throwsWithNull() {
        stub.installDir.returns(null);
        installer.install(fakeProgress, null, null);
      }
      expect(throwsWithNull).to.throw('Object [object global] has no method');
      done();
    });

    it('should fail when install directory is empty', function(done) {
      let installer = new JdkInstall(stub, 'url', 'file');
      function throwsWithEmpty() {
        stub.installDir.returns('');
        installer.install(fakeProgress, null, null);
      }
      expect(throwsWithEmpty).to.throw('Object [object global] has no method');
      done();
    });
  });
});
