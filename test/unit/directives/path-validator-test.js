'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'mock-fs';
import Platform from 'browser/services/platform';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);


describe('PathValidatorDirective', function() {
  var $compile, $rootScope, scope, sandbox;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_) {
    sandbox = sinon.sandbox.create();
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
  }));
  afterEach(function() {
    sandbox.restore();
  });
  it('shows only notSelected error for empty folder field', function() {
    sandbox.stub(Platform, 'getOS').returns('win32');
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

  describe('on macos', function() {
    it('does not use windows path format validator', function() {
      sandbox.stub(Platform, 'getOS').returns('darwin');
        // Compile a piece of HTML containing the directive
      scope = $rootScope.$new();
      scope.folder = '/home/user';
      var compiledDirective = $compile(angular.element(
          `<form name="locationForm"><input ng-model="folder" name="folder" path-validator/>
            <ng-messages for="locationForm.folder.$error">
              <ng-message when="invalidFormat">invalidFormat-message</ng-message>
            </ng-messages>
          </form>`))(scope);
      scope.$digest();
        // Check that the compiled element contains the templated content
      expect(compiledDirective.html()).to.not.contain('invalidFormat-message');
    });
  });
  describe('on windows', function() {
    it('run windows path format validator', function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
        // Compile a piece of HTML containing the directive
      scope = $rootScope.$new();
      scope.folder = '/home/user';
      var compiledDirective = $compile(angular.element(
          `<form name="locationForm"><input ng-model="folder" name="folder" path-validator/>
            <ng-messages for="locationForm.folder.$error">
              <ng-message when="invalidFormat">invalidFormat-message</ng-message>
            </ng-messages>
          </form>`))(scope);
      scope.$digest();
        // Check that the compiled element contains the templated content
      expect(compiledDirective.html()).to.contain('invalidFormat-message');
    });
  });

});
