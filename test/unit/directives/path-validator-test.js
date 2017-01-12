'use strict';

import chai, { expect } from 'chai';
import { default as sinonChai } from 'sinon-chai';
import 'mock-fs';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);


describe('PathValidatorDirective', function() {
  var $compile, $rootScope, scope;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_) {
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));

  it('shows only notSelected error for empty folder field', function() {
      // Compile a piece of HTML containing the directive
    scope = $rootScope.$new();
    scope.folder = '';
    var compiledDirective = $compile(angular.element(
        `<form name="locationForm"><input ng-model="folder" name="folder" path-validator/>
          <ng-messages for="locationForm.folder.$error">
            <ng-message when="notSelected">notSelected-message</ng-message>
            <ng-message when="notAbsolute">notAbsolute-message</ng-message>
          </ng-messages>
        </form>`))(scope);
    scope.$digest();
      // Check that the compiled element contains the templated content
    expect(compiledDirective.html()).to.contain('notSelected-message');
    expect(compiledDirective.html()).to.not.contain('notAbsolute-message');
  });
});
