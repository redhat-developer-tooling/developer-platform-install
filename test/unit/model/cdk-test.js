'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import path from 'path';
import CDKInstall from 'browser/model/cdk';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import 'sinon-as-promised';
import Platform from 'browser/services/platform';

chai.use(sinonChai);

let sinon  = require('sinon');

describe('CDK installer', function() {
  let sandbox, installerDataSvc;
  let infoStub, errorStub, sha256Stub;

  let fakeProgress;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('temporaryFolder');
  installerDataSvc.installDir.returns('installFolder');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('password');
  installerDataSvc.cdkDir.returns(path.join(installerDataSvc.installDir(), 'cdk'));
  installerDataSvc.ocDir.returns(path.join(installerDataSvc.cdkDir(), 'bin'));
  installerDataSvc.virtualBoxDir.returns(path.join(installerDataSvc.installDir(), 'virtualbox'));
  installerDataSvc.cdkBoxDir.returns(installerDataSvc.cdkDir());
  installerDataSvc.cdkMarker.returns(path.join(installerDataSvc.cdkDir(), '.cdk'));

  let installer;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256', function(file, cb) { cb('hash'); });

    mockfs({
      temporaryFolder: {},
      installFolder: {
        cdk: {
          plugins : {
            'some-file.gem': 'file content here'
          }
        }
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
    sha256Stub.restore();
  });

  let reqs = require(path.resolve('./requirements-' + process.platform + '.json'));

  let cdkUrl = reqs['cdk'].url;

  let success = () => {};
  let failure = () => {};

  beforeEach(function () {
    installer = new CDKInstall(installerDataSvc, 900, cdkUrl, 'installFile.zip', 'folderName', 'sha1');
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when some download url is not set and installed file not defined', function() {
    expect(function() {
      new CDKInstall(installerDataSvc, 900, null, 'installFile', 'folderName', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new CDKInstall(installerDataSvc, 900, null, 'installFile', 'folderName', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should download files when no installation is found', function() {
    expect(new CDKInstall(installerDataSvc, 900, 'cdkUrl', 'installFile', 'folderName', 'sha1').useDownload).to.be.true;
  });

  describe('files download', function() {
    let authStub;

    beforeEach(function() {
      authStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp folder', function() {
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');
      let fsSpy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      //expect 3 streams to be set and created
      expect(streamSpy.callCount).to.equal(1);
      expect(fsSpy.callCount).to.equal(1);
      expect(fsSpy).calledWith(installer.downloadedFile);
    });

    it('should call a correct downloader request for cdk file', function() {
      installer = new CDKInstall(installerDataSvc, 900, cdkUrl, 'installFile', 'folderName',  'sha1');
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(authStub.callCount).to.equal(1);
      expect(authStub).calledWith(cdkUrl, installerDataSvc.getUsername(), installerDataSvc.getPassword());
    });

    it('should skip download when the files are located in downloads folder', function() {
      let spy = sandbox.spy(Downloader.prototype, 'closeHandler');
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(authStub).not.called;
      expect(spy.callCount).to.equal(1);
    });
  });

  describe('installation', function() {

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'unzip').rejects('done');

      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Installing');
    });

    it('should extract cdk archive to install folder', function(done) {
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      let stub = sandbox.stub(Installer.prototype, 'unzip').rejects('done');
      installer.installAfterRequirements(fakeProgress, success, function failure() {
        expect(stub).to.have.been.called;
        expect(stub).calledWith(installer.downloadedFile, installerDataSvc.ocDir());
        done();
      });
    });

    it('should fail for cdk file without known extension', function(done) {
      installer = new CDKInstall(installerDataSvc, 900, cdkUrl, 'installFile.aaa', 'folderName', 'sha1');
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      let stubCopy = sandbox.stub(Installer.prototype, 'copyFile');
      let stubUnzip = sandbox.stub(Installer.prototype, 'unzip');
      installer.installAfterRequirements(fakeProgress, success, function failure() {
        expect(stubCopy).to.have.been.not.called;
        expect(stubUnzip).to.have.been.not.called;
        done();
      });
    });

    describe('on windows', function() {
      it('should copy cdk exe file to install folder', function(done) {
        sandbox.stub(Platform, 'getOS').returns('win32');
        installer = new CDKInstall(installerDataSvc, 900, cdkUrl, 'installFile.exe', 'folderName', 'sha1');
        sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
        let stub = sandbox.stub(Installer.prototype, 'copyFile').rejects('done');
        installer.installAfterRequirements(fakeProgress, success, function failure() {
          expect(stub).to.have.been.called;
          expect(stub).calledWith(installer.downloadedFile, path.join(installerDataSvc.ocDir(), 'minishift.exe'));
          done();
        });
      });
    });

    describe('on macos', function() {
      it('should copy cdk file without extension to install folder', function(done) {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        installer = new CDKInstall(installerDataSvc, 900, cdkUrl, 'installFile', 'folderName', 'sha1');
        sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
        let stub = sandbox.stub(Installer.prototype, 'copyFile').rejects('done');
        installer.installAfterRequirements(fakeProgress, success, function failure() {
          expect(stub).to.have.been.called;
          expect(stub).calledWith(installer.downloadedFile, path.join(installerDataSvc.ocDir(), 'minishift'));
          done();
        });
      });
    });
  });
});
