'use strict';

const download = require('./download.js');
const loadMetadata = require('../browser/services/metadata');
const reqs = loadMetadata(require('../requirements.json'), process.platform);
const config = require('./config.js');
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const pjson = require('../package.json');
const fs = require('fs-extra');
const common = require('./common.js');
const del = require('del');

let productName = pjson.productName;
let productVersion = pjson.version;

function buildInstaller(gulp, origin, destination, extraFiles) {
  const builder = require('electron-builder');
  const Platform = builder.Platform;

  // Promise is returned
  return builder.build({
    targets: Platform.MAC.createTarget(),
    config: {
      appId: 'com.redhat.devsuite.installer',
      mac: {
        category: 'public.app-category.developer-tools',
        icon: 'resources/devsuite.icns',
        target: ['zip'],
        publish: null
      },
      extraFiles,
      directories: {
        app : 'transpiled'
      }
    }
  }).then(() => {
    return new Promise((resolve, reject)=>{
      gulp.src(origin)
        .pipe(rename(destination))
        .pipe(gulp.dest('./')).on('end', resolve).on('error', reject);
    });
  }).then(()=>{
    return new Promise((resolve, reject)=>{
      common.createSHA256File(destination, function(error) {
        if(error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }).catch((error)=>{
    return Promise.reject(error);
  });
}

function darwinDist(gulp) {

  // prefetch all the installer dependencies so we can package them up into the .exe
  gulp.task('prefetch', ['create-prefetch-cache-dir'], function() {
    return download.prefetch(reqs, 'yes', config.prefetchFolder);
  });

  gulp.task('dist', function() {
    return runSequence('clean', 'check-requirements', 'update-requirements', 'dist-simple', 'dist-bundle', 'cleanup');
  });

  gulp.task('dist-bundle', ['prefetch'], function() {
    return buildInstaller(gulp,
      `dist/${productName}-${productVersion}-mac.zip`,
      `dist/devsuite-${productVersion}-bundle-installer-mac.zip`,
      [{
        'from': 'requirements-cache',
        'to': '.',
        'filter': ['*']
      }]);
  });

  gulp.task('dist-simple', function() {
    return buildInstaller(gulp,
      `dist/${productName}-${productVersion}-mac.zip`,
      `dist/devsuite-${productVersion}-installer-mac.zip`
    );
  });

  gulp.task('cleanup', function() {
    return del(['dist/mac'],
      { force: false });
  });

}

module.exports = darwinDist;
