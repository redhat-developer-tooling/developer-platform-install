'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import ElectronMock from '../../../mock/electron';
import AboutController from 'browser/pages/about/controller';
chai.use(sinonChai);

describe('About controller', function() {

  let controller, scope;
  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();

  beforeEach(function() {
    scope = { '$apply': function() { }, version : "2.1.0-GA" };
    controller = new AboutController({}, scope, electron);
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('documentation', function() {
    it('should open documentation url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.documentation();
      expect(electron.shell.openExternal).calledOnce;
    });
  });

  describe('release', function() {
    it('should open release url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.release();
      expect(electron.shell.openExternal).calledOnce;
    });
  });

  describe('report', function() {
    it('should open report url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.report();
      expect(electron.shell.openExternal).calledOnce;
    });
  });
});
