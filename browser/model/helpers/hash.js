const crypto = require('crypto');
const fs = require('fs-extra');

class Hash {
  SHA256(filename, done = function() {}) {
    return new Promise(function (res, rej) {
      var hash = crypto.createHash('sha256');
      var readStream = fs.createReadStream(filename);
      readStream.on('readable', function () {
        var chunk = readStream.read();
        if(chunk) {
          hash.update(chunk);
        }
      }).on('close', function () {
        var hashstring = hash.digest('hex');
        done(hashstring);
        res(hashstring);
      }).on('error', function(err) {
        done(undefined, err);
        rej(err);
      });
    });
  }
}

export default Hash;
