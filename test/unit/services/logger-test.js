'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import Logger from 'browser/services/logger';
import path from 'path';
import os from 'os';
import fs from 'fs';
import fsExtra from 'fs-extra';
chai.use(sinonChai);

describe('Logger', function() {
  let sandbox, ipcRenderer;

  before(function(){
    ipcRenderer = {
      send: function(event, key) {}
    };
    // this call is required to getIpcRenderer coverage in report
    expect(Logger.getIpcRenderer()).to.equal(undefined);
    Logger.getIpcRenderer = function () { return ipcRenderer; };
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  it('should send install-root message on initialization', function() {
    let spySend = sandbox.spy(ipcRenderer, "send"),
      logger = new Logger(),
      installRootPath = "path/value";

    Logger.initialize(installRootPath);
    expect(spySend).calledWith('install-root', installRootPath);
  });

  it('should send "log" message on log method call', function() {
    let spySend = sandbox.spy(ipcRenderer, "send"),
      logger = new Logger(),
      message = "Message text";

    Logger.log(message);
    expect(spySend).calledWith('log', message);
  });

  it('should log ("INFO: " + message) on info method call', function() {
    let spySend = sandbox.spy(ipcRenderer, "send"),
      logger = new Logger(),
      message = "Message text";

    Logger.info(message);
    expect(spySend).calledWith('log', `INFO: ${message}`);
  });

  it('should log ("ERROR: " + message) on error method call', function() {
    let spySend = sandbox.spy(ipcRenderer, "send"),
      logger = new Logger(),
      message = "Message text";

    Logger.error(message);
    expect(spySend).calledWith('log', `ERROR: ${message}`);
  });
});
