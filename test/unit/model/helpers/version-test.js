import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import Version from 'model/helpers/version';
chai.use(sinonChai);

describe('version', function() {
  it("should save value passed in constructor",function() {
    let v = new Version('1.2.3');
    expect(v.value).equals('1.2.3');
    let d = new Version('1.2.3');
    expect(d.lt('1.2.5')).equals(true);
  });

  describe('lt',function() {
    it('should return true for bigger version',function() {
      expect(new Version('1.2.3').lt('1.2.5')).equals(true);
    });
    it('should return false for equal version',function() {
      expect(new Version('1.2.3').lt('1.2.3')).equals(false);
    });
    it('should return false for lesser version',function() {
      expect(new Version('1.2.3').lt('1.2.2')).equals(false);
    });
  });

  describe('gt',function() {
    it('should return false for bigger version',function() {
      expect(new Version('1.2.3').gt('1.2.5')).equals(false);
    });
    it('should return false for equal version',function() {
      expect(new Version('1.2.3').gt('1.2.3')).equals(false);
    });
    it('should return true for lesser version',function() {
      expect(new Version('1.2.3').gt('1.2.2')).equals(true);
    });
  });

  describe('eq',function() {
    it('should return false for bigger version',function() {
      expect(new Version('1.2.3').eq('1.2.5')).equals(false);
    });
    it('should return true for equal version',function() {
      expect(new Version('1.2.3').eq('1.2.3')).equals(true);
    });
    it('should return false for lesser version',function() {
      expect(new Version('1.2.3').eq('1.2.2')).equals(false);
    });
  });

  describe('valid',function() {
    it('should return true for valid version',function() {
      expect(new Version('1.2.3').valid()).equals('1.2.3');
    });
    it('should return false for invalid version',function() {
      expect(new Version('a.2.3').valid()).equals(null);
    });
  });

  describe('ge',function() {
    it('should return false for bigger version',function() {
      expect(new Version('1.2.3').ge('1.2.5')).equals(false);
    });
    it('should return true for equal version',function() {
      expect(new Version('1.2.3').ge('1.2.3')).equals(true);
    });
    it('should return true for lesser version',function() {
      expect(new Version('1.2.3').ge('1.2.2')).equals(true);
    });
  });
})
