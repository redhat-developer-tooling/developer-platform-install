'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Hash from 'model/helpers/hash';
import { Readable } from 'stream';
chai.use(sinonChai);

const fs = require('fs-extra');
const crypto = require('crypto');

describe('Hash', function() {
  let hash = new Hash();

  describe('SHA256', function() {
    let fakeHash = {
      update: function(chunk) {},
      digest: function(type) {}
    }
    let sandbox, createHashStub, readStreamStub;
    let stream;

    beforeEach(function() {
      stream = new Readable();
      stream._read = function(size) {};
      sandbox = sinon.sandbox.create();
      createHashStub = sandbox.stub(crypto, 'createHash').returns(fakeHash);
      readStreamStub = sandbox.stub(fs, 'createReadStream').returns(stream);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should use crypto to create a sha256 hash', function(done) {
      hash.SHA256('file', () => {
        expect(createHashStub).to.have.been.calledOnce;
        expect(createHashStub).to.have.been.calledWith('sha256');
        done();
      });
      stream.emit('end');
    });

    it('should read the specified file', function(done) {
      hash.SHA256('file', () => {
        expect(readStreamStub).to.have.been.called;
        expect(readStreamStub).to.have.been.calledWith('file');
        done();
      });
      stream.emit('end');
    });

    it('should create a hex string when the file is done reading', function(done) {
      let spy = sandbox.spy(fakeHash, 'digest');
      hash.SHA256('file', () => {
        expect(spy).to.have.been.called;
        expect(spy).to.have.been.calledWith('hex');
        done();
      });
      stream.emit('end');
    });
  })
});
