'use strict';

import { expect } from 'chai';
import sinon from 'sinon';
import Platform from 'browser/services/platform';
import child_process from 'child_process';

describe('Platform', function() {

  let sandbox;

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

  describe('isVirtualizationEnabled', function(){

    describe('on mac', function() {
      it('should return true if virtualization check shell script returns true');
    });

    describe('on linux', function() {
      it('should return true if virtualization check shell script returns true');
    });

    describe('on windows', function(){

      let stub;

      beforeEach(function() {
        stub = sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `True` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, "True", undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script returns `False` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'False', undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if powershell script returns nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '', undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null, undefined);
        return Platform.isVirtualizationEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('isHypervisorEnabled', function(){

    describe('on mac', function() {
      it('should return true if hypervisor check shell script returns true');
    });

    describe('on linux', function() {
      it('should return true if hypervisor check shell script returns true');
    });

    describe('on windows', function(){

      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });

      it('should return promise resolved to true if powershell script returns `Enabled` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled', undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.true;
        });
      });

      it('should return promise resolved to true if powershell script returns `Disabled` in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled', undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.false;
        });
      });

      it('should return promise resolved to undefined if powershell script returns nothing in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '', undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });

      it('should return promise resolved to undefined if powershell script returns null in stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, null, undefined);
        return Platform.isHypervisorEnabled().then((result) => {
          expect(result).to.be.undefined;
        });
      });
    });
  });

  describe('getUserPath',function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'getOS').returns('win32');
      });
      it('returns Path variable value without \\r\\n at the end', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'c:\\path\r\n', undefined);
        return Platform.getUserPath_win32().then((result) => {
          expect(result).to.be.equal('c:\\path');
        });
      });
    });
  });
});
