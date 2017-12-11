const hasha = require('hasha');


class Hash {
  SHA256(filename) {
    return hasha.fromFile(filename, {algorithm: 'sha256'}).then((hash) =>{
      return hash;
    });
  }
}

export default Hash;
