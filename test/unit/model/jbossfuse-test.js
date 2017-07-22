'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import mockfs from 'mock-fs';
import path from 'path';
import Util from 'browser/model/helpers/util';
import FusePlatformInstall from 'browser/model/jbossfuse';
import JdkInstall from 'browser/model/jdk-install';
import Logger from 'browser/services/logger';
import Platform from 'browser/services/platform';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
chai.use(sinonChai);

describe('fuseplatform installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let downloadUrl = 'http://download-node-02.eng.bos.redhat.com/released/JBossFuse/6.3.0/fuse-eap-installer-6.3.0.redhat-187.jar';
  let fakeInstall = {
    isInstalled: function() { return false; },
    isSkipped: function() { return true; }
  };
  let success = () => {};
  let failure = () => {};

  let files = {
    platform: {
      dmUrl: 'https://developers.redhat.com/download-manager/jdf/content/origin/files/sha256/84/847cd3a03bc3ae41b1b997b2bae34dadaa8a8fee4b45dd70de8b53bb32f953dd/fuse-eap-installer-6.3.0.redhat-187.jar?workflow=direct',
      url: 'http://download-node-02.eng.bos.redhat.com/released/JBossFuse/6.3.0/fuse-eap-installer-6.3.0.redhat-187.jar',
      fileName: 'fuse-eap-installer-6.3.0.redhat-187.jar',
      sha256sum: '847cd3a03bc3ae41b1b997b2bae34dadaa8a8fee4b45dd70de8b53bb32f953dd'
    },
    eap: {
      dmUrl: 'https://developers.redhat.com/download-manager/jdf/file/jboss-eap-6.4.0.GA-installer.jar?workflow=direct',
      url: 'http://download-node-02.eng.bos.redhat.com/released/JBEAP-6/6.4.0/jboss-eap-6.4.0-installer.jar',
      fileName: 'jboss-eap-6.4.0.GA-installer.jar',
      sha256sum: '363ab89d81b1f496da3e745f6cac7f9456d76bd4a9d1908c597f514232f84c0a'
    }
  };

  function stubDataService() {
    let ds = sinon.stub(new InstallerDataService({}, {
      fuseplatform: {
        version: '6.3.0'
      },
      devstudio:{
        name: 'Red Hat JBoss Developer Studio'
      }
    }, {
      version: 'X.0.0'
    }));
    ds.getRequirementByName.restore();
    ds.tempDir.returns('tempDirectory');
    ds.installDir.returns('installationFolder');
    ds.jdkDir.returns('install/jdk8');
    ds.jbosseapDir.returns('installationFolder/jbosseap');
    ds.fuseplatformDir.returns('installationFolder/fuseplatform');
    ds.cdkDir.returns('installationFolder/cdk');
    ds.getInstallable.returns(fakeInstall);
    ds.getUsername.returns('user');
    ds.getPassword.returns('passwd');
    ds.devstudioDir.returns('installationFolder/devstudio');
    return ds;
  }

  let fakeProgress;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256').callsFake(function(file, cb) { cb('hash'); });

    mockfs({
      tempDirectory : { 'testFile': 'file content here' },
      installationFolder : {
        installationFolder : {
          devstudio : {
            studio: {
              'runtime_locations.properties': ''
            }
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

  beforeEach(function () {
    installerDataSvc = stubDataService();
    installer = new FusePlatformInstall(installerDataSvc, 'fuseplatform', files);
    installer.ipcRenderer = { on: sinon.stub().yields(undefined, JdkInstall.KEY) };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should download fuseplatform installer to temporary folder with configured filename', function() {
    expect(new FusePlatformInstall(installerDataSvc, 'fuseplatform', files).downloadedFile).to.equal(
      path.join('tempDirectory', files.platform.fileName));
  });

  describe('installer download', function() {
    let downloadStub, downloadAuthStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      downloadAuthStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledTwice;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp/fuseplatform.jar', function() {
      let spy = sandbox.spy(fs, 'createWriteStream');
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(streamSpy).to.have.been.calledTwice;
      expect(spy).to.have.been.calledTwice;
      expect(spy).to.have.been.calledWith(path.join('tempDirectory', files.platform.fileName));
    });

    it('should call a correct downloader request with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadAuthStub).to.have.been.calledTwice;
      expect(downloadAuthStub).to.have.been.calledWith(files.platform.dmUrl, 'user', 'passwd');
      expect(downloadAuthStub).to.have.been.calledWith(files.eap.dmUrl, 'user', 'passwd');
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {

    let fsextra = require('fs-extra');
    let stubCopy;

    beforeEach(function() {
      stubCopy = sandbox.stub(Installer.prototype, 'copyFile').resolves();
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should not start until devstudio has finished installing', function() {
        let installerDataSvc = stubDataService();
        installer.ipcRenderer = { on: function() {} };
        let installSpy = sandbox.spy(installer, 'installAfterRequirements');
        let item2 = new InstallableItem('devstudio', 'url', 'installFile', 'targetFolderName', installerDataSvc);
        item2.thenInstall(installer);

        installer.install(fakeProgress, success, failure);

        expect(installSpy).not.called;
        expect(fakeProgress.setStatus).to.have.been.calledOnce;
        expect(fakeProgress.setStatus).to.have.been.calledWith('Waiting for Red Hat JBoss Developer Studio to finish installation');
      });
    });

    it('should install once devstudio has finished', function() {
      let stub = sandbox.stub(installer, 'installAfterRequirements').returns();
      sandbox.stub(fakeInstall, 'isInstalled').returns(true);
      let item2 = new InstallableItem('devstudio', 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should catch errors thrown during the installation', function(done) {
      let err = new Error('critical error');
      sandbox.stub(fsextra, 'writeFile').yields(err);

      try {
        installer.installAfterRequirements(fakeProgress, success, failure);
        done();
      } catch (error) {
        expect.fail('It did not catch the error');
      }
    });

    describe('headlessInstall', function() {
      let helper;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('fuseplatform', fakeProgress, success, failure);
        sandbox.stub(child_process, 'execFile').yields();
        sandbox.stub(fs, 'appendFile').yields();
      });

      it('should perform headless install into the installation folder', function() {
        let spy = sandbox.spy(helper, 'execFile');
        let downloadedFile = path.join(installerDataSvc.tempDir(), files.platform.fileName);
        let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java');
        let javaOpts = [
          '-jar',
          downloadedFile
        ];

        return installer.headlessInstall(helper)
          .then(() => {
            expect(spy).calledOnce;
            expect(spy).calledWith(javaPath, javaOpts, { cwd: 'installationFolder/fuseplatform', maxBuffer: 2097152 });
          });
      });
    });
  });
});
