'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'sinon-as-promised';

require('../../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('StartController', function() {
  describe('initial state', function() {
    beforeEach(ngModule('devPlatInstaller'));

    var $controller;

    beforeEach(inject(function(_$controller_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
      $controller = _$controller_;
    }));

    it('removes all window close event listeners', function() {
      let $watch = sinon.stub();
      let $scope = {$watch};
      let removeAllListeners = sinon.stub();
      let electron = {
        remote : {
          getCurrentWindow: function() {
            return {
              removeAllListeners
            };
          }
        }
      };
      $controller('StartController', { $scope, electron });
      expect(removeAllListeners).calledOnce;
      expect(removeAllListeners).calledWith('close');
    });

  });
});
