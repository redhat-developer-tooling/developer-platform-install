'use strict';

import chai, { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import Logger from 'browser/services/logger';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
import ElectronMock from '../../../mock/electron';
import InstallerDataService from 'browser/services/data';
import InstallableItem from 'browser/model/installable-item';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('LocationController', function() {
  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();
  let $controller;
  let $rootScope;
  let locationcontroller;

  ngModule.sharedInjector();
  before(ngModule('devPlatInstaller'));
  before(inject(function(_$controller_, _$rootScope_, _$state_) {
  // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    locationcontroller = $controller('LocationController', {
      $scope: $rootScope,
      $state: _$state_,
      $timeout: undefined,
      installerDataSvc: new InstallerDataService(),
      electron });
  }));

  beforeEach(function() {
    sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('exit', function() {
    it('exit closes active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      locationcontroller.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });

  describe('initial state', function() {
    it('sets correct default target install location', function() {
      expect(locationcontroller.folder).to.be.equal(locationcontroller.installerDataSvc.installDir());
    });
  });

  describe('checkFolder', function() {
    it('sets folderExists attribute to true if target install folder exists', function() {
      sandbox.stub(fs, 'accessSync');
      locationcontroller.checkFolder();
      expect(locationcontroller.folderExists).to.be.equal(true);
    });

    it('sets folderExists attribute to false if target install folder does not exist', function() {
      sandbox.stub(fs, 'accessSync').throws(new Error('Something terrible happened'));
      locationcontroller.checkFolder();
      expect(locationcontroller.folderExists).to.be.equal(false);
    });
  });

  describe('back', function() {
    beforeEach(function() {
      sandbox.stub(locationcontroller.router, 'go');
      locationcontroller.installerDataSvc.installRoot = 'folderName';
      locationcontroller.back();
    });

    it('sets selected folder as target folder in data service', function() {
      expect(locationcontroller.installerDataSvc.installRoot).to.be.equal(locationcontroller.folder);
    });

    it('navigates to account page', function() {
      expect(locationcontroller.router.go).calledWith('account');
    });
  });

  describe('selectFolder', function() {
    beforeEach(function() {

      sandbox.stub(locationcontroller, 'checkFolder');

    });

    it('saves selected folder into folder property', function() {
      sandbox.stub(electron.remote.dialog, 'showOpenDialog').returns(['selectedFolder']);
      locationcontroller.selectFolder();
      expect(locationcontroller.folder).to.be.equal('selectedFolder');
    });

    it('does not change folder property if openDirectory dialog canceled', function() {
      let savedFolder = locationcontroller.folder;
      sandbox.stub(electron.remote.dialog, 'showOpenDialog').returns('');
      expect(locationcontroller.folder).to.be.equal(savedFolder);
      locationcontroller.selectFolder();
      electron.remote.dialog.showOpenDialog.restore();
      sandbox.stub(electron.remote.dialog, 'showOpenDialog').returns(['']);
      locationcontroller.selectFolder();
      expect(locationcontroller.folder).to.be.equal(savedFolder);
    });

    it('validates selected folder', function() {
      sandbox.stub(electron.remote.dialog, 'showOpenDialog').returns(['selectedFolder']);
      locationcontroller.selectFolder();
      expect(locationcontroller.checkFolder).to.be.calledOnce;
    });
  });

  describe('confirm', function() {
    beforeEach(function() {
      sandbox.stub(electron.remote.dialog, 'showOpenDialog').returns(['selectedFolder']);
      sandbox.stub(locationcontroller, 'checkFolder');
      sandbox.stub(locationcontroller.router, 'go');
      sandbox.stub(InstallableItem.prototype, 'setOptionLocation');
      locationcontroller.installerDataSvc.addItemsToInstall(new InstallableItem('jdk', 'url', 'installFile', 'targetFolderName', locationcontroller.installerDataSvc));
      locationcontroller.confirm();
    });

    it('sets install option location for each installer', function() {
      expect(InstallableItem.prototype.setOptionLocation.callCount).to.be.equal(1);
    });

    it('navigates to confirm page', function() {
      expect(locationcontroller.router.go).calledWith('confirm');
    });
  });

});
