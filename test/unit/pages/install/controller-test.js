'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallController from 'browser/pages/install/controller';
import InstallerDataService from 'browser/services/data';
import VirtualBoxInstall from 'browser/model/virtualbox';
import InstallableItem from 'browser/model/installable-item';
import Logger from 'browser/services/logger';

import fs from 'fs';
chai.use(sinonChai);

describe('Install controller', function() {

  let installerDataSvc, sandbox;
  let vbox;
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
    sandbox.stub(InstallerDataService.prototype, 'copyUninstaller').returns();
    installerDataSvc = new InstallerDataService();
    installerDataSvc.setup('installRoot');
    vbox = new VirtualBoxInstall('5.0.8', '103449', installerDataSvc,
      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', null);

    installerDataSvc.addItemToInstall(VirtualBoxInstall.KEY, vbox);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('constrution', function() {
    it('should process all installables', function() {
      let stub = sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      new InstallController(null, null, installerDataSvc);

      expect(stub).calledOnce;
      expect(stub).calledWith(VirtualBoxInstall.KEY, vbox);
    });

    it('should mark skipped installables as done', function() {
      let stub = sandbox.stub(installerDataSvc, 'setupDone').returns();
      sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      sandbox.stub(vbox, 'isSkipped').returns(true);
      new InstallController(null, null, installerDataSvc);
      expect(stub).calledOnce;
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
    });

    it('should trigger download on not downloaded installables', function() {
      new InstallController(null, timeoutStub, installerDataSvc);

      expect(dlStub).calledOnce;
      expect(dlStub).calledWith('virtualbox', vbox);
    });

    it('should not trigger download on already downloaded items', function() {
      new InstallController(null, timeoutStub, installerDataSvc);

    });

    it('should trigger install on already downloaded items', function() {
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      new InstallController(null, timeoutStub, installerDataSvc);

      expect(inStub).calledOnce;
      expect(inStub).calledWith('virtualbox', vbox);
    });
  });

  describe('triggerDownload', function() {
    let vagrantStub, vboxStub, doneStub;

    beforeEach(function() {
      vboxStub = sandbox.stub(vbox, 'downloadInstaller').yields();
      doneStub = sandbox.stub(installerDataSvc, 'downloadDone').returns();
    });

    it('data service should register the new downloads', function() {
      let spy = sandbox.spy(installerDataSvc, 'startDownload');
      new InstallController(null, timeoutStub, installerDataSvc);

      expect(spy).calledOnce;
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.downloading).to.be.true;
      expect(installerDataSvc.toDownload.size).to.equal(1);
    });

    it('should call the installables downloadInstaller method', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      new InstallController(null, timeoutStub, installerDataSvc);
      expect(vboxStub).calledOnce;
    });

    it('should call data services downloadDone when download finishes', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      new InstallController(null, timeoutStub, installerDataSvc);

      expect(doneStub).calledOnce;
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });

  describe('triggerInstall', function() {
    let vagrantStub, vboxStub, doneStub;

    beforeEach(function() {
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      vboxStub = sandbox.stub(vbox, 'install').yields();
      doneStub = sandbox.stub(installerDataSvc, 'installDone').returns();
    });

    it('data service should register the new install', function() {
      let spy = sandbox.spy(installerDataSvc, 'startInstall');
      new InstallController(null, timeoutStub, installerDataSvc);

      expect(spy).calledOnce;
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.installing).to.be.true;
      expect(installerDataSvc.toInstall.size).to.equal(1);
    });

    it('should call the installables install method', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController(null, timeoutStub, installerDataSvc);
      expect(vboxStub).calledOnce;
    });

    it('should call data services installDone when install finishes', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController(null, timeoutStub, installerDataSvc);

      expect(doneStub).calledOnce;
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });

  it('downloadAgain closes dialog with error and start download for failed installers', function() {
    sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');
    sandbox.stub(InstallableItem.prototype, 'restartDownload').returns();

    let scopeStub = {
      $apply: function(callback) {
        callback && callback();
      }
    };

    let timeoutStub = function(callback) {
      callback && callback();
    };

    let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
    sandbox.spy(installCtrl, 'closeDownloadAgainDialog');
    installCtrl.downloadAgain();
    expect(InstallableItem.prototype.restartDownload).calledOnce;
    expect(installCtrl.closeDownloadAgainDialog).calledOnce;
  });

  describe('checking the key for productname, productversion, productdesc, current, lable, show and status', function() {
    let scopeStub = {
      $apply: function(callback) {
        callback && callback();
      }
    };

    let timeoutStub = function(callback) {
      callback && callback();
    };
    it('productName', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      installCtrl.productName('virtualbox');
      expect(installCtrl.productName('virtualbox')).to.equal('Oracle VirtualBox');
    });

    it('Productversion', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.productVersion('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.productVersion('virtualbox')).to.equal('5.0.26');
    });

    it('productdesc', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.productDesc('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.productDesc('virtualbox')).to.equal('A virtualization software package developed by Oracle');
    });

    it('current', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.current('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.current('virtualbox')).to.equal(100);
    });

    it('lable', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.label('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.label('virtualbox')).to.equal('');
    });

    it('show', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.show('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.show('virtualbox')).to.equal(true);
    });

    it('status', function() {
      sandbox.stub(InstallableItem.prototype, 'downloadInstaller').callsArgWith(2, 'timed out');

      let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc);
      installCtrl.status('virtualbox');
      expect(InstallableItem.prototype.downloadInstaller).calledOnce;
      expect(installCtrl.status('virtualbox')).to.equal('Download failed');
    });
  });
});
