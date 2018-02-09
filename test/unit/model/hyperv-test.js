'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import Platform from 'browser/services/platform';
import HypervInstall from 'browser/model/hyperv';
import child_process from 'child_process';
chai.use(sinonChai);

describe('Hyper-V Installer', function() {
  let sandbox, hvInstall, osStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    osStub = sandbox.stub(Platform, 'getOS').returns('win32');
    sandbox.stub(Platform, 'getEnv').returns({PROGRAMFILES: 'C:\\Program Files'});
    hvInstall = new HypervInstall(new InstallerDataService(), 'url');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('detectExistingInstall', function() {
    describe('on windows', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'isHypervisorAvailable').resolves(true);
      });

      it('first checks if hyper-v is available on the current OS version', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Hyper-V Host Compute Service \n Hyper-V Virtual Machine Management');
        return hvInstall.detectExistingInstall().then(function() {
          expect(Platform.isHypervisorAvailable).calledOnce;
        });
      });

      it('skips the next steps if hyper-v is not available on current OS version', function() {
        Platform.isHypervisorAvailable.resolves(false);
        let spy = sandbox.spy(Platform, 'isHypervisorEnabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(spy).not.called;
        });
      });

      it('adds option \'detected\' if hypervisor detection script find running Hyper-v services', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Hyper-V Host Compute Service \n Hyper-V Virtual Machine Management');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(true);
        });
      });

      it('does not add option \'detected\' if hypervisor detection script fails', function() {
        sandbox.stub(child_process, 'exec').yields('Failure');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });

      it('does not add option \'detected\' if Hyper-v services are not found running', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'service1 \n service2 \n service3');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });

      it('does not add option \'detected\' if hypervisor detection script prints nothing to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });

      it('does not add option \'detected\' if hypervisor detection script prints unexpected string to stdout', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
    });

    describe('on macos', function() {
      let hvInstallPromise;

      beforeEach(function() {
        osStub.returns('darwin');
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        hvInstallPromise = hvInstall.detectExistingInstall();
      });

      it('does not add option \'detected\'', function() {
        return hvInstallPromise.then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });

      it('is marked as detected', function() {
        return hvInstallPromise.then(function() {
          expect(hvInstall.selectedOption).to.be.equal('detected');
        });
      });
    });

    describe('on linux', function() {
      beforeEach(function() {
        osStub.returns('linux');
      });

      it('does not add option \'detected\'', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.hasOption('detected')).to.be.equal(false);
        });
      });
    });
  });

  describe('isSkipped', function() {
    describe('on windows', function() {
      it('should return true if hyper-v is detectd', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.isSkipped()).to.be.equal(true);
        });
      });

      it('should return true if hyper-v is not detectd', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Disabled');
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.isSkipped()).to.be.equal(true);
        });
      });
    });

    describe('on macos', function() {
      beforeEach(function() {
        osStub.returns('darwin');
      });

      it('should return true', function() {
        return hvInstall.detectExistingInstall().then(function() {
          expect(hvInstall.isSkipped()).to.be.equal(true);
        });
      });
    });
  });

  describe('isConfigured', function() {
    beforeEach(function() {
      sandbox.stub(Platform, 'isHypervisorAvailable').resolves(true);
    });
    
    it('on windows returns true if hyper-v is detected', function() {
      sandbox.stub(child_process, 'exec').yields(undefined, 'Hyper-V Host Compute Service \n Hyper-V Virtual Machine Management');
      return hvInstall.detectExistingInstall().then(function() {
        expect(hvInstall.isConfigured()).to.be.equal(true);
      });
    });

    it('on macos returns false', function() {
      osStub.returns('darwin');
      return hvInstall.detectExistingInstall().then(function() {
        expect(hvInstall.isConfigured()).to.be.equal(false);
      });
    });

    it('on linux returns false', function() {
      osStub.returns('linux');
      return hvInstall.detectExistingInstall().then(function() {
        expect(hvInstall.isConfigured()).to.be.equal(false);
      });
    });
  });

  describe('installAfterRequirements', function() {
    it('should always return resolved Promise', function() {
      return hvInstall.installAfterRequirements().then(function() {
        // promise was resolved
      }).catch(()=>{
        expect.fail();
      });
    });
  });

  describe('isDisabled', function() {
    it('always returns true', function() {
      expect(hvInstall.isDisabled()).to.be.equal(true);
      hvInstall.references = 1;
      expect(hvInstall.isDisabled()).to.be.equal(true);
      if(hvInstall.option.detected) {
        delete hvInstall.options.detected;
      }
      expect(hvInstall.isDisabled()).to.be.equal(true);
      hvInstall.references = 0;
      expect(hvInstall.isDisabled()).to.be.equal(true);
    });
  });
});
