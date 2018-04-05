'use strict';
// import gulp from 'gulp';

var gulp = require('gulp'),
  fs = require('fs-extra'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  request = require('request'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  path = require('path'),
  mkdirp = require('mkdirp'),
  merge = require('merge-stream'),
  sourcemaps = require('gulp-sourcemaps'),
  symlink = require('gulp-symlink'),
  common = require('./gulp-tasks/common'),
  config = require('./gulp-tasks/config'),
  yargs = require('yargs');



process.on('uncaughtException', function(err) {
  if(err) {
    throw err;
  }
});

// transpile sources and copy resources to a separate folder
gulp.task('transpile:app', function() {
  var sources = gulp.src(['browser/**/*.js', 'main/*', '*.js'], {base: '.'})
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('transpiled'));

  var resources = gulp.src(['browser/**/*', '!browser/**/*.js', 'package.json'], {base: '.'}
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
  return runSequence( 'clean-transpiled', 'run', cb);
});

gulp.task('run', ['update-requirements', 'create-modules-link', 'electron-rebuild'], function(cb) {
  let skipInstall = process.argv.filter(name => name === '--skipInstall').length == 1 ? "skipInstall":"";
  console.log(path.join('node_modules', '.bin') + path.sep + 'electron transpiled ' + skipInstall)
  exec(path.join('node_modules', '.bin') + path.sep + 'electron transpiled ' + skipInstall, common.createExecCallback(cb));
});

gulp.task('update-requirements', ['transpile:app'], function() {
});
