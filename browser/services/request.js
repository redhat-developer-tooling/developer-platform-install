'use strict';

class Request {
  constructor(requestMod) {
    this.request = requestMod;
  }

  get(req) {
    return new Promise((resolve, reject)=>{
      this.request(req, (error, response, data) => {
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

  static factory(requestMod) {
    return function(req) {
      return new Request(requestMod).get(req);
    };
  }
}

Request.factory.$inject=['requestMod'];

export default Request;
