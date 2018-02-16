'use strict';

class Request {
  constructor(requestMod, $window) {
    this.request = requestMod;
    this.userAgentString = process.env.DSI_TEST_AGENT ? process.env.DSI_TEST_AGENT : $window.navigator.userAgent;
  }

  get(req) {
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
  }

  static factory(requestMod, $window) {
    return function(req) {
      return new Request(requestMod, $window).get(req);
    };
  }
}

Request.factory.$inject=['requestMod','$window'];

export default Request;
