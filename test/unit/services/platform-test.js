'use strict';

import { expect } from 'chai';
import sinon from 'sinon';
import Platform from 'browser/services/platform';

describe('Platform', function(){

  let sandbox;

  beforeEach(function(){
    sandbox = sinon.sandbox.create();
  });

  afterEach(function(){
    sandbox.restore();
  });

  describe('identify method',function(){

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

    it('returns value of opject\'s property named the same as current platform', function(){
      sandbox.stub(Platform,'getOS').returns('win32');
      expect(Platform.identify(data)).to.be.equal('win32');
      Platform.getOS.returns('darwin');
      expect(Platform.identify(data)).to.be.equal('darwin');
      Platform.getOS.returns('linux');
      expect(Platform.identify(data)).to.be.equal('linux');
    });

    it('returns default property value if there no propyrty with current platform name', function(){
      sandbox.stub(Platform,'getOS').returns('ps/2');
      expect(Platform.identify(data)).to.be.equal('bummer');
    });

    it('returns undefined if there no propyrty with current platform name and no default provided', function(){
      sandbox.stub(Platform,'getOS').returns('ps/2');
      expect(Platform.identify(noDefaultData)).to.be.equal(undefined);
    });

  });

  describe('PATH', function(){

    describe('PATH does not return undefined value form process.env', function(){
      expect(process.env[Platform.PATH]).to.be.not.equal(undefined);
    });

  });

});
