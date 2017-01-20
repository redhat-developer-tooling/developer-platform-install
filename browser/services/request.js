'use strict';

let request = require('request');

class Request {
  constructor(){
  }

  get(req) {
    return new Promise((resolve,reject)=>{
      request(req, (error, response, data) => {
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

  static factory() {
    return function(req) {
      return new Request().get(req);
    };
  }
}

Request.factory.$inject=[];

export default Request;
