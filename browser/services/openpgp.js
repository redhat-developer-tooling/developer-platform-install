const openpgp = require('openpgp'); // use as CommonJS, AMD, ES6 module or via window.openpgp

openpgp.config.aead_protect = true; // activate fast AES-GCM mode (not yet OpenPGP standard)

/**
 * Gets ASCII armored clearsign message and returns object
 * {
 *  text - text from the message
 *  valid - verification status
 *  error - error occured during verification
 * }
 */
function loadSignedText(keyText, armoredText) {
  return Promise.resolve().then(()=>{
    let options = {
      message: openpgp.cleartext.readArmored(armoredText), // parse armored message
      publicKeys: openpgp.key.readArmored(keyText).keys   // for verification
    };
    return openpgp.verify(options).then((verified)=>{
      return {options, verified};
    });
  }).catch((error)=>{
    return Promise.resolve({
      options: {
        message: {
          text: armoredText
        },
      },
      verified:  {
        signatures: [{
          valid: undefined
        }]
      },
      error
    });
  }).then(function({options, verified, error}) {
    return {
      text: options.message.text,
      valid: verified.signatures[0].valid,
      error
    };
  });
}

module.exports = loadSignedText;
