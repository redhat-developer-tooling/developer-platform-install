'use strict';

import chai, { expect } from 'chai';
import fs from 'fs';
import sinon from 'sinon';
import Logger from 'browser/services/logger';
import { default as sinonChai } from 'sinon-chai';
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
  let welcomeController;

  ngModule.sharedInjector();
  before(ngModule('devPlatInstaller'));
  before(inject(function(_$controller_, _$rootScope_, _$state_) {
  // The injector unwraps the underscores (_) from around the parameter names when matching
    $controller = _$controller_;
    $rootScope = _$rootScope_;
    welcomeController = $controller('WelcomeController', {
      $state: _$state_,
      $scope: $rootScope,
      electron });
  }));

  beforeEach(function() {
    sandbox.stub(Logger, 'getIpcRenderer').returns({send() {}});
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('openDevSuiteOverview opens external browser with devsuite page', function() {
    sandbox.stub(electron.shell, 'openExternal');
    welcomeController.openDevSuiteOverview();
    expect(electron.shell.openExternal).calledOnce;
  });

  describe('next', function() {
    beforeEach(function() {
      sandbox.stub(welcomeController.router, 'go');
      welcomeController.next();
    });

    it('navigates to account page', function() {
      expect(welcomeController.router.go).calledWith('location');
    });
  });
});
