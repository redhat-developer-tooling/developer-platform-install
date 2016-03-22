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
  path = require('path'),

  copy = require('gulp-copy'),
  concat = require('gulp-concat');
require('./gulp-tasks/tests')(gulp);

process.env.INIT_CWD;
var homedir = process.cwd();

var artifactName = 'DeveloperPlatformInstaller',
    artifactPlatform = 'win32',
    artifactArch = 'x64';

var buildFolderRoot = 'dist/win/';
var buildFileNamePrefix = artifactName + '-' + artifactPlatform + '-' + artifactArch;
var buildFolder = buildFolderRoot + buildFileNamePrefix;

var prefetchFolder = buildFolderRoot + buildFileNamePrefix; // or just use downloads/ folder to that a clean doesn't wipe out the downloads

gulp.task('transpile:app', function() {
  return gulp.src(['./main/*.es6.js'])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.basename = path.basename.substring(0, path.basename.length - 4)
    }))
    .pipe(gulp.dest('./main'));
});

// clean dist/ AND downloads/ folder
gulp.task('clean-all', ['clean'], function() {
  return del([prefetchFolder], { force: true });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
  return del(['dist'], { force: true });
});

// currently not used
gulp.task('create-zip', () => {
    return gulp.src(buildFolderRoot + buildFolderRoot + '/**/*')
        .pipe(zip(buildFolderRoot + '.zip'))
        .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out=./' + buildFolderRoot + ' --overwrite --asar=true';
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
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-installer-squirrel-windows ./' + buildFolderRoot + buildFolderRoot;
  cmd += ' --out=./' + buildFolderRoot + ' --name=developer_platform --exe=' + artifactName + '.exe';
  cmd += ' --overwrite --authors="Red Hat Developer Tooling Group"';
  cmd += ' --loading_gif=./resources/loading.gif';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// must install 7zip from http://www.7-zip.org/ for this to work
// Takes about 30 seconds in console, but only does extraction of the .exe; does not perform install
gulp.task('7zipsfx-cmd', function (cb) {
  // simple sfx 
  var cmd = 'c:' + path.sep + 'Progra~1' + path.sep + '7-Zip' + path.sep + '7z.exe -sfx -r a ' + buildFolder + '-cmd.exe ' + buildFolder;
  exec(cmd, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// must install 7zip from http://www.7-zip.org/ for this to work
// Takes about 30 seconds w/ GUI to prompt for extraction location, but only does extraction of the .exe; does not perform install
gulp.task('7zipsfx-win', function (cb) {
  // simple sfx 
  var cmd = 'c:' + path.sep + 'Progra~1' + path.sep + '7-Zip' + path.sep + '7z.exe -sfx7z.sfx -r a ' + buildFolder + '-win.exe ' + buildFolder;
  exec(cmd, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

// must install 7zip from http://www.7-zip.org/ for this to work
// complex sfx, using config.txt file to support extraction & immediate installation
gulp.task('7zipsfx-adv', function() {
  return runSequence('7zipsfx-del-exe', '7zipsfx-copy', '7zipsfx-7z', '7zipsfx-concat', '7zipsfx-cleanup');
});

gulp.task('7zipsfx-del-exe', function () {
  // // remove .7z archive
  return del([buildFolder + '-sfx.exe'], { force: true });
});

gulp.task('7zipsfx-copy', function () {
  return gulp.src(['7zS.sfx','config.txt'])
    .pipe(copy(buildFolderRoot));
});

gulp.task('7zipsfx-7z', function (cb) {
  var cmd = 'c:' + path.sep + 'Progra~1' + path.sep + '7-Zip' + path.sep + '7z.exe -r a ../' + buildFileNamePrefix + '.7z ' + '.';
  process.chdir(buildFolder);
  exec(cmd, function (err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
  process.chdir(homedir);
});

// merge .7z with config.txt and 7zS.sfx controller
gulp.task('7zipsfx-concat', function () {
  return gulp.src([buildFolderRoot + '7zS.sfx', buildFolderRoot + 'config.txt', buildFolderRoot + buildFileNamePrefix + '.7z'])
    .pipe(concat(buildFileNamePrefix + '-sfx.exe'))
    .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('7zipsfx-cleanup', function () {
  // // remove .7z archive
  return del([buildFolderRoot + '7zS.sfx', buildFolderRoot + 'config.txt', buildFolderRoot + buildFileNamePrefix + '.7z'], { force: true });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-install', 'protractor-run');
});

gulp.task('default', function() {
  return runSequence('prefetch','generate','7zipsfx-adv');
});

// download all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', function() {
  for (var key in reqs) {
    if (reqs.hasOwnProperty(key)) {
      let currentUrl = reqs[key].url;
      let currentKey = key;
      // download only what can be included in offline installer
      if (reqs[key].bundle === 'yes') {
        if (reqs[key].url.endsWith('/')) {
          request(currentUrl, (err, rsp, body) => {
            var fname = body.match(/openshift-origin-client-tools-v\w(\.\w)(\.\w){1,3}-\w{1,3}-\w{8}-\w{7}-windows\.zip/)[0];
            console.log('DOWNLOADING -> ' + currentUrl.concat(fname));
            request(currentUrl.concat(fname))
              .pipe(fs.createWriteStream(path.join(prefetchFolder, currentKey)));
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
