'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Util from 'browser/model/helpers/util';
import child_process from 'child_process';
import fs from 'fs';
chai.use(sinonChai);

describe('Util', function() {
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('executeCommand', function() {
    it('should call the appropriate command', function() {
      let stub = sandbox.stub(child_process, 'exec').yields(null, '', '');

      return Util.executeCommand('command', 1)
      .then((result) => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('command');
      });
    });

    it('should resolve to standard output with 1 as second param', function() {
      let stub = sandbox.stub(child_process, 'exec').yields(null, 'stdout', 'stderr');

      return Util.executeCommand('command', 1)
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to error output with 2 as second param', function() {
      let stub = sandbox.stub(child_process, 'exec').yields(null, 'stdout', 'stderr');

      return Util.executeCommand('command', 2)
      .then((result) => {
        expect(result).to.equal('stderr');
      });
    });

    it('should reject on error', function() {
      let err = new Error('error');
      let stub = sandbox.stub(child_process, 'exec').yields(err, 'stdout', 'stderr');

      return Util.executeCommand('command', 1)
      .then((result) => {
        expect.fail('it did not catch the error');
      })
      .catch((error) => {
        expect(error).to.equal(err);
      });
    });
  });

  describe('executeFile', function() {
    it('should call the appropriate command', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields(null, '', '');

      return Util.executeFile('file', 'arguments', 1)
      .then((result) => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('file', 'arguments');
      });
    });

    it('should resolve to standard output with 1 as second param', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields(null, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 1)
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to error output with 2 as second param', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields(null, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 2)
      .then((result) => {
        expect(result).to.equal('stderr');
      });
    });

    it('should reject on error', function() {
      let err = new Error('error');
      let stub = sandbox.stub(child_process, 'execFile').yields(err, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 1)
      .then((result) => {
        expect.fail('it did not catch the error');
      })
      .catch((error) => {
        expect(error).to.equal(err);
      });
    });
  });

  describe('folderContains', function() {

    it('should search the appropriate folder', function() {
      let stub = sandbox.stub(fs, 'readdir').yields(null, []);

      return Util.folderContains('folder', [])
      .then((result) => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('folder');
      });
    });

    it('should resolve as the target folder if all files are found', function() {
      let stub = sandbox.stub(fs, 'readdir').yields(null, ['file1', 'file2', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then((result) => {
        expect(result).to.equal('folder');
      });
    });

    it('should reject if some file was not found', function() {
      let stub = sandbox.stub(fs, 'readdir').yields(null, ['file1', 'file4', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then((result) => {
        expect.fail('it did not catch the error');
      })
      .catch((err) => {
        expect(err).to.equal('folder does not contain file2');
      });
    });

    it('should reject if an error occurs reading searching the folder', function() {
      let error = new Error('something broke');
      let stub = sandbox.stub(fs, 'readdir').yields(error, ['file1', 'file4', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then((result) => {
        expect.fail('it did not catch the error');
      })
      .catch((err) => {
        expect(err).to.equal(error);
      });
    });
  });

  describe('findText', function() {

    it('should read the appropriate file', function() {
      let stub = sandbox.stub(fs, 'readFile').yields(null, 'text');

      return Util.findText('file', 'text', 'encoding')
      .then((result) => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('file', 'encoding');
      });
    });

    it('should use utf8 as default encoding', function() {
      let stub = sandbox.stub(fs, 'readFile').yields(null, 'text');

      return Util.findText('file', 'text')
      .then((result) => {
        expect(stub).to.have.been.calledWith('file', 'utf8');
      });
    });

    it('should resolve as the line the text was found on', function() {
      let contents = 'first line\nsecond line\nthird line';
      let stub = sandbox.stub(fs, 'readFile').yields(null, contents);

      return Util.findText('file', 'second')
      .then((result) => {
        expect(result).to.equal('second line');
      });
    });

    it('should reject when the text is not found', function() {
      let contents = 'first line\nsecond line\nthird line';
      let stub = sandbox.stub(fs, 'readFile').yields(null, contents);

      return Util.findText('file', 'fourth')
      .then((result) => {
        expect.fail('no error was caught');
      })
      .catch((err) => {
        expect(err).to.equal('"' + 'fourth' + '"' + ' not found in file file');
      });
    });

    it('should reject when an error occurs reading the file', function() {
      let contents = 'first line\nsecond line\nthird line';
      let error = new Error('something broke');
      let stub = sandbox.stub(fs, 'readFile').yields(error, contents);

      return Util.findText('file', 'fourth')
      .then((result) => {
        expect.fail('no error was caught');
      })
      .catch((err) => {
        expect(err).to.equal(error);
      });
    });
  });
});
