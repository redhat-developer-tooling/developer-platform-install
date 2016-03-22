'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs-extra';
import path from 'path';
import CDKInstall from 'model/cdk';
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
chai.use(sinonChai);

let sinon  = require('sinon');
require('sinon-as-promised');

describe('CDK installer', function() {
  let sandbox, DataStub, installerDataSvc;
  let infoStub, errorStub;
  let fakeData = {
    tempDir: function() { return 'temporaryFolder'; },
    installDir: function() { return 'installFolder'; },
    getUsername: function() { return 'user'; },
    getPassword: function() { return 'password'; },
    ocDir: function() {},
    vagrantDir: function() {},
    cdkVagrantfileDir: function() {},
    cdkBoxDir: function() {},
    cdkMarker: function() {},
    cdkDir: function() {},
    getInstallable: function(key) {}
  };
  let fakeProgress = {
    setStatus: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {},
    setComplete: function() {},
    setTotalDownloadSize: function(size) {},
    downloaded: function(amt, time) {}
  };

  installerDataSvc = sinon.stub(fakeData);
  installerDataSvc.tempDir.returns('temporaryFolder');
  installerDataSvc.installDir.returns('installFolder');
  installerDataSvc.getUsername.returns('user');
  installerDataSvc.getPassword.returns('password');
  installerDataSvc.cdkDir.returns(path.join(installerDataSvc.installDir(), 'cdk'));
  installerDataSvc.ocDir.returns(path.join(installerDataSvc.cdkDir(), 'bin'));
  installerDataSvc.vagrantDir.returns(path.join(installerDataSvc.installDir(), 'vagrant'));
  installerDataSvc.cdkVagrantfileDir.returns(path.join(installerDataSvc.cdkDir(), 'components', 'rhel', 'rhel-ose'));
  
  installerDataSvc.cdkBoxDir.returns(path.join(installerDataSvc.cdkDir(), 'boxes'));
  installerDataSvc.cdkMarker.returns(path.join(installerDataSvc.cdkVagrantfileDir(), '.cdk'));

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

    mockfs({
      temporaryFolder: {},
      installFolder: {}
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

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download cdk when an installation exists', function() {
    let cdk = new CDKInstall(installerDataSvc, 900, 'cdkUrl', 'cdkBoxUrl', 'ocUrl', 'pscpUrl', 'installFile');
    expect(cdk.useDownload).to.be.false;
  });

  it('should fail when some download url is not set and installed file not defined', function() {
    expect(function() {
      new CDKInstall(installerDataSvc, 900, null, 'ocUrl', 'pscpUrl', null);
    }).to.throw('No download URL set');
  });

  it('should fail when no url is set and installed file is empty', function() {
    expect(function() {
      new CDKInstall(installerDataSvc, 900, null, 'ocUrl', 'pscpUrl', '');
    }).to.throw('No download URL set');
  });

  it('should download files when no installation is found', function() {
    expect(new CDKInstall(installerDataSvc, 900, 'cdkUrl', 'cdkBoxUrl', 'ocUrl', 'pscpUrl', null).useDownload).to.be.true;
  });

  let cdkUrl = 'http://cdk-builds.usersys.redhat.com/builds/09-Mar-2016/cdk-2.0.0-beta5.zip',
      cdkBoxUrl ='http://cdk-builds.usersys.redhat.com/builds/09-Mar-2016/rhel-cdk-kubernetes-7.2-21.x86_64.vagrant-virtualbox.box',
      ocUrl = 'https://github.com/openshift/origin/releases/download/v1.1.4/openshift-origin-client-tools-v1.1.4-3941102-windows.zip',
      pscpUrl = 'http://the.earth.li/~sgtatham/putty/latest/x86/pscp.exe';

  let boxName = 'rhel-cdk-kubernetes-7.2-6.x86_64.vagrant-virtualbox.box';

  describe('when downloading the cdk tools', function() {
    let downloadStub, authStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      authStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp folder', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');
      let fsSpy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      //expect 4 streams to be set and created
      expect(streamSpy.callCount).to.equal(4);
      expect(fsSpy.callCount).to.equal(4);
      expect(fsSpy).calledWith(installer.cdkDownloadedFile);
      expect(fsSpy).calledWith(installer.cdkBoxDownloadedFile);
      expect(fsSpy).calledWith(installer.ocDownloadedFile);
      expect(fsSpy).calledWith(installer.pscpDownloadedFile);
    });

    it('should call a correct downloader request for each file', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let headers = {
        url: cdkUrl,
        rejectUnauthorized: false
      };

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      //we download 1 out of 4 files with authentication
      expect(downloadStub.callCount).to.equal(3);
      expect(authStub).to.have.been.calledOnce;

      expect(downloadStub).calledWith(cdkBoxUrl);
      expect(downloadStub).calledWith(ocUrl);
      expect(downloadStub).calledWith(pscpUrl);

      expect(authStub).calledWith(headers, installerDataSvc.getUsername(), installerDataSvc.getPassword());
    });
  });

  describe('when installing cdk', function() {
    it('should set progress to "Installing"', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.postVagrantInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should extract cdk archive to install folder', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);

      let spy = sandbox.spy(Installer.prototype, 'unzip');
      installer.postVagrantInstall(fakeProgress, function() {}, function (err) {});

      expect(spy).to.have.been.called;
      expect(spy).calledWith(installer.cdkDownloadedFile, installerDataSvc.installDir());
    });

    it('createEnvironment should return path to vagrant/bin', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let env = installer.createEnvironment();

      expect(env['path']).equal(path.join(installerDataSvc.vagrantDir(), 'bin') + ';');
    });

    it('setupVagrant should wait for vagrant install to complete', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let spy = sandbox.spy(installer, 'postVagrantSetup');
      let helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});

      installer.setupVagrant(helper);
      expect(spy).not.called;
    });

    it('setupVagrant should call postVagrantSetup if vagrant is installed', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});
      let spy = sandbox.spy(installer, 'postVagrantSetup');
      let execStub = sandbox.stub(helper, 'exec');

      let fakeInstall = {
        isInstalled: function() { return true; }
      };
      installerDataSvc.getInstallable.returns(fakeInstall);

      installer.setupVagrant(helper);
      expect(spy).calledOnce;
    });

    it('postVagrantSetup should not execute if vagrant installation does not exist', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});
      let spy = sandbox.spy(Installer.prototype, 'exec');
      let envSpy = sandbox.spy(installer, 'createEnvironment');

      let fakeInstall = {
        isInstalled: function() { return false; }
      };
      installerDataSvc.getInstallable.returns(fakeInstall);

      installer.setupVagrant(helper);
      expect(envSpy).not.called;
      expect(spy).not.called;
    });

    it('postVagrantSetup should execute when vagrant installation is complete', function() {
      let installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl, pscpUrl, null);
      let helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});
      let spy = sandbox.spy(installer, 'createEnvironment');
      let execStub = sandbox.stub(helper, 'exec');
      execStub.resolves(true);

      let fakeInstall = {
        isInstalled: function() { return true; }
      };
      installerDataSvc.getInstallable.returns(fakeInstall);

      installer.setupVagrant(helper);

      expect(spy).calledOnce;
      expect(execStub).called;
    });
  });
});
