'use strict';

var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var pem = require('pem');
var path = require('path');
var requirements = require('..\\requirements.json');

var PORT = 443;

function handleRequest(req, res) {

  // Send file in response
  //http://stackoverflow.com/questions/16333790/node-js-quick-file-server-static-files-over-http
  //
  //Process Post Request
  if(req.method === 'POST') {

    var data = '';

    req.on('data', function(chunk) {
      data += chunk;
    });

    req.on('end', function() {
      var parseData = qs.parse(data);
      var prettyData = JSON.stringify(parseData, null, 2);
      console.log('Post request with:\n' + prettyData);
      res.end(prettyData);
    });

  } else if(req.method === 'GET') {
    let url = req.url;
    console.log(`Url='${url}'`);
    if (url.endsWith('/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip')) {
      res.end('true');
    } else if(url.endsWith('/favicon.ico')) {
      // not required
    } else {
      console.log('Request to download manager ');
      for (let prop in requirements) {
        let requirement = requirements[prop];
        if(requirement.platform[process.platform].dmUrl && requirement.platform[process.platform].dmUrl.endsWith(url)
          || requirement.platform[process.platform].url && requirement.platform[process.platform].url.endsWith(url) ) {
          console.log('Issuing redirect ' + 'https://' + req.headers['host'] + '/' + prop);
          res.writeHead(302, { 'Location': 'https://' + req.headers['host'] + '/requirements-cache/' + prop });
          res.end();
          return;
        }
      }
      url = url.substring(1);
      console.log(`Sending file ${url}`);

      let filePath = path.join(__dirname, '..', url);
      var readStream = fs.createReadStream(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/x-msdownload',
        'Content-length': fs.statSync(filePath).size});
      readStream.pipe(res);
    }
  }
}

pem.createCertificate({days:5, selfSigned:true}, function(err, keys) {
  if(err) {
    console.log(err);
    return;
  }
  var options = {
    key: keys.serviceKey,
    cert: keys.certificate
  };

  //Create a server
  var server = https.createServer(options, handleRequest);

  //Start server
  server.listen(PORT, function() {
    console.log('Server listening on: https://localhost:' + PORT);
  });
});
