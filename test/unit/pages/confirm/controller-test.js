'use strict';
require('../../../angular-test-helper');
require('browser/main');

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';
chai.use(sinonChai);

describe('ConfirmController', function() {
  describe('initial state', function() {
    beforeEach(ngModule('devPlatInstaller'));

    var $controller;

    beforeEach(inject(function(_$controller_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));

    it('installs watchers to track components selected for install', function() {
      let $watch = sinon.stub();
      let $scope = {$watch};
      let ctrl = $controller('ConfirmController', { $scope });

      expect($watch.callCount).to.be.equal(ctrl.installerDataSvc.allInstallables().size+3);
    });

  });
});
