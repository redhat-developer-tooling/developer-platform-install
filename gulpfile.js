'use strict';

var gulp = require('gulp'),
  fs = require('fs-extra'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  zip = require('gulp-zip'),
  request = require("request"),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  reqs = require('./requirements.json'),
  path = require('path');

require('./gulp-tasks/tests')(gulp);

var artifactName = 'DeveloperPlatformInstaller',
  artifactPlatform = 'win32',
  artifactArch = 'x64';

var prefetchFolder = 'dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch; // or use downloads/ folder to that a clean doesn't wipe out the downloads
var buildFolder = 'dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch;

gulp.task('transpile:app', function() {
  return gulp.src(['./main/*.es6.js'])
    .pipe(babel())
    .pipe(rename(function(path) {
      path.basename = path.basename.substring(0, path.basename.length - 4)
    }))
    .pipe(gulp.dest('./main'));
});

// clean dist/ AND downloads/ folder
gulp.task('clean-all', ['clean'], function() {
  return del([prefetchFolder], {
    force: true
  });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
  return del(['dist'], {
    force: true
  });
});

gulp.task('create-zip', () => {
  return gulp.src('dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch + '/**/*')
    .pipe(zip(artifactName + '-' + artifactPlatform + '-' + artifactArch + '.zip'))
    .pipe(gulp.dest('dist/win'));
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out=./dist/win/ --overwrite --asar=true';
  cmd += ' --prune --ignore=test';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('run', ['transpile:app'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron .', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('package', function(cb) {
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-installer-squirrel-windows ./dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch;
  cmd += ' --out=./dist/win/ --name=developer_platform --exe=' + artifactName + '.exe';
  cmd += ' --overwrite --authors="Red Hat Developer Tooling Group"';
  cmd += ' --loading_gif=./resources/loading.gif';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// must install 7zip from http://www.7-zip.org/ for this to work
gulp.task('7zipsfx', function(cb) {
  var cmd = 'c:' + path.sep + 'Progra~1' + path.sep + '7-Zip' + path.sep + '7z.exe -sfx -r a ' + buildFolder + '.exe ' + buildFolder;

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-install', 'protractor-run');
});

gulp.task('default', function() {
  return runSequence('generate', 'create-zip', 'electronwinstaller');
});

// download all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', function() {
  for (var key in reqs) {
    if (reqs.hasOwnProperty(key)) {
      let currentUrl = reqs[key].url;
      // download only what can be included in offline installer
      if (reqs[key].bundle === 'yes') {
        if (reqs[key].url.endsWith('/')) {
          request(currentUrl, (err, rsp, body) => {
            var fname = body.match(/openshift-origin-client-tools-v\w(\.\w)(\.\w){1,3}-\w{1,3}-\w{8}-\w{7}-windows\.zip/)[0];
            console.log('DOWNLOADING -> ' + currentUrl.concat(fname));
            request(currentUrl.concat(fname))
              .pipe(fs.createWriteStream(path.join(prefetchFolder, key)));
          });
        } else {
          console.log('DOWNLOADING -> ' + reqs[key].url);
          request(reqs[key].url)
            .pipe(fs.createWriteStream(path.join(prefetchFolder, key)));
        }
      }
    }
  }
});
