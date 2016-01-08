'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import request from 'request';
import Downloader from 'model/helpers/downloader';
import { Readable, PassThrough, Writable } from 'stream';
chai.use(sinonChai);

describe('Downloader', function() {
  let downloader;

  it('should set totalDownloads to 1 by default', function() {
    downloader = new Downloader();
    expect(downloader.totalDownloads).to.equal(1);
  });

  it('errorHandler should close the stream', function() {
    let errorSpy = sinon.spy();
    let stream = { close: function() {} };
    let streamSpy = sinon.spy(stream, 'close');

    downloader = new Downloader(undefined, undefined, errorSpy);
    downloader.setWriteStream(stream);
    downloader.errorHandler(stream, 'some error');

    expect(streamSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledOnce;
    expect(errorSpy).to.be.calledWith('some error');
  });

  it('endHandler should end the stream', function() {
    let stream = { end: function() {} };
    let streamSpy = sinon.spy(stream, 'end');

    downloader = new Downloader();
    downloader.setWriteStream(stream);
    downloader.endHandler(stream);

    expect(streamSpy).to.be.calledOnce;
  });

  describe('download', function() {
    let options = {
      url: 'http://example.com/jdk.zip',
      headers: {
        'Referer': 'http://example.com/downloads'
      }
    };

    beforeEach(function() {
    });

    afterEach(function() {
      request.get.restore();
    })

    it('should make a request with given options', function() {
      let requestGetSpy = sinon.spy(request, 'get');
      downloader = new Downloader();
      downloader.setWriteStream(new PassThrough());
      downloader.download(options);

      expect(requestGetSpy).to.be.calledOnce;
      expect(requestGetSpy).to.be.calledWith(options);
    });

    it('should call endHandler when end event is emitted', function() {
      let response = new Readable();
      sinon.stub(request, 'get').returns(response);

      let stream = new PassThrough();
      downloader = new Downloader();
      downloader.setWriteStream(stream);
      let endHandler = sinon.stub(downloader, 'endHandler');
      downloader.download(options);
      response.emit('end');

      expect(endHandler).to.be.calledOnce;
      expect(endHandler).to.be.calledWith(stream);
    });

    it('should call errorHandler when error event is emitted', function() {
      let response = new Readable();
      sinon.stub(request, 'get').returns(response);
      let error = new Error('something bad happened');

      let stream = new Writable();
      downloader = new Downloader();
      downloader.setWriteStream(stream);
      let errorHandler = sinon.stub(downloader, 'errorHandler');
      downloader.download(options);
      response.emit('error', error);

      expect(errorHandler).to.be.calledOnce;
      expect(errorHandler).to.be.calledWith(stream, error);
    });
  });

});
