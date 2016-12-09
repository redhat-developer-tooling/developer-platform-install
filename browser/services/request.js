'use strict';

let request = require('request');

class Request {
  constructor() {
  }

  get(req) {
    return new Promise((resolve, reject)=>{
      request(req, (error, response, data) => {
        if (!error && response.statusCode == 200) {
          resolve({
            status: response.statusCode,
            data: JSON.parse(data)
          });
        } else {
          reject();
        }
      });
    });
  }

  static factory() {
    return function(req) {
      return new Request().get(req);
    };
  }
}

Request.factory.$inject=[];

export default Request;
