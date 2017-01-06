'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);


describe('LocationController', function() {
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
});
