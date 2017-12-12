'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Hash from 'browser/model/helpers/hash';
import { Readable } from 'stream';
chai.use(sinonChai);

const hasha = require('hasha');

describe('Hash', function() {
  let hash = new Hash();

  describe('SHA256', function() {

    let fakeHash = {
      algorithm: function() {}
    };
    let sandbox, fromFile;

    beforeEach(function() {
      sandbox = sinon.sandbox.create();
      fromFile = sandbox.stub(hasha, 'fromFile').returns(fakeHash);
    });

    afterEach(function() {
      sandbox.restore();
    });

    it('should read the specified file', function() {
      hash.SHA256('file');
      expect(fromFile).to.have.been.called;
      expect(fromFile).to.have.been.calledWith('file');
    });
  });
});
