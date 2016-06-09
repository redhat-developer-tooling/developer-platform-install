'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import request from 'request';
import fs from 'fs-extra';
import path from 'path';
import CDKInstall from 'model/cdk';
import VagrantInstall from "model/vagrant";
import VirtualboxInstall from "model/virtualbox";
import Logger from 'services/logger';
import Downloader from 'model/helpers/downloader';
import Installer from 'model/helpers/installer';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);
chai.use(sinonChai);

let sinon  = require('sinon');
require('sinon-as-promised');

describe('CDK installer', function() {
  let sandbox, installerDataSvc;
  let infoStub, errorStub;
  let fakeData = {
    tempDir: function() {},
    installDir: function() {},
    getUsername: function() {},
    getPassword: function() {},
    ocDir: function() {},
    vagrantDir: function() {},
    virtualBoxDir: function() {},
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
  installerDataSvc.virtualBoxDir.returns(path.join(installerDataSvc.installDir(), 'virtualbox'));
  installerDataSvc.cdkVagrantfileDir.returns(path.join(installerDataSvc.cdkDir(), 'components', 'rhel', 'rhel-ose'));
  installerDataSvc.cdkBoxDir.returns(path.join(installerDataSvc.cdkDir(), 'boxes'));
  installerDataSvc.cdkMarker.returns(path.join(installerDataSvc.cdkVagrantfileDir(), '.cdk'));

  let vagrantInstallStub = new VagrantInstall(installerDataSvc,'url', null, 'vagrant');
  vagrantInstallStub.isSkipped = function() {return false;};
  vagrantInstallStub.addOption('install', '1.7.4',path.join('installFolder','vagrant'),true);
  installerDataSvc.getInstallable.returns(vagrantInstallStub);

  let installer;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

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
  });

  beforeEach(function () {
    installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl,  null);
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  it('should not download cdk when an installation exists', function() {
    let cdk = new CDKInstall(installerDataSvc, 900, 'cdkUrl', 'cdkBoxUrl', 'ocUrl', 'installFile');
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
    expect(new CDKInstall(installerDataSvc, 900, 'cdkUrl', 'cdkBoxUrl', 'ocUrl', null).useDownload).to.be.true;
  });

  let reqs;
  let installersJsonForTests = path.resolve('./requirements.json');
  let installersJsonForRT = path.join(path.resolve('.'),'resources/app.asar/requirements.json');
  if(fs.existsSync(installersJsonForTests)) {
    reqs = require(installersJsonForTests);
  } else if ( fs.existsSync(installersJsonForRT) ) {
    reqs = require(installersJsonForRT);
  }

  let cdkUrl = reqs['cdk.zip'].url,
      cdkBoxUrl = reqs['rhel-vagrant-virtualbox.box'].url,
      ocUrl = reqs['oc.zip'].url;

  describe('files download', function() {
    let downloadStub, authStub;

    beforeEach(function() {
      downloadStub = sandbox.stub(Downloader.prototype, 'download').returns();
      authStub = sandbox.stub(Downloader.prototype, 'downloadAuth').returns();
    });

    it('should set progress to "Downloading"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Downloading');
    });

    it('should write the data into temp folder', function() {
      let streamSpy = sandbox.spy(Downloader.prototype, 'setWriteStream');
      let fsSpy = sandbox.spy(fs, 'createWriteStream');

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      //expect 4 streams to be set and created
      expect(streamSpy.callCount).to.equal(3);
      expect(fsSpy.callCount).to.equal(3);
      expect(fsSpy).calledWith(installer.cdkDownloadedFile);
      expect(fsSpy).calledWith(installer.cdkBoxDownloadedFile);
      expect(fsSpy).calledWith(installer.ocDownloadedFile);
    });

    it('should call a correct downloader request for each file', function() {
      let headers = {
        url: cdkUrl,
        rejectUnauthorized: false
      };
      installer = new CDKInstall(installerDataSvc, 900, cdkUrl, cdkBoxUrl, ocUrl,  null);
      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      //we download 1 out of 4 files with authentication
      expect(downloadStub.callCount).to.equal(2);
      expect(authStub).to.have.been.calledOnce;

      expect(downloadStub).calledWith(cdkBoxUrl);
      expect(downloadStub).calledWith(ocUrl);

      expect(authStub).calledWith(headers, installerDataSvc.getUsername(), installerDataSvc.getPassword());
    });

    it('should skip download when the files are located in downloads folder', function() {
      let spy = sandbox.spy(Downloader.prototype, 'closeHandler');
      sandbox.stub(fs, 'existsSync').returns(true);

      installer.downloadInstaller(fakeProgress, function() {}, function() {});

      expect(downloadStub).not.called;
      expect(authStub).not.called;
      expect(spy.callCount).to.equal(3);
    });
  });

  describe('installation', function() {
    it('should wait if vagrant has not finished installing', function() {
      let stub = sandbox.stub(installer, 'postVagrantInstall');
      let progressStub = sandbox.stub(fakeProgress, 'setStatus').throws('done');

      try {
        installer.install(fakeProgress, () => {}, (err) => {});
      } catch (err) {
        //workaround for ipcRenderer
      } finally {
        expect(stub).not.called;
        expect(progressStub).calledWith('Waiting for Vagrant to finish installation');
      }
    });

    it('should install once vagrant has finished', function() {
      let stub = sandbox.stub(installer, 'postVagrantInstall').returns();
      sandbox.stub(vagrantInstallStub, 'isInstalled').returns(true);

      installer.install(fakeProgress, () => {}, (err) => {});

      expect(stub).calledOnce;
    });

    it('should set progress to "Installing"', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      sandbox.stub(Installer.prototype, 'unzip').rejects('done');

      installer.postVagrantInstall(fakeProgress, null, null);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Installing');
    });

    it('should extract cdk archive to install folder', function() {
      let stub = sandbox.stub(Installer.prototype, 'unzip').rejects('done');
      installer.postVagrantInstall(fakeProgress, function() {}, function (err) {});

      expect(stub).to.have.been.called;
      expect(stub).calledWith(installer.cdkDownloadedFile, installerDataSvc.installDir());
    });

    describe('createEnvironment', function() {
      it('should return path with vagrant/bin', function() {
        let env = installer.createEnvironment();
        expect(env['path']).includes(path.join(installerDataSvc.vagrantDir(), 'bin') + path.delimiter + installerDataSvc.vagrantDir());
      });
    });

    describe('setupVagrant', function() {
      let stub, helper;

      beforeEach(function() {
        stub = sandbox.stub(installer, 'postVagrantSetup').returns();
        helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});
      });

      it('should wait for vagrant install to complete', function() {
        installer.setupVagrant(helper);
        expect(stub).not.called;
      });

      it('should call postVagrantSetup if vagrant is installed', function() {
        sandbox.stub(helper, 'exec');
        sandbox.stub(vagrantInstallStub, 'isInstalled').returns(true);

        installer.setupVagrant(helper);
        expect(stub).calledOnce;
      });
    });

    describe('postVagrantSetup', function() {
      let helper, envSpy, execStub;

      beforeEach(function() {
        helper = new Installer('cdk', fakeProgress, function() {}, function (err) {});
        envSpy = sandbox.spy(installer, 'createEnvironment');
        execStub = sandbox.stub(helper, 'exec').resolves(true);
      });

      it('should not execute if vagrant installation does not exist', function() {
        installer.setupVagrant(helper);
        expect(envSpy).not.called;
        expect(execStub).not.called;
      });

      it('should execute when vagrant installation is complete', function() {
        sandbox.stub(vagrantInstallStub, 'isInstalled').returns(true);

        let p = installer.setupVagrant(helper);

        expect(envSpy).calledOnce;
        return expect(p).to.eventually.equal(true);
      });
    });
  });
});
