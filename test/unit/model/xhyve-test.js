'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import InstallerDataService from 'browser/services/data';
import Platform from 'browser/services/platform';
import XhyveInstall from 'browser/model/xhyve';
import child_process from 'child_process';
chai.use(sinonChai);

describe('xhyve Installer', function() {
  let sandbox, xhInstall, osStub;

  beforeEach(function() {
    sandbox = sinon.sandbox.create();
    osStub = sandbox.stub(Platform, 'getOS').returns('darwin');
    xhInstall = new XhyveInstall(new InstallerDataService(), 'url');
  });

  afterEach(function() {
    sandbox.restore();
  });

  describe('detectExistingInstall', function() {
    describe('on macOS', function() {
      beforeEach(function() {
        sandbox.stub(Platform, 'isXhyveAvailable').resolves(true);
      });

      it('first checks if xhyve is available on the current OS version', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '/usr/local/bin/docker-machine-driver-xhyve');
        return xhInstall.detectExistingInstall().then(function() {
          expect(Platform.isXhyveAvailable).calledOnce;
        });
      });

      it('adds option \'detected\' if xhyve detection', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '/usr/local/bin/docker-machine-driver-xhyve');
        return xhInstall.detectExistingInstall().then(function() {
          expect(xhInstall.hasOption('detected')).to.be.equal(true);
        });
      });
    });

    describe('on windows', function() {
      let xhyveInstallPromise;

      beforeEach(function() {
        osStub.returns('win32');
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        xhyveInstallPromise = xhInstall.detectExistingInstall();
      });

      it('does not add option \'detected\'', function() {
        return xhyveInstallPromise.then(function() {
          expect(xhInstall.hasOption('detected')).to.be.equal(false);
        });
      });

      it('is marked as detected', function() {
        return xhyveInstallPromise.then(function() {
          expect(xhInstall.selectedOption).to.be.equal('detected');
        });
      });
    });

    describe('on linux', function() {
      beforeEach(function() {
        osStub.returns('linux');
      });

      it('does not add option \'detected\'', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, 'Enabled');
        return xhInstall.detectExistingInstall().then(function() {
          expect(xhInstall.hasOption('detected')).to.be.equal(false);
        });
      });
    });
  });

  describe('isSkipped', function() {
    describe('on macOS', function() {
      it('should return true if xhyve is detectd', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, true);
        return xhInstall.detectExistingInstall().then(function() {
          expect(xhInstall.isSkipped()).to.be.equal(true);
        });
      });

      it('should return true if xhyve is not detectd', function() {
        sandbox.stub(child_process, 'exec').yields(undefined, '');
        return xhInstall.detectExistingInstall().then(function() {
          expect(xhInstall.isSkipped()).to.be.equal(true);
        });
      });
    });

    describe('on windows', function() {
      beforeEach(function() {
        osStub.returns('win32');
      });

      it('should return true', function() {
        return xhInstall.detectExistingInstall().then(function() {
          expect(xhInstall.isSkipped()).to.be.equal(true);
        });
      });
    });
  });

  describe('isConfigured', function() {
    beforeEach(function() {
      sandbox.stub(Platform, 'isXhyveAvailable').resolves(true);
    });

    it('on macOS returns true if xhyve is detected', function() {
      sandbox.stub(child_process, 'exec').yields(undefined, '/usr/local/bin/docker-machine-driver-xhyve');
      return xhInstall.detectExistingInstall().then(function() {
        expect(xhInstall.isConfigured()).to.be.equal(true);
      });
    });

    it('on windows returns false', function() {
      osStub.returns('win32');
      return xhInstall.detectExistingInstall().then(function() {
        expect(xhInstall.isConfigured()).to.be.equal(false);
      });
    });

    it('on linux returns false', function() {
      osStub.returns('linux');
      return xhInstall.detectExistingInstall().then(function() {
        expect(xhInstall.isConfigured()).to.be.equal(false);
      });
    });
  });

  describe('installAfterRequirements', function() {
    it('should always return resolved Promise', function() {
      return xhInstall.installAfterRequirements().then(function() {
      }).catch(()=>{
        expect.fail();
      });
    });
  });

  describe('isDisabled', function() {
    it('always returns true', function() {
      expect(xhInstall.isDisabled()).to.be.equal(true);
      xhInstall.references = 1;
      expect(xhInstall.isDisabled()).to.be.equal(true);
      if(xhInstall.option.detected) {
        delete xhInstall.options.detected;
      }
      expect(xhInstall.isDisabled()).to.be.equal(true);
      xhInstall.references = 0;
      expect(xhInstall.isDisabled()).to.be.equal(true);
    });
  });
});
