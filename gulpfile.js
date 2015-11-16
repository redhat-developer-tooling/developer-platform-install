var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json');

var artifactName = 'DeveloperPlatformInstaller';

gulp.task('transpile:app', function() {
  return gulp.src(['./src/main/*.es6.js'])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.basename = path.basename.substring(0, path.basename.length - 4)
    }))
    .pipe(gulp.dest('./src/main'));
});

gulp.task('clean', function() {
    return del(['dist'], {force: true});
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = 'electron-packager ./src/ ' + artifactName + ' --platform=win32 --arch=x64';
  cmd += ' --version=' + electronVersion + ' --out=./dist/win/ --overwrite --asar=true';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('run', ['transpile:app'], function(cb) {
  exec('electron ./src', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('package', function(cb) {
  var cmd = 'electron-installer-squirrel-windows ./dist/win/' + artifactName + '-win32-x64';
  cmd += ' --out=./dist/win/ --name=developer_platform --exe=' + artifactName + '.exe';
  cmd += ' --overwrite --authors="Red Hat Developer Tooling Group"';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('default', function() {
  return runSequence('clean', 'transpile:app', 'generate');
});
