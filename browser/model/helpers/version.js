'use strict';

let semver = require('semver');

class Version {

  constructor(version) {
    this.value = version;
  }

  lt (v) {
    return Version.LT(this.value,v);
  }

  gt (v) {
    return Version.GT(this.value,v);
  }

  eq (v) {
    return Version.EQ(this.value,v);
  }

  valid () {
    return semver.valid(this.value);
  }

  ge (v) {
    return Version.GE(this.value,v);
  }

  static GE (v1,v2) {
    return semver.gt(v1,v2) || v1 === v2;
  }

  static EQ(v1,v2) {
    return v1 === v2;
  }

  static GT(v1,v2) {
    return semver.gt(v1,v2);
  }

  static LT(v1,v2) {
    return semver.lt(v1,v2);
  }
}

export default Version;
