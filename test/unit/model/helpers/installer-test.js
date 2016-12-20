'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Installer from 'browser/model/helpers/installer';
import mockfs from 'mock-fs';
import path from 'path';
import Logger from 'browser/services/logger';
import fs from 'fs-extra';
import child_process from 'child_process';
import unzip from 'unzip';
chai.use(sinonChai);

describe('Installer', function() {
  let sandbox;
  let infoStub, errorStub;

  let fakeProgress = {
    setStatus: function () {},
    setCurrent: function () {},
    setLabel: function () {},
    setComplete: function() {},
    setTotalDownloadSize: function() {},
    downloaded: function() {}
  };
  let failureCallback = (err) => { return err; };
  let installer = new Installer('test', fakeProgress, () => { return 'success'; }, failureCallback);

  before(function() {
    infoStub = sinon.stub(Logger, 'info');
    errorStub = sinon.stub(Logger, 'error');

    mockfs({
      someTempFolder: {
        somefile: 'empty'
      },
      anInstallFolder: {}
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
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
      let stub = sandbox.stub(child_process, 'exec').yields();

      return installer.exec(command, args)
      .then(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(command, args);
      });
    });

    it('should resolve as true if no error occurs', function() {
      sandbox.stub(child_process, 'exec').yields(undefined, 'stdout', 'stderr');
      infoStub.reset();
      return installer.exec(command, args)
      .then(function(result) {
        expect(result).to.equal(true);
        expect(infoStub).to.be.calledWith('test - stdout');
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      sandbox.stub(child_process, 'exec').yields(err);

      return installer.exec(command, args)
      .then(function() {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('execFile', function() {
    let args = ['arg1', 'arg2', 'arg3'];
    let file = path.join('someTempFolder', 'somefile');

    it('should call child_process#execFile with the correct parameters', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields();

      return installer.execFile(file, args)
      .then(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(file, args);
      });
    });

    it('should resolve as true if no error occurs', function() {
      sandbox.stub(child_process, 'execFile').yields(undefined, 'stdout', 'stderr');
      infoStub.reset();
      return installer.execFile(file, args)
      .then(function(result) {
        expect(result).to.equal(true);
        expect(infoStub).to.be.calledWith('test - stdout');
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      sandbox.stub(child_process, 'execFile').yields(err);

      return installer.execFile(file, args)
      .then(function() {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('unzip', function() {
    let dir = 'anInstallFolder';
    let file = path.join('someTempFolder', 'somefile');

    it('should read the specified file', function() {
      sandbox.stub(unzip, 'Extract').throws('done');
      let spy = sandbox.spy(fs, 'createReadStream');

      return installer.unzip(file, dir)
      .catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith(file);
      });
    });

    it('should call unzip#Extract into a correct folder', function() {
      let stub = sandbox.stub(unzip, 'Extract').throws('done');

      return installer.unzip(file, dir)
      .catch(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith({ path: dir });
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      sandbox.stub(unzip, 'Extract').throws(err);

      return installer.unzip(file, dir)
      .then(function() {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('moveFile', function() {
    let source = path.join('.', 'someTempFolder', 'somefile');
    let target = path.join('anInstallFolder', 'target');

    it('should call fs#move with correct arguments', function() {
      let stub = sandbox.stub(fs, 'move').yields();

      return installer.moveFile(source, target)
      .then(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(source, target);
      });
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
      sandbox.stub(fs, 'move').yields(err);

      return installer.moveFile(source, target)
      .then(function() {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('copyFile', function() {
    let source = path.join('.', 'someTempFolder', 'somefile');
    let target = path.join('anInstallFolder', 'target');

    it('should call fs#copy with correct arguments', function() {
      let stub = sandbox.stub(fs, 'copy').yields();

      return installer.copyFile(source, target)
      .then(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(source, target);
      });
    });

    it('should resolve as true when no error occurs', function() {
      sandbox.stub(fs, 'copy').yields();

      return installer.copyFile(source, target)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      sandbox.stub(fs, 'copy').yields(err);

      return installer.copyFile(source, target)
      .then(function() {
        expect.fail('it did not reject');
      })
      .catch(function(error) {
        expect(error).to.equal(err);
      });
    });
  });

  describe('writeFile', function() {
    let file = path.join('someTempFolder', 'somefile');
    let data = 'data';

    it('should call fs#writeFile with correct arguments', function() {
      let stub = sandbox.stub(fs, 'writeFile').yields();

      return installer.writeFile(file, data)
      .then(function() {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith(file, data);
      });
    });

    it('should resolve as true when no error occurs', function() {
      sandbox.stub(fs, 'writeFile').yields();

      return installer.writeFile(file, data)
      .then(function(result) {
        expect(result).to.equal(true);
      });
    });

    it('should reject when an error occurs', function() {
      let err = new Error('fatal error');
      sandbox.stub(fs, 'writeFile').yields(err);

      return installer.writeFile(file, data)
      .then(function() {
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

  describe('fail', function() {
    it('should set progress to Failed', function() {
      let spy = sandbox.spy(fakeProgress, 'setStatus');
      installer.fail(new Error('Failed'));

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Failed');
    });

    it('should call the fail callback with the error', function() {
      let err = new Error('Failed');
      let spy = sandbox.spy(installer, 'failure');
      installer.fail(err);

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith(err);
    });
  });
});
