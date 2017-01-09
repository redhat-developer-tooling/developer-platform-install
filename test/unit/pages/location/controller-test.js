'use strict';

import LocationController from 'browser/pages/location/controller';
import InstallerDataService from 'browser/services/data';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('LocationController', function() {

  let sandbox, locationcontroller, scope, timeout;
  let installerDataSvc;

  beforeEach(function() {

    scope = { '$apply': function() { } };
    timeout = function(cb) { cb(); };
    sandbox = sinon.sandbox.create();
    installerDataSvc = sinon.stub(new InstallerDataService());
    locationcontroller = new LocationController(scope, {}, timeout, installerDataSvc);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('initial state', function() {
    beforeEach(ngModule('devPlatInstaller'));

    var $controller;

    beforeEach(inject(function(_$controller_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));

    it('sets correct default target install location', function() {
      let $watch = sinon.stub();
      let $scope = {$watch};
      let ctrl = $controller('LocationController', { $scope });
      expect(ctrl.folder).to.be.equal(ctrl.installerDataSvc.installDir());
    });

  });

  describe('setCloseDialog', function() {

    it('should able to showCloseDialog', function() {
      locationcontroller.setCloseDialog();
      expect(locationcontroller.showCloseDialog).to.be.equal(true);
    });
  });

});
