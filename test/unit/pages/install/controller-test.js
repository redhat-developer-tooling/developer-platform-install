'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallController from 'pages/install/controller.js';
import InstallerDataService from 'services/data.js';
import VagrantInstall from 'model/vagrant.js';
import VirtualBoxInstall from 'model/virtualbox.js'
import InstallableItem from 'model/installable-item.js'
import Logger from 'services/logger';
import fs from 'fs';
chai.use(sinonChai);

describe('Install controller', function() {

  let controller, installerDataSvc, sandbox;
  let vagrant, vbox;
  let logStub, fsStub, infoStub, errorStub;
  let timeoutStub = sinon.stub();

  before(function() {
    logStub = sinon.stub(Logger, 'initialize');
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');
    fsStub = sinon.stub(fs, 'mkdirSync');
  });

  after(function() {
    logStub.restore();
    fsStub.restore();
    infoStub.restore();
    errorStub.restore();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    sandbox.stub(InstallerDataService.prototype,'copyUninstaller').returns();
    installerDataSvc = new InstallerDataService();
    installerDataSvc.setup('installRoot');
    vagrant = new VagrantInstall(installerDataSvc,
      'https://github.com/redhat-developer-tooling/vagrant-distribution/archive/1.7.4.zip', null);
    vbox = new VirtualBoxInstall('5.0.8', '103449', installerDataSvc,
      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', null);

    installerDataSvc.addItemToInstall(VagrantInstall.key(), vagrant);
    installerDataSvc.addItemToInstall(VirtualBoxInstall.key(), vbox);
  });

  afterEach(function() {
    sandbox.restore();
  })

  describe('constrution', function() {
    it('should process all installables', function() {
      let stub = sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      controller = new InstallController(null, null, installerDataSvc);

      expect(stub).calledTwice;
      expect(stub).calledWith(VagrantInstall.key(), vagrant);
      expect(stub).calledWith(VirtualBoxInstall.key(), vbox);
    });

    it('should mark skipped installables as done', function() {
      let stub = sandbox.stub(installerDataSvc,'setupDone').returns();
      sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      sandbox.stub(vagrant,'isSkipped').returns(true);
      sandbox.stub(vbox,'isSkipped').returns(true);
      controller = new InstallController(null, null, installerDataSvc);
      expect(stub).calledTwice;
    });
  });

  describe('processInstallable', function() {
    let dlStub, inStub;

    before(function() {
      dlStub = sinon.stub(InstallController.prototype, 'triggerDownload');
      inStub = sinon.stub(InstallController.prototype, 'triggerInstall');
    });

    after(function() {
      dlStub.restore();
      inStub.restore();
    });

    afterEach(function() {
      dlStub.reset();
      inStub.reset();
    })

    it('should trigger download on not downloaded installables', function() {
      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(dlStub).calledTwice;
      expect(dlStub).calledWith('vagrant', vagrant);
      expect(dlStub).calledWith('virtualbox', vbox);
    });

    it('should not trigger download on already downloaded items', function() {
      sandbox.stub(vagrant, 'isDownloadRequired').returns(false);
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(dlStub).not.called;
    });

    it('should trigger install on already downloaded items', function() {
      sandbox.stub(vagrant, 'isDownloadRequired').returns(false);
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(inStub).calledTwice;
      expect(inStub).calledWith('vagrant', vagrant);
      expect(inStub).calledWith('virtualbox', vbox);
    });
  });

  describe('triggerDownload', function() {
    let vagrantStub, vboxStub, doneStub;

    beforeEach(function() {
      vagrantStub = sandbox.stub(vagrant, 'downloadInstaller').yields();
      vboxStub = sandbox.stub(vbox, 'downloadInstaller').yields();
      doneStub = sandbox.stub(installerDataSvc, 'downloadDone').returns();
    });

    it('data service should register the new downloads', function() {
      let spy = sandbox.spy(installerDataSvc, 'startDownload');
      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(spy).calledTwice;
      expect(spy).calledWith('vagrant');
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.downloading).to.be.true;
      expect(installerDataSvc.toDownload.size).to.equal(2);
    });

    it('should call the installables downloadInstaller method', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      controller = new InstallController(null, timeoutStub, installerDataSvc);
      expect(vagrantStub).calledOnce;
      expect(vboxStub).calledOnce;
    });

    it('should call data services downloadDone when download finishes', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(doneStub).calledTwice;
      expect(doneStub).calledWith(sinon.match.any, 'vagrant');
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });

  describe('triggerInstall', function() {
    let vagrantStub, vboxStub, doneStub;

    beforeEach(function() {
      sandbox.stub(vagrant, 'isDownloadRequired').returns(false);
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      vagrantStub = sandbox.stub(vagrant, 'install').yields();
      vboxStub = sandbox.stub(vbox, 'install').yields();
      doneStub = sandbox.stub(installerDataSvc, 'installDone').returns();
    });

    it('data service should register the new install', function() {
      let spy = sandbox.spy(installerDataSvc, 'startInstall');
      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(spy).calledTwice;
      expect(spy).calledWith('vagrant');
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.installing).to.be.true;
      expect(installerDataSvc.toInstall.size).to.equal(2);
    });

    it('should call the installables install method', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      controller = new InstallController(null, timeoutStub, installerDataSvc);
      expect(vagrantStub).calledOnce;
      expect(vboxStub).calledOnce;
    });

    it('should call data services installDone when install finishes', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      controller = new InstallController(null, timeoutStub, installerDataSvc);

      expect(doneStub).calledTwice;
      expect(doneStub).calledWith(sinon.match.any, 'vagrant');
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });
});
