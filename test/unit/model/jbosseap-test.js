'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import mockfs from 'mock-fs';
import path from 'path';
import rimraf from 'rimraf';
import Util from 'browser/model/helpers/util';
import JbosseapInstall from 'browser/model/jbosseap';
import JdkInstall from 'browser/model/jdk-install';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallableItem from 'browser/model/installable-item';
import JbosseapAutoInstallGenerator from 'browser/model/jbosseap-autoinstall';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import EventEmitter from 'events';
chai.use(sinonChai);

describe('jbosseap installer', function() {
  let installerDataSvc;
  let infoStub, errorStub, sandbox, installer, sha256Stub;
  let downloadUrl = 'http://download-node-02.eng.bos.redhat.com/devel/candidates/JBEAP/JBEAP-7.1.0.Alpha/jboss-eap-7.1.0.Alpha-installer.jar';
  let fakeInstall = {
    isInstalled: function() { return false; },
    isSkipped: function() { return true; },
    getLocation: function() { return 'install/jdk8'; }
  };
  let success = () => {};
  let failure = () => {};

  function stubDataService() {
    let ds = sinon.stub(new InstallerDataService({}, {
      jbosseap: {
        version: '7.0.0.GA'
      },
      jdk:{
        name: 'OpenJDK'
      }
    }, {
      version: 'X.0.0'
    }));
    ds.getRequirementByName.restore();
    ds.tempDir.returns('tempDirectory');
    ds.installDir.returns('installationFolder');
    ds.jdkDir.returns('install/jdk8');
    ds.jbosseapDir.returns('installationFolder/jbosseap');
    ds.cdkDir.returns('installationFolder/cdk');
    ds.getInstallable.returns(fakeInstall);
    ds.getUsername.returns('user');
    ds.getPassword.returns('passwd');
    ds.devstudioDir.returns('installationFolder/devstudio');
    ds.localAppData.restore();
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
    installer = new JbosseapInstall(installerDataSvc, 'jbosseap', downloadUrl, 'jbosseap.jar', 'sha');
    installer.ipcRenderer = { on: sinon.stub().yields(undefined, JdkInstall.KEY) };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should fail when no url is set and installed file not defined', function() {
    expect(function() {
      new JbosseapInstall(installerDataSvc, null, null, null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new JbosseapInstall(installerDataSvc, null, null, '');
    }).to.throw('No download URL set');
  });

  it('should download jbosseap installer to temporary folder with configured filename', function() {
    expect(new JbosseapInstall(installerDataSvc, 'jbosseap', 'url', 'jbosseap.jar').downloadedFile).to.equal(
      path.join(installerDataSvc.localAppData(), 'cache', 'jbosseap.jar'));
  });

  it('should remove an existing folder with the same name', function() {
    sandbox.stub(Installer.prototype, 'execFile').resolves();
    sandbox.stub(Util, 'findText').rejects();
    sandbox.stub(fs, 'existsSync').returns(true);
    let stub = sandbox.stub(rimraf, 'sync').returns();
    installer.install(fakeProgress, success, failure);

    expect(stub).calledOnce;
  });

  describe('installer download', function() {
    let downloadStub, downloadAuthStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      downloadAuthStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should write the data into temp/jbosseap.jar', function() {

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadAuthStub).to.have.been.calledOnce;
      expect(downloadAuthStub).to.have.been.calledWith(downloadUrl, 'user', 'passwd', path.join(installerDataSvc.localAppData(), 'cache', 'jbosseap.jar'));
    });

    it('should call a correct downloader request with the specified parameters once', function() {
      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadAuthStub).to.have.been.calledOnce;
      expect(downloadAuthStub).to.have.been.calledWith(downloadUrl, 'user', 'passwd');
    });

    it('should skip download when the file is found in the download folder', function() {
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, success, failure);

      expect(downloadStub).not.called;
    });
  });

  describe('installation', function() {

    let fsextra = require('fs-extra');

    it('should install once JDK has finished', function() {
      let stub = sandbox.stub(installer, 'installAfterRequirements').returns();
      sandbox.stub(fakeInstall, 'isInstalled').returns(true);
      let item2 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', installerDataSvc);
      item2.setInstallComplete();
      item2.thenInstall(installer);
      installer.install(fakeProgress, success, failure);

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(fakeProgress.setStatus).to.have.been.calledOnce;
      expect(fakeProgress.setStatus).to.have.been.calledWith('Installing');
    });

    it('should load the install config contents', function() {
      let spy = sandbox.spy(JbosseapAutoInstallGenerator.prototype, 'fileContent');

      installer.installAfterRequirements(fakeProgress, success, failure);

      expect(spy).to.have.been.calledOnce;
    });

    it('should write the install configuration into temp/jbosseap-autoinstall.xml', function() {
      sandbox.stub(fsextra, 'writeFile').yields();
      let spy = sandbox.spy(Installer.prototype, 'writeFile');

      let data = new JbosseapAutoInstallGenerator(installerDataSvc.jbosseapDir(), installerDataSvc.jdkDir(), /(\d+\.\d+\.\d+).*/.exec(installer.version)[1]).fileContent();
      let installConfigFile = path.join(installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml');
      return installer.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith(installConfigFile, data);
      });
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

    it('should call success callback when installation is finished successfully', function() {
      sandbox.stub(Installer.prototype, 'writeFile').resolves();
      sandbox.stub(installer, 'headlessInstall').resolves();
      sandbox.stub(Installer.prototype, 'succeed');

      return installer.installAfterRequirements(
        fakeProgress, function() {}, function() {}
      ).then(()=>{
        expect(Installer.prototype.succeed).to.be.calledWith(true);
      });
    });

    describe('headlessInstall', function() {
      let helper;
      let child_process = require('child_process');

      beforeEach(function() {
        helper = new Installer('jbosseap', fakeProgress, success, failure);
        sandbox.stub(child_process, 'execFile').yields();
        sandbox.stub(fs, 'appendFile').yields();
      });

      it('should perform headless install into the installation folder', function() {
        let spy = sandbox.spy(helper, 'execFile');
        let downloadedFile = path.join(installerDataSvc.localAppData(), 'cache', 'jbosseap.jar');
        let javaPath = path.join(installerDataSvc.jdkDir(), 'bin', 'java');
        let javaOpts = [
          '-DTRACE=true',
          '-jar',
          downloadedFile,
          path.join(installerDataSvc.tempDir(), 'jbosseap-autoinstall.xml')
        ];

        return installer.headlessInstall(helper)
          .then(() => {
            expect(spy).calledOnce;
            expect(spy).calledWith(javaPath, javaOpts);
          });
      });
    });

    it('should call runtime detection configuration after all installers finished and devstudio is installed', function() {
      sandbox.stub(installer, 'headlessInstall').resolves();
      installer.ipcRenderer = new EventEmitter();
      sandbox.spy(installer.ipcRenderer, 'on');
      let devStudio = {
        installed: false,
        configureRuntimeDetection: sinon.stub()
      };
      installer.installerDataSvc.getInstallable.withArgs('jdk').returns(fakeInstall);
      installer.installerDataSvc.getInstallable.withArgs('devstudio').returns(devStudio);
      // sandbox.stub(installer.installerDataSvc, 'getInstallable').returns(devStudio);
      return installer.installAfterRequirements(fakeProgress, success, failure).then(()=>{
        expect(installer.ipcRenderer.on).calledWith('installComplete');
        installer.ipcRenderer.emit('installComplete', 'installComplete', 'devstudio');
        expect(devStudio.configureRuntimeDetection).not.called;
        installer.ipcRenderer.emit('installComplete', 'installComplete', 'all');
        expect(devStudio.configureRuntimeDetection).not.called;
        devStudio.installed = true;
        installer.ipcRenderer.emit('installComplete', 'installComplete', 'all');
        expect(devStudio.configureRuntimeDetection).calledOnce;
      });
    });
  });
});
