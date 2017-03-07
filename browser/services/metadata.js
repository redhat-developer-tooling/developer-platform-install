'use strict';

function loadMetadata(requirements, platform) {
  for(var object in requirements) {
    if(requirements[object].platform) {
      if(requirements[object].platform[platform]) {
        Object.assign(requirements[object], requirements[object].platform[platform]);
        delete requirements[object].platform;
      } else {
        delete requirements[object];
      }
    }
  }
  return requirements;
}

module.exports = loadMetadata;
