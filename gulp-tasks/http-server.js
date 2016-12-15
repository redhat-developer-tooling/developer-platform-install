//Lets require/import the HTTP module
var http = require('http');
var fs = require('fs');
var path = require('path');

//Lets define a port we want to listen to
const PORT=80;

//We need a function which handles requests and send response
function handleRequest(request, res) {
  let file = fs.readFileSync(path.join(__dirname, '..', 'requirements-cache', 'virtualbox.exe'));
  console.log('Sending file VirtualBox.exe');
  res.writeHead(200, {
    'Content-Type': 'application/x-msdownload',
    'Content-Disposition': 'inline; filename=virtual.box'});
  res.write(file, 'binary');
  res.end();
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function() {
  //Callback triggered when server is successfully listening. Hurray!
  console.log('Server listening on: http://localhost:%s', PORT);
});
