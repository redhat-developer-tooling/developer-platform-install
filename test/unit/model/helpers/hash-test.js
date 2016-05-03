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
    let createHashStub, readStreamStub;
    let stream = new Readable();

    before(function() {
      createHashStub = sinon.stub(crypto, 'createHash').returns(fakeHash);
      readStreamStub = sinon.stub(fs, 'createReadStream').returns(stream);
    });

    after(function() {
      createHashStub.restore();
      readStreamStub.restore();
    });

    it('should use crypto to create a sha256 hash', function() {
      hash.SHA256('file', () => {});

      expect(createHashStub).to.have.been.calledOnce;
      expect(createHashStub).to.have.been.calledWith('sha256');
    });

    it('should read the specified file', function() {
      hash.SHA256('file', () => {});

      expect(readStreamStub).to.have.been.called;
      expect(readStreamStub).to.have.been.calledWith('file');
    });

    it('should create a hex string when the file is done reading', function() {
      let spy = sinon.spy(fakeHash, 'digest');
      hash.SHA256('file', () => {});
      stream.emit('end');

      expect(spy).to.have.been.called;
      expect(spy).to.have.been.calledWith('hex');
      spy.restore();
    });
  })
});
