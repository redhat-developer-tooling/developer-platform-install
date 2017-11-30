'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallController from 'browser/pages/install/controller';
import { ProgressState } from 'browser/pages/install/controller';
import InstallerDataService from 'browser/services/data';
import VirtualBoxInstall from 'browser/model/virtualbox';
import JdkInstall from 'browser/model/jdk-install';
import InstallableItem from 'browser/model/installable-item';
import Logger from 'browser/services/logger';
import ElectronMock from '../../../mock/electron';
import { JSDOM } from 'jsdom';
import fs from 'fs';
chai.use(sinonChai);

describe('Install controller', function() {

  let installerDataSvc, sandbox;
  let vbox;
  let logStub, fsStub, infoStub, errorStub;
  let timeoutStub = sinon.stub();
  let window = new JSDOM('<html>').window;

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
    it('should verify existing files', function() {
      let stub = sandbox.stub(InstallController.prototype, 'verifyFiles').returns();
      new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);

      expect(stub).calledOnce;
    });

    it('should register an event handler for 3 different events', function() {
      sandbox.stub(InstallController.prototype, 'verifyFiles').returns();
      let tron = {
        ipcRenderer: {
          setMaxListeners: function() {},
          on: function() {}
        }
      };

      let spy = sandbox.spy(tron.ipcRenderer, 'on');
      new InstallController({}, {}, installerDataSvc, tron, window);

      expect(spy).calledThrice;
      expect(spy).calledWith('checkComplete');
      expect(spy).calledWith('downloadingComplete');
      expect(spy).calledWith('installComplete');
    });
  });

  describe('verifyFiles', function() {
    let verifyStub;

    beforeEach(function() {
      verifyStub = sandbox.stub(installerDataSvc, 'verifyExistingFiles').returns();
    });

    it('should select component for file verification if some of its files are downloaded', function() {
      vbox.files.virtualbox.downloaded = true;
      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);

      expect(verifyStub).calledOnce;
      expect(verifyStub).calledWith(ctrl.itemProgress, 'virtualbox');
    });

    it('should skip a component if none of its files are downloaded', function() {
      vbox.files.virtualbox.downloaded = false;
      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);

      expect(verifyStub).calledOnce;
      expect(verifyStub).calledWithExactly(ctrl.itemProgress);
    });

    it('should skip a component if it is bundled', function() {
      vbox.files.virtualbox.downloaded = true;
      vbox.downloadedFile = vbox.bundledFile;
      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);

      expect(verifyStub).calledOnce;
      expect(verifyStub).calledWithExactly(ctrl.itemProgress);
    });

    it('should work for multiple components', function() {
      vbox.files.virtualbox.downloaded = true;
      let jdk = new JdkInstall(installerDataSvc, 'jdk8', 'downloadUrl', 'fileName', 'sha256sum');
      installerDataSvc.addItemToInstall('jdk', jdk);
      jdk.files.jdk.downloaded = true;

      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);

      expect(verifyStub).calledOnce;
      expect(verifyStub).calledWith(ctrl.itemProgress, 'virtualbox', 'jdk');
    });
  });

  describe('downloadFiles', function() {
    let dlStub, progressStub;

    beforeEach(function() {
      sandbox.stub(installerDataSvc, 'verifyExistingFiles').returns();
      dlStub = sandbox.stub(installerDataSvc, 'download').returns();
      progressStub = sandbox.stub(ProgressState.prototype, 'setTotalAmount').returns();
    });

    it('should process components that require download', function() {
      let jdk = new JdkInstall(installerDataSvc, 'jdk8', 'downloadUrl', 'fileName', 'sha256sum');
      installerDataSvc.addItemToInstall('jdk', jdk);
      vbox.downloaded = false;
      jdk.downloaded = true;

      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);
      ctrl.downloadFiles();

      expect(dlStub).calledOnce;
      expect(dlStub).calledWithExactly(ctrl.itemProgress, ctrl.totalDownloads, ctrl.failedDownloads, ctrl.$window.navigator.userAgent, 'virtualbox');
    });

    it('should set the total amount to the sum of file sizes', function() {
      vbox.useDownload = true;
      vbox.files.foo = {
        dmUrl: 'downloadUrl',
        fileName: 'foo.bar',
        sha256sum: 'sum',
        size: 123
      };

      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);
      ctrl.downloadFiles();

      expect(progressStub).calledOnce;
      expect(progressStub).calledWith(vbox.files.virtualbox.size + vbox.files.foo.size);
    });

    it('should set total download count to number of pending files', function() {
      let jdk = new JdkInstall(installerDataSvc, 'jdk8', 'downloadUrl', 'fileName', 'sha256sum');
      installerDataSvc.addItemToInstall('jdk', jdk);
      jdk.useDownload = true;
      vbox.useDownload = true;
      vbox.files.foo = {
        dmUrl: 'downloadUrl',
        fileName: 'foo.bar',
        sha256sum: 'sum',
        size: 123
      };

      let ctrl = new InstallController({}, {}, installerDataSvc, new ElectronMock(), window);
      ctrl.downloadFiles();

      expect(dlStub).calledOnce;
      expect(dlStub).calledWithExactly(ctrl.itemProgress, 3, ctrl.failedDownloads, ctrl.$window.navigator.userAgent, 'virtualbox', 'jdk');
    });
  });

  describe('triggerInstall', function() {
    let vboxStub, doneStub;

    beforeEach(function() {
      sandbox.stub(vbox, 'isDownloadRequired').returns(false);
      vboxStub = sandbox.stub(vbox, 'install').yields();
      doneStub = sandbox.stub(installerDataSvc, 'installDone').returns();
    });

    it.skip('logs error in case of install failed', function() {
      vbox.install.restore();
      sandbox.stub(vbox, 'install').callsArgWith(2, 'Error');
      new InstallController({}, timeoutStub, installerDataSvc, new ElectronMock());
      expect(errorStub).calledTwice;
    });

    it.skip('should call the installables install method', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController({}, timeoutStub, installerDataSvc, new ElectronMock());
      expect(vboxStub).calledOnce;
    });

    it.skip('should call data services installDone when install finishes', function() {
      sandbox.stub(installerDataSvc, 'startInstall').returns();

      new InstallController({}, timeoutStub, installerDataSvc, new ElectronMock());

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
        progress.setTotalAmount(1000);
        expect(progress.totalAmount).to.be.equal(1000);
      });
    });
    describe('setCurrent', function() {
      describe('should update', function() {
        let progress;
        beforeEach(function() {
          progress = new ProgressState();
          progress.$timeout = sinon.stub();
          progress.$scope = {$apply:sinon.stub()};
          progress.setStatus('Downloading');
          progress.setTotalAmount(1000);
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
            progress.sizeInKB(progress.currentAmount) + ' / ' + progress.sizeInKB(progress.totalAmount) + ' (' + progress.current + '%)'
          );
        });
        it('ETA to second', function() {
          sinon.stub(progress, 'calculateTime').returns(1000);
          progress.setCurrent(101);
          expect(progress.label).to.have.string('sec');
        });
        it('ETA to seconds', function() {
          sinon.stub(progress, 'calculateTime').returns(45000);
          progress.setCurrent(102);
          expect(progress.label).to.have.string('secs');
        });
        it('ETA to minute', function() {
          sinon.stub(progress, 'calculateTime').returns(65000);
          progress.setCurrent(103);
          expect(progress.label).to.have.string('min');
        });
        it('ETA to minutes', function() {
          sinon.stub(progress, 'calculateTime').returns(125000);
          progress.setCurrent(104);
          expect(progress.label).to.have.string('mins');
        });
        it('ETA to hour', function() {
          sinon.stub(progress, 'calculateTime').returns(3600000);
          progress.setCurrent(105);
          expect(progress.label).to.have.string('hr');
        });
        it('ETA to hours', function() {
          sinon.stub(progress, 'calculateTime').returns(7200000);
          progress.setCurrent(106);
          expect(progress.label).to.have.string('hrs');
        });
        it('ETA to day', function() {
          sinon.stub(progress, 'calculateTime').returns(3600000*24);
          progress.setCurrent(105);
          expect(progress.label).to.have.string('day');
        });
        it('ETA to days', function() {
          sinon.stub(progress, 'calculateTime').returns(7200000*24);
          progress.setCurrent(106);
          expect(progress.label).to.have.string('days');
        });
        it('ETA to year', function() {
          sinon.stub(progress, 'calculateTime').returns(3600000*24*366);
          progress.setCurrent(105);
          expect(progress.label).to.have.string('year');
        });
        it('ETA to years', function() {
          sinon.stub(progress, 'calculateTime').returns(7200000*24*366);
          progress.setCurrent(106);
          expect(progress.label).to.have.string('years');
        });

      });
    });
    describe('setStatus', function() {
      let progress;
      beforeEach(function() {
        progress = new ProgressState();
        progress.$timeout = sinon.stub();
        progress.$scope = {$apply:sinon.stub()};
      });
      it('does nothing if status is the same', function() {
        progress.current = 1;
        progress.setStatus('');
        expect(progress.current).equals(1);
      });
      it.skip('sets prcentage to 100 and clear lable if status is not "Downloading"', function() {
        progress.setStatus('Verifying something');
        expect(progress.$scope.$apply).have.been.calledOnce;
        expect(progress.label).equals('');
        expect(progress.current).equals(100);
      });
      it.skip('resets downloading stats if status is "Downloading"', function() {
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
        progress.$timeout = sinon.stub();
        progress.$scope = {$apply:sinon.stub()};
        progress.setTotalAmount(1000);
        progress.setCurrent(100);
        progress.setComplete();
      });
      it('sets status to "Complete"', function() {
        expect(progress.status).equals('Complete');
      });
    });
    describe('calculateTime', function() {
      let progress;
      beforeEach(function() {
        progress = new ProgressState();
        progress.lastTime = 100000;
        progress.totalAmount = 9000000;
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

    describe('resetTime', function() {
      it('resets speed and time calculation', function() {
        let progress = new ProgressState();
        progress.lastTime = 100000;
        progress.lastSpeed = 1000;
        progress.averageSpeed = 100;
        progress.totalAmount = 9000000;
        progress.currentAmount = 400000;

        progress.resetTime();

        expect(progress.lastSpeed).to.equal(0);
        expect(progress.lastAmount).to.equal(progress.currentAmount);
        expect(progress.averageSpeed).to.equal(0);
      });
    });
  });

  it.skip('downloadAgain closes dialog with error and start download for failed installers', function() {
    sandbox.stub(InstallableItem.prototype, 'downloadInstaller');
    sandbox.stub(InstallableItem.prototype, 'restartDownload').returns();

    let scopeStub = {
      $apply: function(callback) {
        callback && callback();
      }
    };

    let timeoutStub = function(callback) {
      callback && callback();
    };

    let installCtrl = new InstallController(scopeStub, timeoutStub, installerDataSvc, new ElectronMock());
    sandbox.spy(installCtrl, 'closeDownloadAgainDialog');
    installCtrl.downloadAgain();
    expect(InstallableItem.prototype.restartDownload).calledOnce;
    expect(installCtrl.closeDownloadAgainDialog).calledOnce;
  });
});
