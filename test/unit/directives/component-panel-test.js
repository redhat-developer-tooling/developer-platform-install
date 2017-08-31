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
  it('shows directive', function() {
    let installerDataSvc = sinon.stub(new InstallerDataService());
    installerDataSvc.getRequirementByName.restore();
    installerDataSvc.tempDir.returns('temporaryFolder');
    installerDataSvc.installDir.returns('installFolder');
    installerDataSvc.getUsername.returns('user');
    installerDataSvc.getPassword.returns('password');
    installerDataSvc.komposeDir.returns(path.join(installerDataSvc.installDir(), 'kompose'));
    installerDataSvc.localAppData.restore();

    // Compile a piece of HTML containing the directive
    scope = $rootScope.$new();
    scope.item = new InstallableItem('kompose', 'url', 'kompose.exe', 'kompose', installerDataSvc, false);
    let compiledDirective = $compile(angular.element(
      '<component-panel item="item"></component-panel>'))(scope);
    scope.$digest();
    expect(compiledDirective.html()).to.contain('Kompose');
  });
});
