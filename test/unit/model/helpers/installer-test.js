'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Installer from 'model/helpers/installer';
import mockfs from 'mock-fs';
import path from 'path';
import Logger from 'services/logger';
import fs from 'fs-extra';
import child_process from 'child_process';
import unzip from 'unzip';
chai.use(sinonChai);

describe('Installer', function() {
  // let sandbox;
  let infoStub, errorStub;

  let fakeProgress = {
    setStatus: function (desc) { return; },
    setCurrent: function (val) {},
    setLabel: function (label) {},
    setComplete: function() {},
    setTotalDownloadSize: function(size) {},
    downloaded: function(amt, time) {}
  };
  let installer = new Installer('test', fakeProgress, () => { return 'success'; }, (err) => { return err; });

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

    mockfs({
      someTempFolder: {
        somefile : 'nothing to see here'
      },
      anInstallFolder : {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    infoStub.restore();
    errorStub.restore();
    mockfs.restore();
  });

  describe('exec', function() {
    let command = 'command';
    let args = ['arg1', 'arg2', 'arg3'];

    it('should call child_process#exec with the correct parameters', function() {
      let stub = sinon.stub(child_process, 'exec');
      stub.yields();

      installer.exec(command, args);

      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(command, args);
      stub.restore();
    });

    it('should resolve as true if no error occurs' , function() {
      let stub = sinon.stub(child_process, 'exec').yields();

      return installer.exec(command, args)
      .then(function(result) {
        expect(result).to.equal(true);
        stub.restore();
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sinon.stub(child_process, 'exec');
      proc.throws(err);

      return installer.exec(command, args)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
        proc.restore();
      });
    });
  });

  describe('execFile', function() {
    let args = ['arg1', 'arg2', 'arg3'];
    let file = path.join('someTempFolder', 'somefile');

    it('should call child_process#execFile with the correct parameters', function() {
      let stub = sinon.stub(child_process, 'execFile');
      stub.yields();

      installer.execFile(file, args);

      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(file, args);
      stub.restore();
    });

    it('should resolve as true if no error occurs' , function() {
      let stub = sinon.stub(child_process, 'execFile').yields();

      return installer.execFile(file, args)
      .then(function(result) {
        expect(result).to.equal(true);
        stub.restore();
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sinon.stub(child_process, 'execFile');
      proc.throws(err);

      return installer.execFile(file, args)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
        proc.restore();
      });
    });
  });

  describe('unzip', function() {
    let dir = 'anInstallFolder';
    let file = path.join('someTempFolder', 'somefile');

    it('should read the specified file', function() {
      let stub = sinon.stub(unzip, 'Extract').yields();
      let spy = sinon.spy(fs, 'createReadStream');

      installer.unzip(file, dir);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(file);

      stub.restore();
      spy.restore();
    });

    it('should call unzip#Extract into a correct folder', function() {
      let stub = sinon.stub(unzip, 'Extract');
      stub.yields();

      installer.unzip(file, dir);

      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith({ path: dir });

      stub.restore();
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sinon.stub(unzip, 'Extract');
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
    let source = path.join('someTempFolder', 'somefile');
    let target = path.join('anInstallFolder', 'target');

    it('should call fs#move with correct arguments', function() {
      let stub = sinon.stub(fs, 'move');
      stub.yields();

      installer.moveFile(source, target);

      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(source, target);

      stub.restore();
    });

    it('should resolve as true when no error occurs', function() {
      let stub = sinon.stub(fs, 'move').yields();

      return installer.moveFile(source, target)
      .then(function(result) {
        expect(result).to.equal(true);
        stub.restore();
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sinon.stub(fs, 'move');
      proc.throws(err);

      return installer.moveFile(source, target)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
        proc.restore();
      });
    });

    it('should fail with a non-existing source', function() {
      let src = 'file';
      return installer.moveFile(src, target)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error.message).to.contain('no such file or directory');
      });
    });

    it('should not overwrite an existing file', function() {
      let folder = 'anInstallFolder';
      return installer.moveFile(source, folder)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error.message).to.contain('file already exists');
      });
    });
  });

  describe('writeFile', function() {
    let file = path.join('someTempFolder', 'somefile');
    let data = 'data';

    it('should call fs#writeFile with correct arguments', function() {
      let stub = sinon.stub(fs, 'writeFile');
      stub.yields();

      installer.writeFile(file, data);

      expect(stub).to.have.been.calledOnce;
      expect(stub).to.have.been.calledWith(file, data);

      stub.restore();
    });

    it('should resolve as true when no error occurs', function() {
      let stub = sinon.stub(fs, 'writeFile').yields();

      return installer.moveFile(file, data)
      .then(function(result) {
        expect(result).to.equal(true);
        stub.restore();
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      let proc = sinon.stub(fs, 'writeFile');
      proc.throws(err);

      return installer.writeFile(file, data)
      .then(function(result) {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
        proc.restore();
      });
    });
  });

  describe('succeed', function() {
    it('should set progress to complete when the input is truthy', function() {
      let spy = sinon.spy(fakeProgress, 'setComplete');
      installer.succeed(true);

      expect(spy).to.have.been.calledOnce;
      spy.restore();
    });

    it('should not succeed with a falsey input', function() {
      let spy = sinon.spy(fakeProgress, 'setComplete');
      installer.succeed(false);

      expect(spy).to.have.not.been.called;
      spy.restore();
    });
  });
});
