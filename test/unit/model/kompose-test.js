'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import path from 'path';
import KomposeInstall from 'browser/model/kompose';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import Platform from 'browser/services/platform';
import loadMetadata from 'browser/services/metadata';
import Logger from 'browser/services/logger';
import mockfs from 'mock-fs';
chai.use(sinonChai);

let sinon  = require('sinon');


describe('kompose installer', function() {

  let sandbox, installerDataSvc;
  let infoStub, errorStub, sha256Stub;
  let fakeProgress;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('temporaryFolder');
  installerDataSvc.installDir.returns('installFolder');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('password');
  installerDataSvc.komposeDir.returns(path.join(installerDataSvc.installDir(), 'kompose'));
  installerDataSvc.localAppData.restore();

  let installer;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256').callsFake(function(file, cb) { cb('hash'); });

    mockfs({
      temporaryFolder: {},
      installFolder: {}
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

  let reqs = loadMetadata(require('../../../requirements.json'), process.platform);
  let komposeUrl = reqs['kompose'].url;
  let success = () => {};
  let failure = () => {};

  beforeEach(function () {
    installer = new KomposeInstall(installerDataSvc, 'folderName', komposeUrl, 'kompose.exe', 'sha1');
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when some download url is not set and installed file not defined', function() {
    expect(function() {
      new KomposeInstall(installerDataSvc, 'folderName', null, 'installFile', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new KomposeInstall(installerDataSvc, 'folderName', null, 'installFile', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should download files when no installation is found', function() {
    expect(new KomposeInstall(installerDataSvc, 'komposeUrl', 'installFile', 'folderName', 'sha1').useDownload).to.be.true;
  });

  describe('files download', function() {
    let authStub;

    beforeEach(function() {
      authStub = sandbox.stub(Downloader.prototype, 'download').returns();
    });

    it('should set progress to "Downloading"', function() {
      installer.downloadInstaller(fakeProgress, success, failure);
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp folder', function() {
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');
      let fsSpy = sandbox.spy(fs, 'createWriteStream');
      installer.downloadInstaller(fakeProgress, success, failure);
      expect(streamSpy.callCount).to.equal(1);
      expect(fsSpy.callCount).to.equal(1);
      expect(fsSpy).calledWith(installer.downloadedFile);
    });

    it('should skip download when the files are located in downloads folder', function() {
      let spy = sandbox.spy(Downloader.prototype, 'closeHandler');
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(authStub).not.called;
      expect(spy.callCount).to.equal(1);
    });
  });

  describe('installAfterRequirements', function() {
    let stubCopy;

    beforeEach(function() {
      stubCopy = sandbox.stub(Installer.prototype, 'copyFile').resolves();
      sandbox.stub(Platform, 'addToUserPath').resolves();
      sandbox.stub(Platform, 'makeFileExecutable').resolves();
    });

    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, success, failure);
      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Installing');
    });

    it('should fail for kompose file without known extension', function() {
      installer = new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', komposeUrl, 'kompose.aaa', 'sha1');
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      return new Promise((resolve, reject)=> {
        installer.installAfterRequirements(fakeProgress, resolve, reject);
      }).catch(()=> {
        expect(stubCopy).to.have.been.not.called;
      });
    });

    it('should call Installer.fail() if kmpose installation failed', function() {
      installer = new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', komposeUrl, 'kompose.aaa', 'sha1');
      Installer.prototype.copyFile.restore();
      sandbox.stub(Installer.prototype, 'copyFile').throws('error');
      sandbox.spy(Installer.prototype, 'fail');
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      return new Promise((resolve, reject)=> {
        installer.installAfterRequirements(fakeProgress, resolve, reject);
      }).catch(()=> {
        expect(Installer.prototype.fail).calledOnce;
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should copy kompose exe file to install folder', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=> {
          expect(stubCopy).to.have.been.called;
          expect(stubCopy).calledWith(installer.downloadedFile, path.join(installer.installerDataSvc.komposeDir(), 'kompose.exe'));
        }).catch((error) => {
          throw error;
        });
      });
    });

    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });

      it('should copy kompose file without extension to install folder', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=> {
          expect(stubCopy).to.have.been.called;
          expect(stubCopy).calledWith(installer.downloadedFile, path.join(installerDataSvc.komposeDir(), 'kompose'));
        }).catch((error) => {
          throw error;
        });
      });
    });
  });
});
