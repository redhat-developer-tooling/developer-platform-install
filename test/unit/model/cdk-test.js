'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import path from 'path';
import CDKInstall from 'browser/model/cdk';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import Installer from 'browser/model/helpers/installer';
import Hash from 'browser/model/helpers/hash';
import InstallerDataService from 'browser/services/data';
import {ProgressState} from 'browser/pages/install/controller';
import Platform from 'browser/services/platform';
import InstallableItem from 'browser/model/installable-item';
import child_process from 'child_process';
import mockfs from 'mock-fs';
import loadMetadata from 'browser/services/metadata';
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
    sha256Stub = sinon.stub(Hash.prototype, 'SHA256').callsFake(function(file, cb) { cb('hash'); });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    sha256Stub.restore();
  });

  let reqs = loadMetadata(require('../../../requirements.json'), process.platform);

  let cdkUrl = reqs['cdk'].url;

  let success = () => {};
  let failure = () => {};

  function stubInstaller() {
    let svc = new InstallerDataService({}, reqs);
    svc.cdkRoot = 'cdkLocation';
    svc.ocBinRoot = 'ocBinRoot';
    svc.vboxRoot = 'virtualboxLocation';
    svc.cygwinRoot = 'cygwinLocation';
    let cygwin;
    if (process.platform === 'win32') {
      svc.addItemsToInstall(
        new InstallableItem('cygwin', 'url', 'cygwin.exe', 'cygwin', svc, false)
      );
      cygwin = svc.getInstallable('cygwin');
      cygwin.addOption('install', '1.0.0', 'cygwin', true);
    } else {
      svc.requirements['hyperv'] = {};
    }
    svc.addItemsToInstall(
      new InstallableItem('virtualbox', 'url', 'virtualbox.exe', 'virtualbox', svc, false)
    );
    let virtualbox = svc.getInstallable('virtualbox');
    virtualbox.addOption('install', '1.0.0', 'virtualbox', true);

    let cdk = new CDKInstall(svc, 'folderName', cdkUrl, 'file.exe', 'sha1');
    return {
      svc,
      virtualbox,
      cygwin,
      cdk
    };
  }

  beforeEach(function () {
    mockfs({
      'Users' : {
        'dev1': {
          '.minishift': {
            'cache': {
              'oc': {
                '1.4.1': {
                  'oc.exe': 'executable code',
                  'oc': 'executable code'
                }
              }
            }
          }
        }
      },
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
    installer = new CDKInstall(installerDataSvc, 'folderName', cdkUrl, 'installFile.zip', 'sha1');
    installer.ipcRenderer = { on: function() {} };
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
  });

  afterEach(function () {
    sandbox.restore();
    mockfs.restore();
  });

  it('should fail when some download url is not set and installed file not defined', function() {
    expect(function() {
      new CDKInstall(installerDataSvc, 'folderName', null, 'installFile', 'sha1');
    }).to.throw('No download URL set');
  });

  it('should download files when no installation is found', function() {
    expect(new CDKInstall(installerDataSvc, 'folderName', 'cdkUrl', 'installFile', 'sha1').useDownload).to.be.true;
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
      installer = new CDKInstall(installerDataSvc, 'folderName', cdkUrl, 'installFile', 'sha1');
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

  describe('installAfterRequirements', function() {

    it('should set progress to "Installing"', function() {
      sandbox.stub(Installer.prototype, 'unzip').rejects('done');
      installer.installAfterRequirements(fakeProgress, success, failure);
      expect(fakeProgress.setStatus).calledOnce;
      expect(fakeProgress.setStatus).calledWith('Installing');
    });

    it('should fail for cdk file without known extension', function() {
      installer = new CDKInstall(installerDataSvc, 'folderName', cdkUrl, 'installFile.aaa', 'sha1');
      sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve('home'));
      let stubCopy = sandbox.stub(Installer.prototype, 'copyFile');
      let stubUnzip = sandbox.stub(Installer.prototype, 'unzip');
      return new Promise((resolve, reject)=> {
        installer.installAfterRequirements(fakeProgress, resolve, reject);
      }).catch(()=> {
        expect(stubCopy).to.have.been.not.called;
        expect(stubUnzip).to.have.been.not.called;
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        ( {cdk: installer} = stubInstaller() );
        sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve(path.join('Users', 'dev1')));
        sandbox.stub(Installer.prototype, 'copyFile').resolves();
        sandbox.stub(Installer.prototype, 'exec').resolves();
        sandbox.stub(child_process, 'exec').yields();
        sandbox.stub(Platform, 'addToUserPath').resolves();
        sandbox.stub(installer, 'createEnvironment').returns({PATH:''});
      });

      it('should copy cdk exe file to install folder', function(done) {
        installer.installAfterRequirements(fakeProgress, function success() {
          expect(Installer.prototype.copyFile).to.have.been.called;
          expect(Installer.prototype.copyFile).calledWith(installer.downloadedFile, path.join(installer.installerDataSvc.ocDir(), 'minishift.exe'));
          done();
        }, function failure(e) {
          console.log(e);
          expect.fail();
        });
      });

      it('should run downloaded file with augmented environment', function() {
        return new Promise((resolve, reject)=> {
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=> {
          expect(Installer.prototype.exec).to.have.been.calledWith(
              path.join('ocBinRoot', 'minishift.exe') + ' setup-cdk --force --default-vm-driver=virtualbox',
              {PATH:''}
            );
          expect(installer.createEnvironment).to.have.been.called;
        });
      });

      it('should run downloaded file with virtualbox driver if no hyper-v detected', function() {
        let hyperv = new InstallableItem('hyperv', 'url', 'file', 'folder', installer.installerDataSvc, false);
        hyperv.addOption('detected');
        installer.installerDataSvc.addItemsToInstall(hyperv);
        return new Promise((resolve, reject)=> {
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=> {
          expect(Installer.prototype.exec).to.have.been.calledWith(
              path.join('ocBinRoot', 'minishift.exe') + ' setup-cdk --force --default-vm-driver=hyperv',
              {PATH:''}
            );
          expect(installer.createEnvironment).to.have.been.called;
        });
      });

      it('should not run chmod command on windows for installed file', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=>{
          expect(child_process.exec).not.called;
        });
      });

      it('should find installed oc.exe cli, minishift.exe and add them to user PATH', function() {
        return new Promise((resolve, reject)=> {
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=> {
          expect(Platform.addToUserPath).calledWith([
            path.join(process.cwd(), 'Users', 'dev1', '.minishift', 'cache', 'oc', '1.4.1', 'oc.exe'),
            path.join('ocBinRoot', 'minishift.exe')
          ]);
        });
      });

      it('should add current user to `Hyper-V Administrators` group', function() {
        Installer.prototype.exec.restore();
        sandbox.stub(Installer.prototype,'exec').onCall(0).rejects('Error');
        Installer.prototype.exec.onCall(1).resolves();
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=>{
          expect(Installer.prototype.exec).calledWith('net localgroup "Hyper-V Administrators" %USERDOMAIN%\\%USERNAME% /add');
        }).catch(()=>{
          expect.fail();
        });
      });

      it('should stop minishift before running `minishift setup-cdk`', function() {
        Installer.prototype.exec.restore();
        sandbox.stub(Installer.prototype,'exec').onCall(0).resolves();
        Installer.prototype.exec.onCall(1).rejects('error');
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=>{
          expect(Installer.prototype.exec).calledWith(`${installer.minishiftExeLocation} stop`);
        }).catch(()=>{
          expect.fail();
        });
      });

      afterEach(function() {
        sandbox.restore();
      });
    });

    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        ( {cdk: installer} = stubInstaller() );
        sandbox.stub(Platform, 'getUserHomePath').returns(Promise.resolve(path.join('Users', 'dev1')));
        sandbox.stub(Installer.prototype, 'copyFile').resolves();
        sandbox.stub(Installer.prototype, 'exec').resolves();
        sandbox.stub(child_process, 'exec').yields();
        sandbox.stub(Platform, 'addToUserPath').resolves();
        sandbox.stub(installer, 'createEnvironment').returns({PATH:''});
      });

      it('should copy cdk file without extension to install folder', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).catch(()=> {
          expect(Installer.prototype.copyFile).to.have.been.called;
          expect(Installer.prototype.copyFile).calledWith(installer.downloadedFile, path.join(installerDataSvc.ocDir(), 'minishift'));
        });
      });

      it('should set executable bit for installed files minishift and oc', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=>{
          expect(child_process.exec).calledWith('chmod +x ' + path.join('ocBinRoot', 'minishift'));
          expect(child_process.exec).calledWith('chmod +x ' + path.join(process.cwd(), 'Users', 'dev1', '.minishift', 'cache', 'oc', '1.4.1', 'oc'));
        });
      });

      it('should find installed oc cli, minishift and add them to user PATH', function() {
        return new Promise((resolve, reject)=>{
          installer.installAfterRequirements(fakeProgress, resolve, reject);
        }).then(()=>{
          expect(Platform.addToUserPath).calledWith([
            path.join(process.cwd(), 'Users', 'dev1', '.minishift', 'cache', 'oc', '1.4.1', 'oc'),
            path.join('ocBinRoot', 'minishift')
          ]);
        });
      });
    });

    afterEach(function() {
      sandbox.restore();
    });
  });

  describe('createEnvironment', function() {
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        ( {cdk: installer} = stubInstaller() );
      });
      it('returns copy of Platform.ENV with virtualbox location added to PATH', function() {
        sandbox.stub(Platform, 'getEnv').returns({'PATH':'path'});
        let pathArray = ['virtualbox', 'path'];
        if (process.platform === 'win32') {
          pathArray.splice(1, 0, 'cygwin');
        }
        expect(installer.createEnvironment()[Platform.PATH]).to.be.equal(pathArray.join(path.delimiter));
      });
      it('does not use empty path', function() {
        sandbox.stub(Platform, 'getEnv').returns({'PATH':''});
        let pathArray = ['virtualbox'];
        if (process.platform === 'win32') {
          pathArray.push('cygwin');
        }
        expect(installer.createEnvironment()[Platform.PATH]).to.be.equal(pathArray.join(path.delimiter));
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        ( {cdk: installer} = stubInstaller() );
      });
      it('returns copy of Platform.ENV with virtualbox and cygwin locations added to PATH', function() {
        sandbox.stub(Platform, 'getEnv').returns({'Path':'path'});
        let pathArray = ['virtualbox', 'path'];
        if (process.platform === 'win32') {
          pathArray.splice(1, 0, 'cygwin');
        }
        expect(installer.createEnvironment()[Platform.PATH]).to.be.equal(pathArray.join(path.delimiter));
      });
      it('does not use empty path', function() {
        sandbox.stub(Platform, 'getEnv').returns({'Path':''});
        let pathArray = ['virtualbox'];
        if (process.platform === 'win32') {
          pathArray.push('cygwin');
        }
        expect(installer.createEnvironment()[Platform.PATH]).to.be.equal(pathArray.join(path.delimiter));
      });
    });
  });
});
