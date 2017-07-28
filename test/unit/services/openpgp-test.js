'use strict';

import chai, { expect } from 'chai';
import 'sinon';
import { default as sinonChai } from 'sinon-chai';
chai.use(sinonChai);
import loadSignedText from 'browser/services/openpgp';

let publicKey =
`-----BEGIN PGP PUBLIC KEY BLOCK-----

mQENBFl45PABCADa3JMtyxLpEvxiqFsqM0D7p+R5bG4WDUW2Gf3A4olL3Ba1dMbY
XuVKN2VVWF0eaX/kkPFWFQQ/zUbBR5A8BcCzWrVNm7NvbSxkwqS8U8imc+0QYz6f
RQfYvzGaN3rg2EJ4XiGy5M7nVoPmwk9xqbhJxxv3d507oPDN1FOnoTY68Y+GbiUM
HF3mFlBtQwxhGxlFhwPABmHypfeBCk36s0TzzvAekNcT8ROuWM+68KjtZEbizQ4J
0ZYeLixdTyN3em4ve+hFFjiQOZbh5PKzrSP8nw1EFoAdHnefO/2vUe6pp3G8y8CB
zlT2ZU2kuFsP7I5HeZoGi4DbbXgJyqhp4jGrABEBAAG0S0RlbmlzIEdvbG92aW4g
KFRlc3Qgc2lnbmluZyBhbmQgdmVyaWZ5aW5nIHRleHQgZmlsZXMpIDxkZ29sb3Zp
bkByZWRoYXQuY29tPokBOAQTAQIAIgUCWXjk8AIbAwYLCQgHAwIGFQgCCQoLBBYC
AwECHgECF4AACgkQHrpirkCkMkpT6gf+LwCUJRHpL/V2z8A2ZDbf8nT/9AIOmpdq
z/mUj3kJUbrPTel7jel2qAqCDC7/BySPVjToqfX/Ww8yiq48j9xtWOenPb52QO0S
zBdxnFUK/zS4Iij60aBamWOSkCw/cYmze93bttvaAiqgArnPD32rWTHDF9ruosAm
N7/ymBYbyoBwcGklnShl4lahW7OBuDCFejn+8Wz5NZAzG05OXdwjMGnslCsjyRLb
i7VfgRBgHbGCMIcrwn7VrMbYgIx/yEoyr8jwGLiK0ucdEqAH8GdBQJStEL58TReE
/StWaVC81U5dgZaedSdGlNLQacXltmuJpg2Lcpj8v22aneLFBkThYLkBDQRZeOTw
AQgA7DuKmKOOJ8iSAl+cI4OcS6kwowxMZKnR4eS/QVJYUMCw+WxdQprhakGUcoo2
9EiyxwvXrp/RNFIzPYJ8frRYKrfPMY0ginpvKKNFnU7/INjHn7EnQkpJjAK15A+f
QdKhvetBvU1I3CB4xHGjmYdMOySGnaNHZQu1dmkdBiDT4o66H4bu0H3J956QhQr8
7r9fYf2Qd9Lfw+a3or5O0Dcag1bHtUOx8B/cw3dXK/TFa+/ECQbeqA3pn4WQfsoH
ZvBUAvE+nCABJg9lXDrtyhzIlha9fvk/vUguo0tZ1XW5YCkeNVWqig/Ju8eydUHc
7FClF1rJ9TTZBoZoNO9O51FtxwARAQABiQEfBBgBAgAJBQJZeOTwAhsMAAoJEB66
Yq5ApDJKnJIH/3ldHeikhjDIJOno+DMKBs9iGpSl3PZI9qXBXxb13KTGAwCkcIja
fc4Bn6w/dKoa5CumYHr4Uf5VrGxvRFyCkiA3YZ6/EarYpWaEAO179qYeGuwiCMuV
ihUuCGhXKsl8sig4j1YMyGg058HgZov81yLnPHBeLpTsFRj/7SPT0eJjWyZmK3dS
zMlxS8jFPEeBPA7EI4bDQCdg/kBK9C89s2xmZOxz3PtCzoMtj9KICvLzCf0OX1hR
Y8WRZUzrkAkouuli0sfWGIsHSEPFCrNdKdoIud0Klrc/ATMD0tDjz7MEl7brEC08
vRYoPDOBq3YXZ0LdaZwVObM7KV0Ncw2YWg4=
=uZLc
-----END PGP PUBLIC KEY BLOCK-----
`;

let validText = 'message';

let validClearsignMessage = `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA1

${validText}
-----BEGIN PGP SIGNATURE-----

iQEcBAEBAgAGBQJZepDRAAoJEB66Yq5ApDJKuq0H/0+VsT3mHuFTh+FKyt41HyiK
Q33ILdJYT4TtTu7M0teWR6TJtl0K6bHbSP7Z9wQcMmkgnHJzpZPxIwUgvKczQeXZ
q8+D7t0k/G8X+LgLOY/69zjILIU3NGAV0bVYE77hI45uJCYZCdja5OVsbU7i17Hn
jeqX+3shBCBtdo1lOPPSPagkbxEq6T86SKhMdY47UUJhIQ6tDYg3W+Kb1aVjjwlN
LO3H861OaD3fHWTg2azY6woFr0mu0Fq68a/rpsEUGuXagtdoZaE+VP1SrsIpuPZM
9lrN/Ml1q4GNhtoiggefuxXwKLhgXwkDYM3wSwtmKxqh4Z4fAkO17Gk+CeU71x8=
=w6uW
-----END PGP SIGNATURE-----
`;

let invalidText = `altered message`;

let invalidClearsignMessage = `-----BEGIN PGP SIGNED MESSAGE-----
Hash: SHA1

${invalidText}
-----BEGIN PGP SIGNATURE-----

iQEcBAEBAgAGBQJZeoQxAAoJEB66Yq5ApDJK5usH/2qkKG5XTj/T9wWsGu/v0MHH
12+2gANlC1EQ32CoL9uXCysD7inERvm57jmLkQ0ZXvxFUGU6WUKrWUHoX5NC+r6Z
evXS46e+naO+tEAh+lX7ySf/1gzjql6VXIJyvT48nHoRHqaBnI1hpqJNdwB+QwKT
Sj0xTdgQGZc/yw986wo/g6ZQpmkXU65nWAT7zW5scA5BCwr4+18pjPQngWmEQO3T
FVxwE4bk/i7FxdlK6wRCYqiIw/Li5r6SaFKJQQC4nIpI3oOqkE/KVrgtmHAWTPvg
8kPyXpmtuQuLWUmXCJEsjujdIK6OT2aOpB7Ishw6GnVHgdyPklb7TlpuBo3gGYs=
=H66B
-----END PGP SIGNATURE-----
`;

let messageWithoutSignature = 'messsage without signature';

describe('OpenPGP', function() {
  describe('loadSignedText', function() {
    it('for valid signed file returns text without signature, valid equals true and no errors', function() {
      return loadSignedText(publicKey, validClearsignMessage).then(({text, valid, error})=>{
        expect(text.trim()).equals(validText);
        expect(valid).to.be.true;
        expect(error).to.be.undefined;
      });
    });
    it('for altered signed file returns text without signature, valid equals false and no errors', function() {
      return loadSignedText(publicKey, invalidClearsignMessage).then(({text, valid, error})=>{
        expect(text.trim()).equals(invalidText);
        expect(valid).to.be.false;
        expect(error).to.be.undefined;
      });
    });
    it('for unsigned text returns text itself, valid equals undefined and error is not undefined', function() {
      return loadSignedText(publicKey, messageWithoutSignature).then(({text, valid, error})=>{
        expect(text.trim()).equals(messageWithoutSignature);
        expect(valid).to.be.undefined;
        expect(error).not.to.be.undefined;
      });
    });
  });
});
