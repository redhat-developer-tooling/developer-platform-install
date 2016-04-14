const crypto = require('crypto');
const fs = require('fs-extra');

class Hash {
  SHA256(filename, done) {
    var hash = crypto.createHash('sha256');
    var readStream = fs.createReadStream(filename);
    readStream.on('readable', function () {
      var chunk;
      while (null !== (chunk = readStream.read())) {
        hash.update(chunk);
      }
    }).on('end', function () {
      var hashstring = hash.digest('hex');
      done(hashstring);
    });
  }
}

export default Hash;
