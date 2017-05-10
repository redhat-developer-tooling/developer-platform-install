'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallController from 'browser/pages/install/controller';
import { ProgressState } from 'browser/pages/install/controller';
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
    vbox = new VirtualBoxInstall(installerDataSvc, 'virtualbox',
      'http://download.virtualbox.org/virtualbox/${version}/VirtualBox-${version}-${revision}-Win.exe', 'virtualbox.exe', 'sha', '5.0.8', '103449');

    installerDataSvc.addItemToInstall(VirtualBoxInstall.KEY, vbox);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('constrution', function() {
    it('should process all installables', function() {
      let stub = sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      new InstallController({}, {}, installerDataSvc);

      expect(stub).calledOnce;
      expect(stub).calledWith(VirtualBoxInstall.KEY, vbox);
    });

    it('should mark skipped installables as done', function() {
      let stub = sandbox.stub(installerDataSvc, 'setupDone').returns();
      sandbox.stub(InstallController.prototype, 'processInstallable').returns();
      sandbox.stub(vbox, 'isSkipped').returns(true);
      new InstallController({}, {}, installerDataSvc);
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
      new InstallController({}, timeoutStub, installerDataSvc);

      expect(dlStub).calledOnce;
      expect(dlStub).calledWith('virtualbox', vbox);
    });

    it('should not trigger download on already downloaded items', function() {
      new InstallController({}, timeoutStub, installerDataSvc);

    });

    it('should trigger install on already downloaded items', function() {
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      new InstallController({}, timeoutStub, installerDataSvc);

      expect(inStub).calledOnce;
      expect(inStub).calledWith('virtualbox', vbox);
    });
  });

  describe('triggerDownload', function() {
    let vboxStub, doneStub;

    beforeEach(function() {
      vboxStub = sandbox.stub(vbox, 'downloadInstaller').yields();
      doneStub = sandbox.stub(installerDataSvc, 'downloadDone').returns();
    });

    it('data service should register the new downloads', function() {
      let spy = sandbox.spy(installerDataSvc, 'startDownload');
      new InstallController({}, timeoutStub, installerDataSvc);

      expect(spy).calledOnce;
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.downloading).to.be.true;
      expect(installerDataSvc.toDownload.size).to.equal(1);
    });

    it('should call the installables downloadInstaller method', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      new InstallController({}, timeoutStub, installerDataSvc);
      expect(vboxStub).calledOnce;
    });

    it('should call data services downloadDone when download finishes', function() {
      sandbox.stub(installerDataSvc, 'startDownload').returns();

      new InstallController({}, timeoutStub, installerDataSvc);

      expect(doneStub).calledOnce;
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });

  describe('triggerInstall', function() {
    let vboxStub, doneStub;

    beforeEach(function() {
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      vboxStub = sandbox.stub(vbox, 'install').yields();
      doneStub = sandbox.stub(installerDataSvc, 'installDone').returns();
    });

    it('logs error in case of install failed', function() {
      vbox.install.restore();
      sandbox.stub(vbox, 'install').callsArgWith(2, 'Error');
      new InstallController({}, timeoutStub, installerDataSvc);
      expect(errorStub).calledTwice;
    });

    it('data service should register the new install', function() {
      let spy = sandbox.spy(installerDataSvc, 'startInstall');
      new InstallController({}, timeoutStub, installerDataSvc);

      expect(spy).calledOnce;
      expect(spy).calledWith('virtualbox');

      expect(installerDataSvc.installing).to.be.true;
      expect(installerDataSvc.toInstall.size).to.equal(1);
    });

    it('should call the installables install method', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController({}, timeoutStub, installerDataSvc);
      expect(vboxStub).calledOnce;
    });

    it('should call data services installDone when install finishes', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController({}, timeoutStub, installerDataSvc);

      expect(doneStub).calledOnce;
      expect(doneStub).calledWith(sinon.match.any, 'virtualbox');
    });
  });

  describe('ProgressState', function() {
    it('should set default min/max values when passed to constructor', function() {
      let progress = new ProgressState('key', 'prodName', 'prodVersion', 'productDesc', {}, sinon.stub(), 100, 1000);
      expect(progress.min).equals(100);
      expect(progress.max).equals(1000);
    });
    describe('setTotalDownloadSize', function() {
      it('should set totalSize property value', function() {
        let progress = new ProgressState();
        progress.setTotalDownloadSize(1000);
        expect(progress.totalSize).to.be.equal(1000);
      });
    });
    describe('setCurrent', function() {
      it('should do nothing if new current progress value is the same', function() {
        let progress = new ProgressState();
        progress.$timeout = sandbox.stub().yields();
        progress.setCurrent(0);
        expect(progress.$timeout).to.be.not.called;
      });
      describe('should update', function() {
        let progress;
        before(function() {
          progress = new ProgressState();
          progress.$timeout = sinon.stub().yields();
          progress.$scope = {$apply:sinon.stub()};
          progress.setTotalDownloadSize(1000);
          progress.setCurrent(100);
        });
        it('current progress amount value', function() {
          expect(progress.currentAmount).equals(100);
        });
        it('current prcentage', function() {
          expect(progress.current).equals(10);
        });
        it('lable value', function() {
          expect(progress.label).to.have.string(
            progress.sizeInKB(progress.currentAmount) + ' / ' + progress.sizeInKB(progress.totalSize) + ' (' + progress.current + '%)'
          );
        });
        it('calls angular async update', function() {
          expect(progress.$scope.$apply).calledOnce;
        });
      });
    });
    describe('setStatus', function() {
      let progress;
      beforeEach(function() {
        progress = new ProgressState();
        progress.$timeout = sinon.stub().yields();
        progress.$scope = {$apply:sinon.stub()};
      });
      it('does nothing if status is the same', function() {
        progress.current = 1;
        progress.setStatus('');
        expect(progress.current).equals(1);
      });
      it('sets prcentage to 100 and clear lable if status is not "Downloading"', function() {
        progress.setStatus('Verifying something');
        expect(progress.$scope.$apply).have.been.calledOnce;
        expect(progress.label).equals('');
        expect(progress.current).equals(100);
      });
      it('resets downloading stats if status is "Downloading"', function() {
        progress.setStatus('Downloading');
        expect(progress.$scope.$apply).have.been.calledOnce;
        expect(progress.current).equals(0);
        expect(progress.label).equals(0 + '%');
        expect(progress.currentAmount).equals(0);
        expect(progress.totalSize).equals(0);
      });
    });
    describe('setComplete', function() {
      let progress;
      before(function() {
        progress = new ProgressState();
        progress.$timeout = sinon.stub().yields();
        progress.$scope = {$apply:sinon.stub()};
        progress.setTotalDownloadSize(1000);
        progress.setCurrent(100);
        progress.setComplete();
      });
      it('sets status to "Complete"', function() {
        expect(progress.status).equals('Complete');
      });
      it('sets label to 100%', function() {
        expect(progress.label).equals('');
      });
      it('sets current prcentage to 100',  function() {
        expect(progress.current).equals(100);
      });
    });
    describe('calculateTime', function() {
      let progress;
      beforeEach(function() {
        progress = new ProgressState();
        progress.lastTime = 100000;
        progress.totalSize = 9000000;
        progress.currentAmount = 400000;
        sandbox.stub(Date.prototype, 'getTime').returns(101000);
      });

      it('returns time estimate based on average speed', function() {
        expect(progress.calculateTime()).to.equal((9000000 - 400000) / 400);
      });

      it('uses exponential moving average speed', function() {
        progress.averageSpeed = 800;

        //average speed moves with a smoothing factor
        let result = progress.calculateTime();
        expect(progress.averageSpeed).to.equal(0.15 * 400 + 0.85 * 800);
        expect(result).to.equal((9000000 - 400000) / (0.15 * 400 + 0.85 * 800));
      });
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
      expect(installCtrl.productVersion('virtualbox')).to.equal('5.1.22');
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
