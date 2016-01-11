'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Installer from 'model/helpers/installer';
import mockfs from 'mock-fs';
import path from 'path';
import Logger from 'services/logger';
chai.use(sinonChai);

let fs = require('fs-extra');
let child_process = require('child_process');
let unzip = require('unzip');

describe('Installer', function() {
  let installer;
  let sandbox;
  let fakeProgress;
  let infoStub, errorStub;

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

    mockfs({
      'temp': {
        'script': 'file content here',
        'zipFile.zip': 'content'
      },
      'install' : {}
    });

    fakeProgress = {
      setStatus: function (desc) { return; },
      setCurrent: function (val) {},
      setLabel: function (label) {},
      setComplete: function() {},
      setTotalDownloadSize: function(size) {},
      downloaded: function(amt, time) {}
    };

    installer = new Installer('test', fakeProgress, () => { return 'success'; }, (err) => { return err; });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
  });

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  })

  describe('exec', function() {
    let command = 'command';
    let args = ['arg1', 'arg2', 'arg3'];

    it('should call child_process#exec with the correct parameters', function() {
      let spy = sandbox.spy(child_process, 'exec');

      installer.exec(command, args);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(command, args);
    });

    it('should resolve as true if no error occurs' , function() {
      sandbox.stub(child_process, 'exec').yields();

      return installer.exec(command, args)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sandbox.stub(child_process, 'exec');
      proc.throws(err);

      return installer.exec(command, args)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('execFile', function() {
    let file = path.join('temp', 'script');
    let args = ['arg1', 'arg2', 'arg3'];

    it('should call child_process#execFile with the correct parameters', function() {
      let spy = sandbox.spy(child_process, 'execFile');

      installer.execFile(file, args);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(file, args);
    });

    it('should resolve as true if no error occurs' , function() {
      sandbox.stub(child_process, 'execFile').yields();

      return installer.execFile(file, args)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sandbox.stub(child_process, 'execFile');
      proc.throws(err);

      return installer.execFile(file, args)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('unzip', function() {
    let file = path.join('temp', 'zipFile.zip');
    let dir = 'install';

    it('should read the specified file', function() {
      let spy = sandbox.spy(fs, 'createReadStream');

      installer.unzip(file, dir);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(file);
    });

    it('should call unzip#Extract into a correct folder', function() {
      let spy = sandbox.spy(unzip, 'Extract');

      installer.unzip(file, dir);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith({ path: dir });
    });

    it('should fail with an invalid zip file', function() {
      return installer.unzip(file, dir)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error.message).to.contain('invalid signature');
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sandbox.stub(unzip, 'Extract');
      proc.throws(err);

      return installer.unzip(file, dir)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('moveFile', function() {
    let source = path.join('temp', 'zipFile.zip');
    let target = path.join('install', 'target');

    it('should call fs#move with correct arguments', function() {
      let spy = sandbox.spy(fs, 'move');

      installer.moveFile(source, target);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(source, target);
    });

    it('should resolve as true when no error occurs', function() {
      sandbox.stub(fs, 'move').yields();

      return installer.moveFile(source, target)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sandbox.stub(fs, 'move');
      proc.throws(err);

      return installer.moveFile(source, target)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });

    it('should fail with a non-existing source', function() {
      return installer.moveFile(source, target)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error.message).to.contain('no such file or directory ' + "'" + source + "'");
      });
    });

    it('should not overwrite an existing file', function() {
      let folder = 'install';
      return installer.moveFile('temp/script', folder)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error.message).to.contain('file already exists ' + "'" + folder + "'");
      });
    });
  });

  describe('writeFile', function() {
    let file = path.join('temp', 'file');
    let data = 'data';

    it('should call fs#writeFile with correct arguments', function() {
      let spy = sandbox.spy(fs, 'writeFile');

      installer.writeFile(file, data);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(file, data);
    });

    it('should resolve as true when no error occurs', function() {
      sandbox.stub(fs, 'writeFile').yields();

      return installer.moveFile(file, data)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sandbox.stub(fs, 'writeFile');
      proc.throws(err);

      return installer.writeFile(file, data)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('succeed', function() {
    it('should set progress to complete when the input is truthy', function() {
      let spy = sandbox.spy(fakeProgress, 'setComplete');
      installer.succeed(true);

      expect(spy).to.have.been.calledOnce;
    });

    it('should not succeed with a falsey input', function() {
      let spy = sandbox.spy(fakeProgress, 'setComplete');
      installer.succeed(false);

      expect(spy).to.have.not.been.called;
    });
  });
});
