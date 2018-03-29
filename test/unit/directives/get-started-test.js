'use strict';

import fs from 'fs-extra';
import path from 'path';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallableItem from 'browser/model/installable-item';
import getStarted from 'browser/directives/getStarted';
import ElectronMock from '../../mock/electron';
require('../../angular-test-helper');
require('browser/main');

chai.use(sinonChai);

describe('GetStartedDirective', function() {
  var $compile, $rootScope, scope, sandbox, electron, svc;
  beforeEach(ngModule('devPlatInstaller'));
  beforeEach(inject(function(_$compile_, _$rootScope_, _$templateCache_, _installerDataSvc_) {
    sandbox = sinon.sandbox.create();
    // The injector unwraps the underscores (_) from around the parameter names when matching
    $compile = _$compile_;
    $rootScope = _$rootScope_;
    svc = _installerDataSvc_;
    svc.addItemToInstall('cdk', new InstallableItem('cdk', 'url', 'minishift.exe', 'kompose', svc, false));
    let templatePath = path.resolve('./browser/directives/getStarted.html');
    _$templateCache_.put('directives/getStarted.html', fs.readFileSync(templatePath, 'utf8'));
    electron = new ElectronMock();
  }));
  afterEach(function() {
    sandbox.restore();
  });

  it('generates html with comoponent name', function() {
    let scope = $rootScope.$new();
    let compiledDirective = $compile(angular.element(
      '<get-started component="\'cdk\'"></get-started>'))(scope);
    scope.$digest();
    expect(compiledDirective.html()).to.contain(svc.getRequirementByName('cdk').name);
  });
});
