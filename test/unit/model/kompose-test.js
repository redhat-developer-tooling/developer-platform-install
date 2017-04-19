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
import 'sinon-as-promised';
import Platform from 'browser/services/platform';
import InstallableItem from 'browser/model/installable-item';
import child_process from 'child_process';
import loadMetadata from 'browser/services/metadata';
chai.use(sinonChai);

let sinon  = require('sinon');


describe('kompose installer', function() {

  let sandbox, installerDataSvc;
  let sha256Stub;
  let fakeProgress;

  installerDataSvc = sinon.stub(new InstallerDataService());
  installerDataSvc.getRequirementByName.restore();
  installerDataSvc.tempDir.returns('temporaryFolder');
  installerDataSvc.installDir.returns('installFolder');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('password');
  installerDataSvc.komposeDir.returns(path.join(installerDataSvc.installDir(), 'kompose'));

  let installer;

  before(function() {
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256', function(file, cb) { cb('hash'); });
  });

  after(function() {
    sha256Stub.restore();
  });

  let reqs = loadMetadata(require('../../../requirements.json'), process.platform);
  let komposeUrl = reqs['kompose'].url;
  let success = () => {};
  let failure = () => {};

  beforeEach(function () {
    installer = new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', komposeUrl, 'kompose.exe', 'sha1');
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when some download url is not set and installed file not defined', function() {
    expect(function() {
      new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', null, 'installFile', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', null, 'installFile', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should download files when no installation is found', function() {
    expect(new KomposeInstall(installerDataSvc, 'komposeUrl', 'installFile', 'folderName', 'sha1').useDownload).to.be.true;
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
    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, success, failure);
      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Installing');
    });

    it('should fail for kompose file without known extension', function() {
      installer = new KomposeInstall(installerDataSvc, 'folderName', '0.4.0', komposeUrl, 'kompose.aaa', 'sha1');
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      let stubCopy = sandbox.stub(Installer.prototype, 'copyFile');
      return new Promise((resolve, reject)=> {
        installer.installAfterRequirements(fakeProgress, resolve, reject);
      }).catch(()=> {
        expect(stubCopy).to.have.been.not.called;
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        sandbox.stub(Installer.prototype, 'copyFile').resolves();
        sandbox.stub(Platform, 'addToUserPath').resolves();
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should copy kompose exe file to install folder', function() {
        installer.installAfterRequirements(fakeProgress, function success() {
          expect(Installer.prototype.copyFile).to.have.been.called;
          expect(Installer.prototype.copyFile).calledWith(installer.downloadedFile, path.join(installer.installerDataSvc.komposeDir(), 'kompose.exe'));
        }, function failure(e) {
          expect.fail();
        });
      });
    });

    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(Installer.prototype, 'copyFile').resolves();
        sandbox.stub(Platform, 'addToUserPath').resolves();
      });

      afterEach(function() {
        sandbox.restore();
      });

      it('should copy kompose file without extension to install folder', function(done) {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
          done();
        }).catch(()=> {
          expect(Installer.prototype.copyFile).to.have.been.called;
          expect(Installer.prototype.copyFile).calledWith(installer.downloadedFile, path.join(installerDataSvc.komposeDir(), 'kompose'));
        });
      });
    });
  });
});
