'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'mock-fs';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('ProgressBarDirective', function() {
  var $compile, $rootScope, scope, sandbox;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_, _$templateCache_) {
    sandbox = sinon.sandbox.create();
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    // FIXME figure out how to test real template with templateUrl
    // let templatePath = path.resolve('./browser/directives/progressBar.html');
    // let templateContent = fs.readFileSync(templatePath, 'utf8');
    _$templateCache_.put('directives/progressBar.html', '<a>template</a>');
  }));
  afterEach(function() {
    sandbox.restore();
  });
  it('shows directive', function() {
      // Compile a piece of HTML containing the directive
    scope = $rootScope.$new();
    $compile(angular.element(
        '<progress-bar></progress-bar>'))(scope);
    scope.$digest();
      // Check that the compiled element contains the templated content
    // expect(compiledDirective.html()).to.contain('notSelected-message');
    // expect(compiledDirective.html()).to.not.contain('notAbsolute-message');
  });

});
