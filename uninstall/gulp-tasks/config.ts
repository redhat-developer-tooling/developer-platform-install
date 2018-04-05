'use strict';

const path = require('path');

let config = {
  artifactName : 'devsuite',
  artifactPlatform : process.platform,
  artifactArch  : process.arch,
  buildFolderRoot  : '',
  buildFileNamePrefix : '',
  // use folder outside buildFolder so that a 'clean' task won't wipe out the cache
  prefetchFolder : 'requirements-cache',
  buildFolderPath : '',
  configIcon : ''
};

config.buildFolderRoot = path.join('dist', config.artifactPlatform + '-' + config.artifactArch );
config.buildFileNamePrefix = config.artifactName;
config.buildFolderPath = path.resolve(config.buildFolderRoot);
config.configIcon = path.resolve(path.join('resources', config.artifactName + '.ico'));

module.exports = config;
