'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import Platform from 'browser/services/platform';
import child_process from 'child_process';
import { default as sinonChai } from 'sinon-chai';
import mockfs from 'mock-fs';
import fs from 'fs-extra';
import sudo from 'sudo-prompt';
import os from 'os';
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

  describe('getHypervAdminsGroupName', function() {
    it('should return promise resolved to undefined for unsupported platforms', function() {
      sandbox.stub(Platform, 'getOS').returns('OS2');
      return Platform.getHypervAdminsGroupName().then((result) => {
        expect(result).to.be.undefined;
      });
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to stdout if there is no "BUILTIN\\" prefix', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Hyper-V Administrators');
        return Platform.getHypervAdminsGroupName().then((result) => {
          expect(result).to.be.equal('Hyper-V Administrators');
        });
      });

      it('should return promise resolved to stdout with removed "BUILTIN\\" prefix', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'BUILTIN\\Hyper-V Administrators');
        return Platform.getHypervAdminsGroupName().then((result) => {
          expect(result).to.be.equal('Hyper-V Administrators');
        });
      });

      it('should return promise resolved to undefined if powershell script prints nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.getHypervAdminsGroupName().then((result) => {
          expect(result).to.be.equal('');
        });
      });

      it('should return promise resolved to undefined if powershell script execution failed', function() {
        sandbox.stub(child_process, 'exec').yields('error', null);
        return Platform.getHypervAdminsGroupName().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('isVirtualizationEnabled', function() {

    it('should return promise resolved to true for unsupported platforms', function() {
      sandbox.stub(Platform, 'getOS').returns('OS2');
      return Platform.isVirtualizationEnabled().then((result) => {
        expect(result).to.be.true;
      });
    });

    describe('on mac', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });

      it('should return promise resolved to true if script returns `VMX` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'VMX');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to undefined if script returns nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if script returns unexpected value in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Unexpected', undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if script returns true in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, true);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });

    describe('on linux', function() {
      it('should return true if virtualization check shell script returns true');
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `True` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'TRUE');
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script returns `False` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'FALSE');
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

      it('should return promise resolved to undefined if powershell script execution failed', function() {
        sandbox.stub(child_process, 'exec').yields('error', null);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('isHypervisorEnabled', function() {

    describe('on mac', function() {
      it('should return false', function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });
    });

    describe('on linux', function() {
      it('should return false', function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });
    });

    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script lists hyper-v services in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Hyper-V Host Compute Service \n Hyper-V Virtual Machine Management');
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script lists no hyper-v services in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'service1 \n service2 \n service3');
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

      it('should return promise resolved to false if powershell script returns unexpected value in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Unexpected', undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if powershell script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if error occurs', function() {
        sandbox.stub(child_process, 'exec').yields('Error', null);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('isHypervisorAvailable', function() {
    describe('on mac', function() {
      it('should return false', function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.false;
        });
      });
    });

    describe('on linux', function() {
      it('should return false', function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.false;
        });
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        sandbox.stub(os, 'arch').returns('x64');
      })

      it('should return true for windows 8', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Windows 8.1 Pro');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return true for windows 10', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Windows 10 Pro');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return false for windows 7', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Windows 7 Pro');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return false for windows home edition', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Windows 10 Home');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return false for 32-bit architecture', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Windows 10 Pro');
        os.arch.returns('x86');
        return Platform.isHypervisorAvailable().then((result) => {
          expect(result).to.be.false;
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
        return Platform.getHypervisorVersion().then((result) => {
          expect(result).to.be.equal('Unknown');
        });
      });
    });

    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('should return Unknown as version', function() {
        return Platform.getHypervisorVersion().then((result) => {
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
        return Platform.getHypervisorVersion().then((result) => {
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

  describe('getFreeDiskSpace', function() {
    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should able to return free disk space', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '248005160960');
        let location = 'C:\\DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal(248005160960);
        });
      });

      it('should able to return error if path is not present', function() {
        sandbox.stub(child_process, 'exec').yields('Error', undefined);
        let location = 'c:\\DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });

    describe('on mac', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
      });

      it('should able to return free disk space for home', function() {
        let home = 'Filesystem    1024-blocks Used Available Capacity iused ifree %iused  Mounted on\nmap auto_home           0    0         0   100%       0     0  100%   /home';
        sandbox.stub(child_process, 'exec').yields(undefined, home);
        let location = '/home/DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal(0);
        });
      });

      it('should able to return free disk space', function() {
        let applications = 'Filesystem 1024-blocks     Used Available Capacity  iused    ifree %iused  Mounted on\n/dev/disk1   243966468 48677780 195032688    20% 12233443 48758172   20%   /';
        sandbox.stub(child_process, 'exec').yields(undefined, applications);
        let location = '/Applications/DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal(195032688);
        });
      });

      it('should able to return free disk space', function() {
        let applications = 'Filesystem 1024-blocks     Used Available Capacity  iused    ifree %iused  Mounted on\n/dev/disk1   243966468 48677780 195032688    20% 12233443 48758172   20%   /';
        sandbox.stub(child_process, 'exec').yields(undefined, applications);
        let location = 'Downloads/DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal(195032688);
        });
      });

      it('should able to return error if path is not present', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'df: /Applications/developer: No such file or dir');
        let location = '/Applications/developer';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal('No such file or dir');
        });
      });
    });

    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
      });
      it('it does nothing', function() {
        let location = '/home/user';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('getFreeDiskSpace', function() {
    describe('on windows', function() {

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should able to return free disk space', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '248005160960');
        let location = 'C:\\DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.equal(248005160960);
        });
      });

      it('should return NaN if drive not found', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        let location = 'd:\\DevelopmentSuite';
        return Platform.getFreeDiskSpace(location).then((result) => {
          expect(result).to.be.NaN;
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
        sandbox.stub(fs, 'statSync').returns({isFile:function isFile() { return true; }});
        let locations = ['path1/file1', 'path2/file1', 'path3/file1'];
        return Platform.addToUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32).calledWith(['path2', 'path3', 'path1'].join(';'));
        });
      });
      it('adds items to the Machine path by default', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'path1\r\n');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        let spy = sandbox.spy(Platform, 'addToUserPath_win32');
        let locations = ['path1', 'path2'];
        return Platform.addToUserPath(locations).then(() => {
          expect(spy).calledWith(locations, 'Machine');
        });
      });
    });
    describe('on macos', function() {
      let executables = [
        '/Applications/devsuite/cdk/bin/oc',
        '/Appications/devsuite/cdk/bin/minishift'];

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(sudo, 'exec').yields(undefined, '');
      });

      it('passes new path value to elevated shell script', function() {        
        return Platform.addToUserPath(executables).then(() => {
          expect(sudo.exec.getCall(0).args[0].includes(executables[0])).to.be.true;
          expect(sudo.exec.getCall(0).args[0].includes(executables[1])).to.be.true;
        });
      });

      it('sets the right name and icon for the sudo prompt', function() {
        return Platform.addToUserPath(executables).then(() => {
          expect(sudo.exec).calledWith(sinon.match.any, {name: 'Red Hat Development Suite', icns: 'resources/devsuite.icns'});
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
      it('uses the machine path as default', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return Platform.setUserPath('c:\\path').then(() => {
          expect(child_process.exec.getCall(0).args[0].includes('Machine')).to.be.true;
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
      it('uses machine path by default', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'c:\\path1;c:\\path2;c:\\path3;c:\\path4');
        sandbox.stub(Platform, 'setUserPath_win32').returns(Promise.resolve());
        return Platform.removeFromUserPath(locations).then(() => {
          expect(Platform.setUserPath_win32).calledWith('c:\\path4', 'Machine');
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

  describe('getUserHomePath', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
        sandbox.stub(Platform, 'getEnv').returns({USERPROFILE: 'c:\\Users\\dev1'});
      });
      it('returns USERPROFILE environment variable value', function() {
        expect(Platform.getUserHomePath()).to.be.equal('c:\\Users\\dev1');
      });
    });
    describe('on macos', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('darwin');
        sandbox.stub(Platform, 'getEnv').returns({HOME: 'c:\\Users\\dev1'});
      });
      it('returns HOME environment variable value', function() {
        expect(Platform.getUserHomePath()).to.be.equal('c:\\Users\\dev1');
      });
    });
    describe('on linux', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('linux');
        sandbox.stub(Platform, 'getEnv').returns({HOME: 'c:\\Users\\dev1'});
      });
      it('returns HOME environment variable value', function() {
        expect(Platform.getUserHomePath()).to.be.equal('c:\\Users\\dev1');
      });
    });
  });

  describe('getEnv', function() {
    it('returns process.env', function() {
      expect(Platform.getEnv()).to.be.equal(process.env);
    });
  });
});
