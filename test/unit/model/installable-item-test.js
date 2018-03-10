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
import {ProgressState} from 'browser/pages/install/controller';
import Platform from 'browser/services/platform';
import path from 'path';

chai.use(sinonChai);

describe('InstallableItem', function() {

  let infoStub, item, fakeProgress;
  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    let svc = new InstallerDataService();
    item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
  });

  after(function() {
    infoStub.restore();
  });

  let sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    fakeProgress = sandbox.stub(new ProgressState());
    sandbox.stub(Platform, 'getOS').returns('win32');
    sandbox.stub(Platform, 'getEnv').returns({PROGRAMFILES: 'C:\\Program Files'});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('thenInstall method', function() {

    it('should return passed parameter', function() {
      let svc = new InstallerDataService();
      let item1 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
      let item2 = new InstallableItem('cygwin', 'url', 'installFile', 'targetFolderName', svc);
      item1.thenInstall(item2);
      expect(item2.installAfter).to.be.equal(item1);
      expect(item2.getInstallAfter()).to.be.equal(item1);
    });

  });

  describe('install method', function() {

    it('should call installAfterRequirements', function() {
      let svc = new InstallerDataService();
      let item1 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
      let item2 = new InstallableItem('cygwin', 'url', 'installFile', 'targetFolderName', svc);
      item2.installAfterRequirements = sinon.stub();
      item1.isInstalled = sinon.stub().returns(true);
      item1.thenInstall(item2);
      item2.install(fakeProgress, sinon.stub(), sinon.stub());
      expect(item2.installAfterRequirements).to.be.calledOnce;
    });
  });

  describe('getInstallAfter method', function() {
    it('should ignore skipped installers and return first selected for installation', function() {
      let svc = new InstallerDataService();
      let item1 = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
      let item2 = new InstallableItem('cygwin', 'url', 'installFile', 'targetFolderName', svc);
      item2.selectedOption = 'detected';
      let item3 = new InstallableItem('devstudio', 'url', 'installFile', 'targetFolderName', svc);
      item3.selectedOption = 'detected';
      let item4 = new InstallableItem('cdk', 'url', 'installFile', 'targetFolderName', svc);
      svc.addItemsToInstall(item1, item2, item3, item4);
      item1.thenInstall(item2).thenInstall(item3).thenInstall(item4);
      expect(item4.getInstallAfter()).to.be.equal(item1);
    });
  });

  describe('getProductVersion', function() {
    it('returns version for detected installation', function() {
      let item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', new InstallerDataService());
      item.addOption('detected', '1.2', 'location', true);
      item.selectedOption = 'detected';
      expect(item.getProductVersion()).to.be.equal('1.2');
    });

    it('returns version for included product if not detected', function() {
      let item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', new InstallerDataService());
      expect(item.getProductVersion()).to.be.equal(item.version);
    });
  });

  describe('checkFiles method', function() {
    let item;

    beforeEach(function() {
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', new InstallerDataService());
      item.files.foo = {
        dmUrl: 'downloadUrl',
        fileName: 'foo.bar',
        sha256sum: 'sum',
        size: 123
      };
    });

    it('should check each downloaded file', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      let stub = sandbox.stub(Hash.prototype, 'SHA256').resolves('sum');

      return item.checkFiles().then(() => {
        expect(stub).calledTwice;
        expect(stub).calledWith(path.join(item.downloadFolder, item.files.jdk.fileName));
        expect(stub).calledWith(path.join(item.downloadFolder, item.files.foo.fileName));
      });
    });

    it('should confirm file is downloaded when checksums match', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(Hash.prototype, 'SHA256').resolves('sum');
      item.files.jdk.sha256sum = 'sum';

      return item.checkFiles().then(() => {
        expect(item.files.jdk.downloaded).to.be.true;
        expect(item.files.foo.downloaded).to.be.true;
      });
    });

    it('should set the component to download when a checksum does not match', function() {
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(Hash.prototype, 'SHA256').resolves('sum');

      return item.checkFiles().then(() => {
        expect(item.files.jdk.downloaded).to.be.false;
        expect(item.files.foo.downloaded).to.be.true;
        expect(item.useDownload).to.be.true;
      });
    });

    it('should skip files that do not exist', function() {
      let fsStub = sandbox.stub(fs, 'existsSync');
      fsStub.onFirstCall().returns(false);
      fsStub.onSecondCall().returns(true);
      let stub = sandbox.stub(Hash.prototype, 'SHA256').resolves('sum');

      return item.checkFiles().then(() => {
        expect(stub).calledOnce;
        expect(stub).calledWithExactly(path.join(item.downloadFolder, item.files.foo.fileName));
      });
    });

    it('should mark non existing files as not downloaded', function() {
      let fsStub = sandbox.stub(fs, 'existsSync');
      fsStub.onFirstCall().returns(false);
      fsStub.onSecondCall().returns(true);
      sandbox.stub(Hash.prototype, 'SHA256').resolves('sum');

      return item.checkFiles().then(() => {
        expect(item.files.foo.downloaded).to.be.true;
        expect(item.files.jdk.downloaded).to.be.false;
        expect(item.downloaded).to.be.false;
      });
    });
  });

  describe('downloadInstaller method', function() {
    let item, dlStub;

    beforeEach(function() {
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', new InstallerDataService());
      item.files.foo = {
        dmUrl: 'downloadUrl',
        fileName: 'foo.bar',
        sha256sum: 'sum',
        size: 123
      };
      dlStub = sandbox.stub(item, 'startDownload').returns();
    });

    it('should start download for each file not downloaded', function() {
      sandbox.stub(fs, 'existsSync').returns(false);
      item.downloadInstaller(fakeProgress);

      expect(dlStub).calledTwice;
      expect(dlStub).calledWith(path.join(item.downloadFolder, item.files.jdk.fileName), item.files.jdk.dmUrl, item.files.jdk.sha256sum);
      expect(dlStub).calledWith(path.join(item.downloadFolder, item.files.foo.fileName), item.files.foo.dmUrl, item.files.foo.sha256sum);
    });

    it('should skip downloaded and bundled files', function() {
      item.files.bar = {
        dmUrl: 'downloadUrl',
        fileName: 'foo.bar',
        sha256sum: 'sum',
        size: 123,
        downloaded: true
      };
      let closeStub = sandbox.stub(Downloader.prototype, 'closeHandler').returns();
      let fsStub = sandbox.stub(fs, 'existsSync');
      fsStub.onFirstCall().returns(false);
      fsStub.onSecondCall().returns(true);

      item.downloadInstaller(fakeProgress);

      expect(dlStub).calledOnce;
      expect(dlStub).calledWith(path.join(item.downloadFolder, item.files.jdk.fileName), item.files.jdk.dmUrl, item.files.jdk.sha256sum);
      expect(closeStub).calledOnce;
      expect(item.files.foo.downloadedFile).to.equal(path.join(item.bundleFolder, item.files.foo.fileName));
    });
  });

  describe('startDownload method', function() {
    let svc, installItem;

    beforeEach(function() {
      svc = new InstallerDataService();
      installItem = new InstallableItem('jdk', 'downloadUrl', 'fileName', 'targetLocation', svc, false);
      installItem.downloader = new Downloader(null, function() {});
      sandbox.stub(fs, 'createWriteStream').returns();
    });

    it('should start download w/o auth if no username and password provided', function() {
      let downloadStub = sinon.mock(installItem.downloader).expects('download').once().withArgs('url', 'downloadto.zip', 'sha');

      installItem.startDownload('downloadto.zip', 'url', 'sha', undefined, undefined, fakeProgress);

      downloadStub.verify();
    });

    it('should start download w/ auth if username and password provided', function() {
      let downloadStub = sinon.mock(installItem.downloader).expects('downloadAuth').once().withArgs('url', 'user', 'password', 'downloadto.zip', 'sha');

      installItem.startDownload('downloadto.zip', 'url', 'sha', 'user', 'password', fakeProgress);

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

    it('isConfigured should return true', function() {
      expect(item.isConfigured()).to.be.equal(true);
    });
  });

  describe('isConfigured', function() {
    beforeEach(function() {
      let svc = new InstallerDataService();
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
    });

    describe('should return true', function() {
      it('when item is not detected and selected for installation', function() {
        item.setSelectedOption = 'install';
        expect(item.isConfigured()).to.be.true;
      });

      it('when item is detected, valid and selected for installation', function() {
        item.setSelectedOption = 'install';
        item.addOption('detected', '1.0.0', 'path/to/location', true);
        expect(item.isConfigured()).to.be.true;
      });

      it('when item is detected, invalid and selected for installation', function() {
        item.setSelectedOption = 'install';
        item.addOption('detected', '1.0.0', 'path/to/location', false);
        expect(item.isConfigured()).to.be.true;
      });

      it('when item is detected, valid and is not selected for installation', function() {
        item.setSelectedOption = 'detected';
        item.addOption('detected', '1.0.0', 'path/to/location', true);
        expect(item.isConfigured()).to.be.true;
      });

      it('when item is not detected and is not selected for installation', function() {
        item.setSelectedOption = 'detected';
        expect(item.isConfigured()).to.be.true;
      });
    });

    describe('should return false', function() {
      it('when item is detected, invalid and is not selected for installation', function() {
        item.selectedOption = 'detected';
        item.addOption('detected', '1.0.0', 'path/to/location', false);
        expect(item.isConfigured()).to.be.false;
      });
    });
  });

  describe('checkForExistingInstall abstract method', function() {
    it('should not add detected option', function() {
      item.checkForExistingInstall();
      expect(item.option.size).to.be.equal(0);
    });
  });

  describe('detectExistingInstall abstract method', function() {
    it('should not add detected option', function() {
      item.detectExistingInstall();
      expect(item.option.size).to.be.equal(0);
    });
  });

  describe('getDownloadUrl', function() {
    it('should able to get the download Url', function() {
      expect(item.getDownloadUrl()).to.be.equal('url');
    });
  });

  describe('validateVersion abstract method', function() {
    it('should not add detected option', function() {
      item.validateVersion();
      expect(item.option.size).to.be.equal(0);
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
    it('should set location property for specific option if it is present', function() {
      item.addOption('detected');
      item.setOptionLocation('detected', 'location');
      expect(item.option.detected.location).to.be.equal('location');
    });

    it('should not set location for not available option', function() {
      item.setOptionLocation('unknown', 'location');
      expect(item.option.unknown).to.be.undefined;
    });
  });

  describe('restartDownload', function() {
    it('delegatest to downloader instance', function() {
      let installItem = new InstallableItem('jdk', 'downloadUrl', 'fileName', 'targetLocation', new InstallerDataService(), false);
      installItem.downloader = new Downloader(null, function() {});
      let rdStub = sandbox.stub(Downloader.prototype, 'restartDownload').returns();
      installItem.restartDownload();
      expect(rdStub).calledOnce;
    });
  });

  describe('isInvalidVersionDetected', function() {
    beforeEach(function() {
      let svc = new InstallerDataService();
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
    });

    describe('should return true', function() {
      it('if item detectded and invalid', function() {
        item.selectedOption = 'detected';
        item.addOption('detected', '1.0.0', 'path/to/location', false);
        expect(item.isInvalidVersionDetected()).to.be.true;
      });
    });

    describe('should return false', function() {
      it('if not detectded', function() {
        item.selectedOption = 'detected';
        expect(item.isInvalidVersionDetected()).to.be.false;
      });

      it('if item detectded and valid', function() {
        item.selectedOption = 'detected';
        item.addOption('detected', '1.0.0', 'path/to/location', true);
        expect(item.isInvalidVersionDetected()).to.be.false;
      });
    });
  });

  describe('getLocation', function() {
    beforeEach(function() {
      let svc = new InstallerDataService();
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
    });

    it('should return location for detected option if detected', function() {
      item.selectedOption = 'detected';
      item.addOption('detected', '1.0.0', 'path/to/detected/location', true);
      item.addOption('install', '1.0.0', 'path/to/instal/location', true);
      expect(item.getLocation()).to.be.equal('path/to/detected/location');
    });

    it('should return location for install option if not detected', function() {
      item.selectedOption = 'detected';
      item.addOption('install', '1.0.0', 'path/to/instal/location', true);
      expect(item.getLocation()).to.be.equal('path/to/instal/location');
    });
  });

  describe('isValidVerisonDetected', function() {
    beforeEach(function() {
      let svc = new InstallerDataService();
      item = new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', svc);
    });

    it('should return true if detected and version valid', function() {
      item.selectedOption = 'detected';
      item.addOption('detected', '1.0.0', 'path/to/detected/location', true);
      expect(item.isValidVersionDetected()).to.be.equal(true);
    });

    it('should return false if not detected or detected version is invalid', function() {
      item.selectedOption = 'detected';
      expect(item.isValidVersionDetected()).to.be.equal(false);
      item.addOption('detected', '1.0.0', 'path/to/detected/location', false);
      expect(item.isValidVersionDetected()).to.be.equal(false);
    });
  });

  describe('isDisabled', function() {
    it('returns true if referenced at least by one other installer', function() {
      item.references = 1;
      expect(item.isDisabled()).to.be.equal(true);
    });

    it('returns false if there are no references', function() {
      item.references = 0;
      expect(item.isDisabled()).to.be.equal(false);
    });
  });

  describe('getDownloadStatus', function() {
    it('returns \'Selected to download\' if item is not downloaded before', function() {
      item.downloaded = false;
      item.size = 100;
      expect(item.getDownloadStatus()).equals('Selected to download');
    });

    it('returns \'No download required\' if item download size is undefined', function() {
      delete item.size;
      expect(item.getDownloadStatus()).equals('No download required');
    });

    it('returns \'No download required\' if item download size equals 0', function() {
      item.size = 0;
      expect(item.getDownloadStatus()).equals('No download required');
    });

    it('returns \'Previously Downloaded\' if item is downloaded and size is more than 0', function() {
      item.downloaded = true;
      item.size = 100;
      expect(item.getDownloadStatus()).equals('Previously downloaded');
    });
  });

});
