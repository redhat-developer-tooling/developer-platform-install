'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import fs from 'fs-extra';
import 'mock-fs';
import Platform from 'browser/services/platform';
import path from 'path';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('BreadcrumbDirective', function() {
  var $compile, $rootScope, scope, sandbox;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_, _$templateCache_) {
    sandbox = sinon.sandbox.create();
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    let templatePath = path.resolve('./browser/directives/breadcrumbs.html');
    let templateContent = console.log(fs.readFileSync(templatePath,'utf8'));
    // FIXME figure out how to test real template with templateUrl
    _$templateCache_.put('directives/breadcrumbs.html','<a>template</a>');
  }));
  afterEach(function(){
    sandbox.restore();
  })
  it('shows directive', function() {
      // Compile a piece of HTML containing the directive
    scope = $rootScope.$new();
    scope.folder = '';
    scope.trustSrc = function(src) {
      return $sce.trustAsResourceUrl(src);
    };
    var compiledDirective = $compile(angular.element(
        `<breadcrumb></breadcrumb>`))(scope);
    scope.$digest();
      // Check that the compiled element contains the templated content
    // expect(compiledDirective.html()).to.contain('notSelected-message');
    // expect(compiledDirective.html()).to.not.contain('notAbsolute-message');
  });

});
