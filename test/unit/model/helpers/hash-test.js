'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Hash from 'browser/model/helpers/hash';
chai.use(sinonChai);

const hasha = require('hasha');

describe('Hash', function() {
  let hash = new Hash();

  describe('SHA256', function() {
    let sandbox, fromFile;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fromFile = sandbox.stub(hasha, 'fromFile').resolves('fakeHash');
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should return promise resolved to sha256 hash', function() {
      return hash.SHA256('file').then((sha256)=> {
        expect(sha256).to.be.equal('fakeHash');
        expect(fromFile).to.have.been.calledWith('file', {algorithm: 'sha256'});
      });
    });
  });
});
