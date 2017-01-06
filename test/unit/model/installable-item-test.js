'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import InstallableItem from 'browser/model/installable-item';
import Logger from 'browser/services/logger';
import Downloader from 'browser/model/helpers/downloader';
import InstallerDataService from 'browser/services/data';
import Hash from 'browser/model/helpers/hash';

chai.use(sinonChai);

describe('InstallableItem', function() {

  let infoStub, item;
  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    let svc = new InstallerDataService();
    item = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
  });

  after(function() {
    infoStub.restore();
  });

  let sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('thenInstall method', function() {

    it('should return passed parameter', function() {
      let svc = new InstallerDataService();
      let item1 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
      let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', svc);
      item1.thenInstall(item2);
      expect(item2.installAfter).to.be.equal(item1);
      expect(item2.getInstallAfter()).to.be.equal(item1);
    });

  });

  describe('getInstallAfter method', function() {

    it('should ignore skipped installers and return first selected for installation', function() {
      let svc = new InstallerDataService();
      let item1 = new InstallableItem('jdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
      let item2 = new InstallableItem('cygwin', 1000, 'url', 'installFile', 'targetFolderName', svc);
      item2.selectedOption = 'detected';
      let item3 = new InstallableItem('jbds', 1000, 'url', 'installFile', 'targetFolderName', svc);
      item3.selectedOption = 'detected';
      let item4 = new InstallableItem('cdk', 1000, 'url', 'installFile', 'targetFolderName', svc);
      svc.addItemsToInstall(item1, item2, item3, item4);
      item1.thenInstall(item2).thenInstall(item3).thenInstall(item4);
      expect(item4.getInstallAfter()).to.be.equal(item1);
    });

  });

  describe('checkAndDownload method', function() {
    let svc, downloader, installItem;

    beforeEach(function() {
      svc = new InstallerDataService();
      downloader = new Downloader(null, function() {});
      installItem = new InstallableItem('jdk', 5000, 'downloadUrl', null, 'targetLocation', svc, false);
      installItem.downloader = downloader;
    });

    it('should start to download file if there is no dowloaded file', function() {
      sandbox.stub(fs, 'existsSync').returns(false);
      let startDlMock = sandbox.stub(installItem, 'startDownload').returns();

      installItem.checkAndDownload('temp/inatall.zip', 'url', 'sha');

      expect(startDlMock).to.have.been.calledOnce;
    });

    it('should start download file if there is dowloaded file with wrong checksum', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      let startDlMock = sandbox.stub(installItem, 'startDownload').returns();
      sandbox.stub(Hash.prototype, 'SHA256').yields('wrongsha');

      installItem.checkAndDownload('temp/inatall.zip', 'url', 'sha');

      expect(startDlMock).to.have.been.calledOnce;
    });

    it('should not start download file if there is dowloaded file with correct checksum', function() {
      let successHandStub = sandbox.stub(downloader, 'successHandler').returns();
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(installItem, 'startDownload').returns();
      sandbox.stub(Hash.prototype, 'SHA256').yields('sha');

      installItem.checkAndDownload('temp/inatall.zip', 'url', 'sha');

      expect(successHandStub).to.have.been.calledOnce;
    });

  });

  describe('startDownload method', function() {
    let svc, installItem;

    beforeEach(function() {
      svc = new InstallerDataService();
      installItem = new InstallableItem('jdk', 5000, 'downloadUrl', null, 'targetLocation', svc, false);
      installItem.downloader = new Downloader(null, function() {});
    });

    it('should start download w/o auth if no username and password provided', function() {
      let setWriteStreamStub = sinon.mock(installItem.downloader).expects('setWriteStream').once(),
        downloadStub = sinon.mock(installItem.downloader).expects('download').once().withArgs('url', 'downloadto.zip', 'sha');

      installItem.startDownload('downloadto.zip', 'url', 'sha');

      setWriteStreamStub.verify();
      downloadStub.verify();
    });

    it('should start download w/ auth if username and password provided', function() {
      let setWriteStreamStub = sinon.mock(installItem.downloader).expects('setWriteStream').once(),
        downloadStub = sinon.mock(installItem.downloader).expects('downloadAuth').once().withArgs('url', 'user', 'password', 'downloadto.zip', 'sha');

      installItem.startDownload('downloadto.zip', 'url', 'sha', 'user', 'password');

      setWriteStreamStub.verify();
      downloadStub.verify();
    });

  });

  describe('when instantiated', function() {
    it('should have no existing install', function() {
      expect(item.hasExistingInstall()).to.be.equal(false);
    });

    it('should have no installAfter initialized', function() {
      expect(item.getInstallAfter()).to.be.equal(undefined);
    });

    it('should have no invalid version detected', function() {
      expect(item.isInvalidVersionDetected()).to.be.equal(false);
    });

    it('should have nothing detected', function() {
      expect(item.isNotDetected()).to.be.equal(true);
    });

    it('isConfigured', function() {
      expect(item.isConfigured()).to.be.equal(true);
    });
  });

  describe('checkForExistingInstall abstract method', function() {
    it('should not add detected option when called', function() {
      expect(item.checkForExistingInstall()).to.be.equal(undefined);
    });
  });

  describe('changeIsCollapsed method', function() {
    it('should invert isCollaspsed property for object\'s instance', function() {
      let collapsed = item.isCollapsed;
      item.changeIsCollapsed();
      expect(item.isCollapsed).to.be.equal(!collapsed);
    });
  });

  describe('setOptionLocation method', function() {
    it('should set location property for specific option', function() {
      item.addOption('detected');
      item.setOptionLocation('detected', 'location');
      expect(item.option.detected.location).to.be.equal('location');
    });
  });

});
