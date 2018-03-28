'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Logger from 'browser/services/logger';
import proxyquire from 'proxyquire';

chai.use(sinonChai);

describe('Logger', function() {
  let sandbox, ipcRenderer, getIpcRendererStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    ipcRenderer = {
      send: function() {}
    };
    getIpcRendererStub = sandbox.stub(Logger, 'getIpcRenderer').returns(ipcRenderer);
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

  describe('getIpcRenderer', function() {
    it('should return electron\'s ipcRenderer if not undefined', function() {
      Logger.getIpcRenderer.restore();
      let electronMock = {
          ipcRenderer: { send: function(){}}
      };
      let logger = proxyquire('browser/services/logger', {
        electron: electronMock
      });
      expect(logger.default.getIpcRenderer()).equals(electronMock.ipcRenderer);
    })

    it('should return electron\'s ipcRenderer stub if undefined', function() {
      Logger.getIpcRenderer.restore();
      let electronMock = {
          ipcRenderer: undefined
      };
      let logger = proxyquire('browser/services/logger', {
        electron: electronMock
      });
      expect(logger.default.getIpcRenderer()).not.undefined;
      sandbox.spy(logger.default.getIpcRenderer(), 'send');
      logger.default.log('mesage');
      expect(logger.default.getIpcRenderer().send).calledOnce;
    })
  });
});
