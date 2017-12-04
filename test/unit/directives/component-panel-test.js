'use strict';

import fs from 'fs-extra';
import path from 'path';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import 'mock-fs';
import InstallableItem from 'browser/model/installable-item';
import InstallerDataService from 'browser/services/data';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('ComponentPanelDirective', function() {
  var $compile, $rootScope, scope, sandbox;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_, _$templateCache_) {
    sandbox = sinon.sandbox.create();
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    let templatePath = path.resolve('./browser/directives/componentPanel.html');
    _$templateCache_.put('directives/componentPanel.html', fs.readFileSync(templatePath, 'utf8'));
  }));
  afterEach(function() {
    sandbox.restore();
  });

  function buildScope() {
    let ds = sinon.stub(new InstallerDataService());
    ds.getRequirementByName.restore();
    ds.tempDir.returns('temporaryFolder');
    ds.installDir.returns('installFolder');
    ds.getUsername.returns('user');
    ds.getPassword.returns('password');
    ds.komposeDir.returns(path.join(ds.installDir(), 'kompose'));
    ds.localAppData.restore();
    let scope = $rootScope.$new();
    scope.item = new InstallableItem('kompose', 'url', 'kompose.exe', 'kompose', ds, false);
    return scope;
  }

  it('generates html with comoponent name and download size 1.00 M', function() {
    let scope = buildScope();
    scope.item.size = 1024*1024;
    let compiledDirective = $compile(angular.element(
      '<component-panel item="item"></component-panel>'))(scope);
    scope.$digest();
    expect(compiledDirective.html()).to.contain('Kompose');
    expect(compiledDirective.html()).to.contain('1.00 MB');
  });

  it('generates html with comoponent name and download size 0 M', function() {
    let scope = buildScope();
    scope.item.size = undefined;
    let compiledDirective = $compile(angular.element(
      '<component-panel item="item"></component-panel>'))(scope);
    scope.$digest();
    expect(compiledDirective.html()).to.contain('0 MB');
  });
});
