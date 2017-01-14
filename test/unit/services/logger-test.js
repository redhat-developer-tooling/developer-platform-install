'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Logger from 'browser/services/logger';
import Electron from 'electron';

chai.use(sinonChai);

describe('Logger', function() {
  let sandbox, ipcRenderer, getIpcRendererStub;

  before(function() {
    ipcRenderer = {
      send: function() {}
    };
    expect(Logger.getIpcRenderer()).to.equal(Electron.ipcRenderer);
    getIpcRendererStub = sandbox.stub(Logger, 'getIpcRenderer').returns(ipcRenderer);
  });

  after(function() {
    getIpcRendererStub.restore();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should send install-root message on initialization', function() {
    let spySend = sandbox.spy(ipcRenderer, 'send'),
      installRootPath = 'path/value';

    Logger.initialize(installRootPath);
    expect(spySend).calledWith('install-root', installRootPath);
  });

  it('should send "log" message on log method call', function() {
    let spySend = sandbox.spy(ipcRenderer, 'send'),
      message = 'Message text';

    Logger.log(message);
    expect(spySend).calledWith('log', message);
  });

  it('should log ("INFO: " + message) on info method call', function() {
    let spySend = sandbox.spy(ipcRenderer, 'send'),
      message = 'Message text';

    Logger.info(message);
    expect(spySend).calledWith('log', `INFO: ${message}`);
  });

  it('should log ("ERROR: " + message) on error method call', function() {
    let spySend = sandbox.spy(ipcRenderer, 'send'),
      message = 'Message text';

    Logger.error(message);
    expect(spySend).calledWith('log', `ERROR: ${message}`);
  });
});
