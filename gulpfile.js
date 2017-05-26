'use strict';

var gulp = require('gulp'),
  fs = require('fs-extra'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  request = require('request'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  loadMetadata = require('./browser/services/metadata'),
  reqs = loadMetadata(require('./requirements.json'), process.platform),
  path = require('path'),
  mkdirp = require('mkdirp'),
  merge = require('merge-stream'),
  sourcemaps = require('gulp-sourcemaps'),
  symlink = require('gulp-symlink'),
  common = require('./gulp-tasks/common'),
  config = require('./gulp-tasks/config');

require('./gulp-tasks/tests')(gulp);
require('./gulp-tasks/dist-' + process.platform)(gulp);

process.on('uncaughtException', function(err) {
  if(err) {
    throw err;
  }
});

// transpile sources and copy resources to a separate folder
gulp.task('transpile:app', function() {
  var sources = gulp.src(['browser/**/*.js', 'main/**/*.js', '*.js'], {base: '.'})
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('transpiled'));

  var resources = gulp.src(['browser/**/*', '!browser/**/*.js', 'package.json',
    'uninstaller/*', 'requirements.json'], {base: '.'}
	).pipe(gulp.dest('transpiled'));

  return merge(sources, resources);
});

// create symlink to node_modules in transpiled folder
gulp.task('create-modules-link', function() {
  return gulp.src('node_modules')
    .pipe(symlink('transpiled/node_modules', {
      force: true
    }));
});

// clean dist/ AND prefetch-dependencies/ folder
gulp.task('clean-all', ['clean'], function() {
  return del([config.prefetchFolder], { force: true });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
  var files = ['dist', 'transpiled', config.prefetchFolder + '/*'];
  for (var key in reqs) {
    files.push('!' + config.prefetchFolder + '/' + reqs[key].filename);
  }

  return del(files, { force: true });
});

gulp.task('create-dist-dir', function(cb) {
  return mkdirp(config.buildFolderPath, cb);
});

gulp.task('generate', ['create-modules-link', 'update-requirements'], function(cb) {
  var electronVersion = pjson.devDependencies['electron'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager transpiled ' + config.artifactName + ' --platform=' + config.artifactPlatform + ' --arch=' + config.artifactArch;
  cmd += ' --version=' + electronVersion + ' --out="' + config.buildFolderPath + '" --overwrite --asar.unpack=**/browser/**/*.ps1 --asar.unpackDir="browser/model/helpers/win32/*"';
  cmd += ' --version-string.CompanyName="Red Hat, Inc."';
  cmd += ' --version-string.ProductName="' + pjson.productName + '"';
  cmd += ' --version-string.OriginalFilename="' + config.artifactName + '-' + pjson.version + '-installer.exe"';
  cmd += ' --version-string.FileDescription="' + pjson.description + ' v' + pjson.version + '"';
  cmd += ' --app-copyright="Copyright 2016 Red Hat, Inc."';
  cmd += ' --app-version="' + pjson.version + '"' + ' --build-version="' + pjson.version + '"';
  cmd += ' --prune --ignore="test|' + config.prefetchFolder + '"';
  cmd += ' --icon="' + config.configIcon + '"';
  //console.log(cmd);
  exec(cmd, common.createExecCallback(cb, true));
});

// default task
gulp.task('default', ['run']);

gulp.task('run', ['update-requirements', 'create-modules-link'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron transpiled', common.createExecCallback(cb));
});

gulp.task('update-requirements', ['transpile:app'], function() {

  let updateDevStudioVersion = ()=>{
    return new Promise((resolve, reject) => {
      let url = reqs['devstudio'].url.substring(0, reqs['devstudio'].url.lastIndexOf('/')) + '/content.json';
      request(url, (err, response, body)=>{
        if (err) {
          reject(err);
        } else {
          let versionRegex = /(\d+\.\d+\.\d+\.\w+\d*).*/;
          let finalVersion = versionRegex.exec(body)[1];

          if (reqs['devstudio'].version != finalVersion) {
            reqs['devstudio'].version = finalVersion;
          }
          resolve();
        }
      });
    });
  };

  let updateDevStudioSha = ()=>{
    return new Promise((resolve) => {
      let url = reqs['devstudio'].sha256sum;
      if (url.length == 64 && url.indexOf('http')<0 && url.indexOf('ftp')<0) {
        resolve();
      } else {
        request(url, (err, response, body) => {
          reqs['devstudio'].sha256sum = body;
          resolve();
        });
      }
    });
  };

  return Promise.resolve()
    .then(updateDevStudioVersion)
    .then(updateDevStudioSha)
    .then(()=>{
      fs.writeFile('./transpiled/requirements.json', JSON.stringify(reqs, null, 2));
    }).catch((err)=>{
      console.log(err);
    });
});

gulp.task('test', ['unit-test']);

gulp.task('ui-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'ui';
  return runSequence(['generate'], 'protractor-run', cb);
});

gulp.task('system-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'system';
  let tasks = [];
  if (process.platform === 'win32') {
    tasks.push('prepare-tools');
  }
  return runSequence(tasks, 'unpack-installer', 'protractor-run', cb);
});

gulp.task('create-prefetch-cache-dir', function() {
  if (!fs.existsSync(config.prefetchFolder)) {
    mkdirp(config.prefetchFolder);
  }
});

//check if URLs in requirements.json return 200 and generally point to their appropriate tools
gulp.task('check-requirements', function(cb) {
  exec('node test/check-requirements.js', common.createExecCallback(cb, false));
});

gulp.task('watch', function () {
  gulp.watch(['test/**/*.js', 'browser/**/*.js'], ()=>runSequence('unit-test'));
});
