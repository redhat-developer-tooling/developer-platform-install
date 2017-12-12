const hasha = require('hasha');


class Hash {
  SHA256(filename) {
    return hasha.fromFile(filename, {algorithm: 'sha256'});
  }
}

export default Hash;
