'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
chai.use(sinonChai);
import Request from 'browser/services/request';

describe('Request Service', function() {
  let sandbox;
  beforeEach(function() {
    sandbox = sinon.sandbox.create();
  });
  afterEach('', function() {
    sandbox.restore();
  });
  it('get should return promise that rejects in case of error', function() {
    let r = new Request(sinon.stub().yields(new Error('request timeout')));
    return r.get('https://domain.com').then(()=>{
      expect().fail();
    }).catch((error)=>{
      expect(error.message).to.be.equal('request timeout');
    });
  });
  it('get should return promise that resolves to integer status code and boolean data in case of sucessful request', function() {
    let r = new Request(sinon.stub().yields(undefined, {statusCode: 200}, 'true'));
    return r.get('https://domain.com').then((result)=>{
      expect(result.status).to.be.equal(200);
      expect(result.data).to.be.equal(JSON.parse('true'));
    }).catch(()=>{
      expect.fail();
    });
  });
  it('get should return promise that resolves to integer status code and string data in case of unssucessful request', function() {
    let r = new Request(sinon.stub().yields(undefined, {statusCode: 401}, 'string data'));
    return r.get('https://domain.com').then((result)=>{
      expect(result.status).to.be.equal(401);
      expect(result.data).to.be.equal('string data');
    }).catch(()=>{
      expect.fail();
    });
  });
  it('get should return promise that resolves to integer status code in case of unsupported satus code', function() {
    let r = new Request(sinon.stub().yields(undefined, {statusCode: 405}, 'string data'));
    return r.get('https://domain.com').then((result)=>{
      expect(result.status).to.be.equal(405);
      expect(result.data).to.be.undefined;
    }).catch(()=>{
      expect.fail();
    });
  });
  it('get should return promise that resolves to integer status code in case of unsupported satus code', function() {
    let r = new Request(sinon.stub().yields(undefined, {statusCode: 405}, 'string data'));
    return r.get('https://domain.com').then((result)=>{
      expect(result.status).to.be.equal(405);
      expect(result.data).to.be.undefined;
    }).catch(()=>{
      expect.fail();
    });
  });
  it('factory should call get with provided URL', function() {
    let requestStub = sinon.stub().yields(undefined, {statusCode: 401}, 'true');
    sandbox.spy(Request.prototype, 'get');
    let func = Request.factory(requestStub);
    func('https://domain.com');
    expect(Request.prototype.get).has.been.calledOnce;
    expect(Request.prototype.get).has.been.calledWith('https://domain.com');
  });
});
