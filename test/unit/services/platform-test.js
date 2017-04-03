'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import Platform from 'browser/services/platform';
import child_process from 'child_process';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
chai.use(sinonChai);

describe('Platform', function() {

  let sandbox;

  before(function() {
    mockfs({
      'path1': {
        file1: 'content1'
      },
      'path2': {
        file1: 'content1'
      },
      'path3': {
        file1: 'content1'
      },
      '/Applications/devsuite/cdk/bin/oc': '',
      '/home/user/devsuite/cdk/bin/minishift': ''
    }, {
      createCwd: false,
      createTmp: false
    });
  });

  after(function() {
    mockfs.restore();
  });

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('identify method', function() {

    let data = {
      darwin: ()=>'darwin',
      win32: ()=>'win32',
      linux: ()=>'linux',
      default: ()=>'bummer'
    };
    let noDefaultData = {
      darwin: ()=>'darwin',
      win32: ()=>'win32',
      linux: ()=>'linux'
    };

    it('returns value of opject\'s property named the same as current platform', function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      expect(Platform.identify(data)).to.be.equal('win32');
      Platform.getOS.returns('darwin');
      expect(Platform.identify(data)).to.be.equal('darwin');
      Platform.getOS.returns('linux');
      expect(Platform.identify(data)).to.be.equal('linux');
    });

    it('returns default property value if there no propyrty with current platform name', function() {
      sandbox.stub(Platform, 'getOS').returns('ps/2');
      expect(Platform.identify(data)).to.be.equal('bummer');
    });

    it('returns undefined if there no propyrty with current platform name and no default provided', function() {
      sandbox.stub(Platform, 'getOS').returns('ps/2');
      expect(Platform.identify(noDefaultData)).to.be.equal(undefined);
    });

  });

  describe('Platform.PATH', function() {

    it('does not return undefined value form process.env', function() {
      expect(process.env[Platform.PATH]).to.be.not.equal(undefined);
    });

    it('equals "Path" on Windows', function() {
      sandbox.stub(Platform, 'getOS').returns('win32');
      expect(Platform.PATH).to.be.equal('Path');
    });

    it('equals "PATH" on Linux', function() {
      sandbox.stub(Platform, 'getOS').returns('linux');
      expect(Platform.PATH).to.be.equal('PATH');
    });

    it('equals "PATH" on Darwin', function() {
      sandbox.stub(Platform, 'getOS').returns('darwin');
      expect(Platform.PATH).to.be.equal('PATH');
    });

  });

  describe('isVirtualizationEnabled', function() {

    describe('on mac', function() {
      it('should return true if virtualization check shell script returns true');
    });

    describe('on linux', function() {
      it('should return true if virtualization check shell script returns true');
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `True` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'True');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script returns `False` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'False');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if powershell script returns nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns unexpected value in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Unexpected', undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('isHypervisorEnabled', function() {

    describe('on mac', function() {
      it('should return true if hypervisor check shell script returns true');
    });

    describe('on linux', function() {
      it('should return true if hypervisor check shell script returns true');
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `Enabled` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script returns `Disabled` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if powershell script returns nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns unexpected value in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Unexpected', undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('getHypervisorVersion', function() {

    describe('on mac', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });
      it('should return Unknown as version', function() {
        return Platform.getHypervisorVersion  ().then((result) => {
          expect(result).to.be.equal('Unknown');
        });
      });
    });

    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('should return Unknown as version', function() {
        return Platform.getHypervisorVersion  ().then((result) => {
          expect(result).to.be.equal('Unknown');
        });
      });
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `Enabled` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '10.0.123.1345');
        return Platform.getHypervisorVersion  ().then((result) => {
          expect(result).to.be.equal('10.0.123.1345');
        });
      });

      it('should return promise resolved to \'Unknown\' if powershell script returns no output', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.getHypervisorVersion().then((result) => {
          expect(result).to.be.equals('Unknown');
        });
      });

      it('should return promise resolved to \'Unknown\' if powershell script returns empty output', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, ' ');
        return Platform.getHypervisorVersion().then((result) => {
          expect(result).to.be.equals('Unknown');
        });
      });

      it('should return promise resolved to \'Unknown\' if powershell script throws an exception', function() {
        sandbox.stub(child_process, 'exec').yields('error');
        return Platform.getHypervisorVersion().then((result) => {
          expect(result).to.be.equals('Unknown');
        });
      });
    });
  });

  describe('getUserPath', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('returns Path variable value without \\r\\n at the end', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'c:\\path\r\n');
        return Platform.getUserPath_win32().then((result) => {
          expect(result).to.be.equal('c:\\path');
        });
      });
    });
  });

  describe('addToUserPath', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('adds only locations that is not present in Path variable', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'path1\r\n');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        let locations = ['path1', 'path2', 'path3'];
        return Platform.addToUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32).calledWith(['path2', 'path3', 'path1'].join(';'));
        });
      });
      it('adds new locations in the beginning of Path value', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'path1\r\n');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        let locations = ['path1', 'path2'];
        return Platform.addToUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32.getCall(0).args[0].startsWith('path2')).to.be.true;
        });
      });
      it('adds directory if file passed in', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'path1\r\n');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        let locations = ['path1/file1', 'path2/file1', 'path3/file1'];
        return Platform.addToUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32).calledWith(['path2', 'path3', 'path1'].join(';'));
        });
      });
    });
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });
      it('passes new path value to shell script', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        let executables = ['/Applications/devsuite/cdk/bin/oc',
          '/Appications/devsuite/cdk/bin/minishift'];
        return Platform.addToUserPath(executables).then(() => {
          expect(child_process.exec.getCall(0).args[0].includes(executables[0])).to.be.true;
          expect(child_process.exec.getCall(0).args[0].includes(executables[1])).to.be.true;
        });
      });
    });
    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('it does nothing', function() {
        let executables = ['/home/user/devsuite/cdk/bin/oc',
          '/home/user/devsuite/cdk/bin/minishift'];
        return Platform.addToUserPath(executables).then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('setUserPath', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('passes new path value to powershell script', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.setUserPath('c:\\path').then(() => {
          expect(child_process.exec.getCall(0).args[0].includes('\'c:\\path\'')).to.be.true;
        });
      });
    });
    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('does nothing', function() {
        return Platform.setUserPath('c:\\path').then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });
      it('does nothing', function() {
        return Platform.setUserPath('c:\\path').then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('removeFromUserPath', function() {
    let locations = ['c:\\path1', 'c:\\path2', 'c:\\path3'];
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('removes only locations that passed in', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'c:\\path1;c:\\path2;c:\\path3;c:\\path4');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        return Platform.removeFromUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32).calledWith('c:\\path4');
        });
      });
    });
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });
      it('it does nothing', function() {
        return Platform.removeFromUserPath(locations).then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('it does nothing', function() {
        return Platform.removeFromUserPath(locations).then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

});
