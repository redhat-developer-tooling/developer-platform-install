'use strict';

function loadMetadata(requirements, platform) {
  let reqs = {}
  Object.assign(reqs, requirements);
  for(var object in requirements) {
    if(reqs[object].platform) {
      if(reqs[object].platform[platform]) {
        Object.assign(reqs[object], reqs[object].platform[platform]);
        delete reqs[object].platform;
      } else {
        delete reqs[object];
      }
    }
  }
  return reqs;
}

module.exports = loadMetadata;
