'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Util from 'browser/model/helpers/util';
import Platform from 'browser/services/platform';
import child_process from 'child_process';
import fs from 'fs-extra';
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
      .then(() => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('command');
      });
    });

    it('should resolve to standard output with 1 as second param', function() {
      sandbox.stub(child_process, 'exec').yields(null, 'stdout', 'stderr');

      return Util.executeCommand('command', 1)
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to standard output when called with only one param', function() {
      sandbox.stub(child_process, 'exec').yields(null, 'stdout', 'stderr');

      return Util.executeCommand('command')
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to error output with 2 as second param', function() {
      sandbox.stub(child_process, 'exec').yields(null, 'stdout', 'stderr');

      return Util.executeCommand('command', 2)
      .then((result) => {
        expect(result).to.equal('stderr');
      });
    });

    it('should reject on error', function() {
      let err = new Error('error');
      sandbox.stub(child_process, 'exec').yields(err, 'stdout', 'stderr');

      return Util.executeCommand('command', 1)
      .then(() => {
        expect.fail('it did not catch the error');
      })
      .catch((error) => {
        expect(error).to.equal(err);
      });
    });

    describe('on macos', function() {
      describe('when options parameter is undefined', function() {
        it('should set options.env.PATH to "/usr/local/bin" if process.env.PATH is not present or empty', function() {
          sandbox.stub(Platform, 'getOS').returns('darwin');
          sandbox.stub(Platform, 'getEnv').returns({PATH:''});
          let mock = sandbox.mock(child_process);
          let execExpect = mock.expects('exec');
          execExpect.withArgs('command', {env: {PATH:'/usr/local/bin'}});
          execExpect.yields(null, 'stdout', 'stderr');
          return Util.executeCommand('command', 1).then(()=>{
            mock.verify();
          });
        });

        it('should add ":/usr/local/bin" to the options.env.PATH if process.env.PATH is not empty', function() {
          sandbox.stub(Platform, 'getOS').returns('darwin');
          sandbox.stub(Platform, 'getEnv').returns({PATH:'/bin'});
          let mock = sandbox.mock(child_process);
          let execExpect = mock.expects('exec');
          execExpect.withArgs('command', {env: {PATH:'/bin:/usr/local/bin'}});
          execExpect.yields(null, 'stdout', 'stderr');
          return Util.executeCommand('command', 1).then(()=>{
            mock.verify();
          });
        });
      });

      describe('when options parameter is provided', function() {
        it('should set options.env.PATH to "/usr/local/bin" if options.env.PATH is not present or empty', function() {
          sandbox.stub(Platform, 'getOS').returns('darwin');
          let mock = sandbox.mock(child_process);
          let execExpect = mock.expects('exec');
          execExpect.withArgs('command', {env: {PATH:'/usr/local/bin'}});
          execExpect.yields(null, 'stdout', 'stderr');
          return Util.executeCommand('command', 1, {env: {PATH:''}}).then(()=>{
            mock.verify();
          });
        });

        it('should add ":/usr/local/bin" to the options.env.PATH if options.env.PATH is not empty', function() {
          sandbox.stub(Platform, 'getOS').returns('darwin');
          let mock = sandbox.mock(child_process);
          let execExpect = mock.expects('exec');
          execExpect.withArgs('command', {env: {PATH:'/bin:/usr/local/bin'}});
          execExpect.yields(null, 'stdout', 'stderr');
          return Util.executeCommand('command', 1, {env: {PATH:'/bin'}}).then(()=>{
            mock.verify();
          });
        });
      });
    });
  });

  describe('executeFile', function() {
    it('should call the appropriate command', function() {
      let stub = sandbox.stub(child_process, 'execFile').yields(null, '', '');

      return Util.executeFile('file', 'arguments', 1)
      .then(() => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('file', 'arguments');
      });
    });

    it('should resolve to standard output with 1 as second param', function() {
      sandbox.stub(child_process, 'execFile').yields(null, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 1)
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to standard output when called with only one param', function() {
      sandbox.stub(child_process, 'execFile').yields(null, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments')
      .then((result) => {
        expect(result).to.equal('stdout');
      });
    });

    it('should resolve to error output with 2 as second param', function() {
      sandbox.stub(child_process, 'execFile').yields(null, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 2)
      .then((result) => {
        expect(result).to.equal('stderr');
      });
    });

    it('should reject on error', function() {
      let err = new Error('error');
      sandbox.stub(child_process, 'execFile').yields(err, 'stdout', 'stderr');

      return Util.executeFile('file', 'arguments', 1)
      .then(() => {
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
      .then(() => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('folder');
      });
    });

    it('should resolve as the target folder if all files are found', function() {
      sandbox.stub(fs, 'readdir').yields(null, ['file1', 'file2', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then((result) => {
        expect(result).to.equal('folder');
      });
    });

    it('should reject if some file was not found', function() {
      sandbox.stub(fs, 'readdir').yields(null, ['file1', 'file4', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then(() => {
        expect.fail('it did not catch the error');
      })
      .catch((err) => {
        expect(err).to.equal('folder does not contain file2');
      });
    });

    it('should reject if an error occurs reading searching the folder', function() {
      let error = new Error('something broke');
      sandbox.stub(fs, 'readdir').yields(error, ['file1', 'file4', 'file3']);

      return Util.folderContains('folder', ['file2', 'file1', 'file3'])
      .then(() => {
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
      .then(() => {
        expect(stub).to.have.been.calledOnce;
        expect(stub).to.have.been.calledWith('file', 'encoding');
      });
    });

    it('should use utf8 as default encoding', function() {
      let stub = sandbox.stub(fs, 'readFile').yields(null, 'text');

      return Util.findText('file', 'text')
      .then(() => {
        expect(stub).to.have.been.calledWith('file', 'utf8');
      });
    });

    it('should resolve as the line the text was found on', function() {
      let contents = 'first line\nsecond line\nthird line';
      sandbox.stub(fs, 'readFile').yields(null, contents);

      return Util.findText('file', 'second')
      .then((result) => {
        expect(result).to.equal('second line');
      });
    });

    it('should reject when the text is not found', function() {
      let contents = 'first line\nsecond line\nthird line';
      sandbox.stub(fs, 'readFile').yields(null, contents);

      return Util.findText('file', 'fourth')
      .then(() => {
        expect.fail('no error was caught');
      })
      .catch((err) => {
        expect(err).to.equal('"' + 'fourth' + '"' + ' not found in file file');
      });
    });

    it('should reject when an error occurs reading the file', function() {
      let contents = 'first line\nsecond line\nthird line';
      let error = new Error('something broke');
      sandbox.stub(fs, 'readFile').yields(error, contents);

      return Util.findText('file', 'fourth')
      .then(() => {
        expect.fail('no error was caught');
      })
      .catch((err) => {
        expect(err).to.equal(error);
      });
    });
  });

  describe('writeFile', function() {
    it('calls fs#writeFile with correct arguments', function() {
      sandbox.stub(fs, 'writeFile').yields();

      return Util.writeFile('file', 'data')
      .then(function() {
        expect(fs.writeFile).to.have.been.calledOnce;
        expect(fs.writeFile).to.have.been.calledWith('file', 'data');
      });
    });

    it('calls fs#writeFile and rejects promise with original error', function() {
      sandbox.stub(fs, 'writeFile').yields('error');

      return Util.writeFile('file', 'data')
      .catch(function(error) {
        expect(error).to.be.equal('error');
      });
    });
  });
});
