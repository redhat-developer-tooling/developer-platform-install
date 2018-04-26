'use strict';

class Request {
  constructor(requestMod, $window, electron ) {
    this.request = requestMod;
    this.electron = electron;
    this.userAgentString = $window.navigator.userAgent;
    if(process.env.DSI_TEST_AGENT && this.userAgentString) {
      this.userAgentString = $window.navigator.userAgent.replace("Installer", "TestInstaller");
    }
  }

  get(req) {
    return new Promise((resolve)=> {
      if(this.electron) {
        this.electron.remote.getCurrentWindow().webContents.session.resolveProxy("https://google.com", function(p){
          //parse PROXY XXX.XXX.XXX.XXX:XXXX;
          let proxy = p.replace(/(PROXY|DIRECT)/g,'').replace(/;/g,'').replace(/ /g,'');
          resolve(proxy.length > 0 ? `http://${proxy}`: undefined);
          console.log(proxy);
        });
      } else {
        resolve();
      }
    }).then((proxy)=> {
      return new Promise((resolve, reject)=>{
        let options;
        if (req instanceof Object) {
          options = req;
        } else {
          options = {
            url: req
          };
        }
        if(options.headers === undefined) {
          options.headers = {};
        }
        if(proxy) {
          options.proxy = proxy;
        }
        options.headers['User-Agent'] = this.userAgentString;

        this.request(options, (error, response, data) => {
          if (error) {
            reject(error);
          } else if(response.statusCode == 200) {
            resolve({
              status: response.statusCode,
              data: JSON.parse(data)
            });
          } else if (response.statusCode == 401) {
            resolve({
              status: response.statusCode,
              data: data
            });
          } else {
            resolve({
            status: response.statusCode
            });
          }
        });
      });
    });
  }

  static factory(requestMod, $window, electron) {
    return function(req) {
      return new Request(requestMod, $window, electron).get(req);
    };
  }
}

Request.factory.$inject=['requestMod', '$window', 'electron'];

export default Request;
