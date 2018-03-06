'use strict';
import gulp from 'gulp';

var fs = require('fs-extra'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  request = require('request'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  loadMetadata = require('./browser/services/metadata'),
  reqs = loadMetadata(require('./requirements'), process.platform),
  path = require('path'),
  mkdirp = require('mkdirp'),
  merge = require('merge-stream'),
  sourcemaps = require('gulp-sourcemaps'),
  symlink = require('gulp-symlink'),
  common = require('./gulp-tasks/common'),
  download = require('./gulp-tasks/download'),
  config = require('./gulp-tasks/config'),
  yargs = require('yargs');

require('./gulp-tasks/tests')(gulp);
require('./gulp-tasks/dist-' + process.platform)(gulp, reqs);

var testAgent = 'RedHatDevelopmentSuiteTestInstaller/' + pjson.version + ' test/' + pjson.version;

process.on('uncaughtException', function(err) {
  if(err) {
    throw err;
  }
});

gulp.task('prefetch-all', ['create-prefetch-cache-dir'], function() {
  return download.prefetch(reqs, 'no', config.prefetchFolder).then(()=>{
    return download.prefetch(reqs, 'yes', config.prefetchFolder);
  });
});

// transpile sources and copy resources to a separate folder
gulp.task('transpile:app', function() {
  var sources = gulp.src(['browser/**/*.js', 'main/**/*.js', '*.js'], {base: '.'})
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('transpiled'));

  var resources = gulp.src(['browser/**/*', '!browser/**/*.js', 'package.json',
    'uninstaller/*', 'requirements.json', 'channels.json', 'resources/*'], {base: '.'}
  ).pipe(gulp.dest('transpiled'));

  return merge(sources, resources);
});

//create symlink to node_modules in transpiled folder
gulp.task('create-modules-link', function () {
  return gulp.src('node_modules')
    .pipe(symlink('transpiled/node_modules', {force:true}));
});

gulp.task('electron-rebuild', function(cb) {
  var electronrebuild = path.join('node_modules', '.bin', 'electron-rebuild');
  exec(electronrebuild, common.createExecCallback(cb, true));
});

// clean dist/ AND prefetch-dependencies/ folder
gulp.task('clean-all', ['clean'], function() {
  return del([config.prefetchFolder], { force: true });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', ['clean-transpiled'], function() {
  return del('dist', { force: true });
});

// clean transpiled/ folder in prep for fresh build
gulp.task('clean-transpiled', function() {
  return del(['transpiled'], { force: true });
});


gulp.task('clean-old-cache', function() {
  var files = [config.prefetchFolder + '/*'];
  for (var key in reqs) {
    files.push('!' + config.prefetchFolder + '/' + reqs[key].fileName);
  }

  return del(files, { force: true });
});

gulp.task('create-dist-dir', function(cb) {
  return mkdirp(config.buildFolderPath, cb);
});

gulp.task('generate', ['create-modules-link', 'update-requirements', 'electron-rebuild'], function(cb) {
  var electronVersion = pjson.devDependencies['electron'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager transpiled ' + config.artifactName + ' --platform=' + config.artifactPlatform + ' --arch=' + config.artifactArch;
  cmd += ' --version=' + electronVersion + ' --out="' + config.buildFolderPath + '" --overwrite --asar.unpack=**/browser/**/*.ps1 --asar.unpackDir="browser/model/helpers/win32/*"';
  cmd += ' --version-string.CompanyName="Red Hat, Inc."';
  cmd += ' --version-string.ProductName="' + pjson.productName + '"';
  cmd += ' --version-string.OriginalFilename="' + config.artifactName + '-' + pjson.version + '-installer.exe"';
  cmd += ' --version-string.FileDescription="' + pjson.description + ' v' + pjson.version + '"';
  cmd += ' --app-copyright="Copyright 2016 Red Hat, Inc."';
  cmd += ' --app-version="' + pjson.version + '"' + ' --build-version="' + pjson.version + '"';
  cmd += ' --prune --ignore="test|' + config.prefetchFolder + '|node_modules/patternfly/(node_modules|src|backstop_data|backstop)|.github|readme.md|README.md|CHANGELOG.md|changelog.md|CHANGES|CHANDES.md|changes.md|.travis.yml|.npmignore.|.eslintrc"';
  cmd += ' --icon="' + config.configIcon + '"';
  exec(cmd, common.createExecCallback(cb, true));
});

// default task
gulp.task('default', ['run-clean']);

gulp.task('run-clean', function(cb) {
  process.env.DSI_TEST_AGENT = testAgent;
  return runSequence( 'clean-transpiled', 'run', cb);
});

gulp.task('run', ['update-requirements', 'create-modules-link', 'electron-rebuild'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron transpiled', common.createExecCallback(cb));
});

gulp.task('update-requirements', ['transpile:app'], function() {

  let updateDevStudioVersion = ()=>{
    return new Promise((resolve, reject) => {
      let url;
      if(reqs['devstudio'].url.endsWith('/')) {
        url = reqs['devstudio'].url + '/content.json';
      } else {
        url = reqs['devstudio'].url.substring(0, reqs['devstudio'].url.lastIndexOf('/')) + '/content.json';
      }

      console.log(url);
      request(url, (err, response, body)=>{
        if (err) {
          reject(err);
        } else {
          let meta = JSON.parse(body);
          let versionRegex = /(\d+\.\d+\.\d+\.\w+\d*).*/;
          let finalVersion = versionRegex.exec(meta.fullVersion)[1];

          if (reqs.devstudio.version != finalVersion) {
            reqs.devstudio.version = finalVersion;
          }
          console.log(meta);
          if(reqs.devstudio.sha256sum == '') {
            let latestUrl = meta.installer.replace(/devstudio-.+\.jar/, 'devstudio-' + finalVersion.substring(0, finalVersion.lastIndexOf('.') + 1) + 'latest-installer-standalone.jar');
            reqs.devstudio.url = latestUrl;
            reqs.devstudio.dmUrl = latestUrl;
            reqs.devstudio.fileName = reqs.devstudio.url.substring(reqs.devstudio.url.lastIndexOf('/') + 1);
            reqs.devstudio.sha256sum = reqs.devstudio.url + '.sha256';
          }
          reqs.fusetools.fileName = reqs.devstudio.fileName;
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

  let updateDevStudioSize = ()=>{
    return new Promise((resolve) => {
      let req = request.get(reqs.devstudio.url).on('response', function(response) {
        reqs.devstudio.size = parseInt(response.headers['content-length'], 10);
        req.abort();
        resolve();
      });
    });
  };

  return Promise.resolve();
});

gulp.task('test', ['unit-test']);

gulp.task('ui-test', function(cb) {
  process.env.DSI_TEST_AGENT = testAgent;
  process.env.PTOR_TEST_RUN = 'ui';
  return runSequence(['generate'], 'protractor-run', cb);
});

gulp.task('system-test', function(cb) {
  process.env.DSI_TEST_AGENT = testAgent;
  process.env.PTOR_TEST_RUN = 'system';
  let tasks = [];
  if (process.platform === 'win32') {
    tasks.push('prepare-tools');
  }
  tasks.push('unpack-installer', 'protractor-run');
  return runSequence(...tasks, cb);
});

gulp.task('create-prefetch-cache-dir', function() {
  if (!fs.existsSync(config.prefetchFolder)) {
    mkdirp(config.prefetchFolder);
  }
});

//check if URLs in requirements.json return 200 and generally point to their appropriate tools
gulp.task('check-requirements', function(cb) {
  if(yargs.argv['skip-req-check']) {
    cb();
  } else {
    exec('node test/check-requirements.js', common.createExecCallback(cb, false));
  }
});

gulp.task('watch', function () {
  gulp.watch(['test/**/*.js', 'browser/**/*.js'], ()=>runSequence('unit-test'));
});
