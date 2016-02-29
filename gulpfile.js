var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  path = require('path'),
  mocha = require('gulp-spawn-mocha'),
  symlink = require('gulp-symlink'),
  yargs = require('yargs')
  .boolean('singleRun')
  .default({ singleRun : true });
  Server = require('karma').Server,
  angularProtractor = require('gulp-angular-protractor');

var artifactName = 'DeveloperPlatformInstaller';

gulp.task('transpile:app', function() {
  return gulp.src(['./main/*.es6.js'])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.basename = path.basename.substring(0, path.basename.length - 4)
    }))
    .pipe(gulp.dest('./main'));
});

gulp.task('clean', function() {
    return del(['dist'], {force: true});
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=win32 --arch=x64';
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
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-installer-squirrel-windows ./dist/win/' + artifactName + '-win32-x64';
  cmd += ' --out=./dist/win/ --name=developer_platform --exe=' + artifactName + '.exe';
  cmd += ' --overwrite --authors="Red Hat Developer Tooling Group"';
  cmd += ' --loading_gif=./resources/loading.gif';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('create-electron-symlink', function() {
  return gulp.src('node_modules/electron-prebuilt')
    .pipe(symlink('node_modules/electron', { force: true }));
});

gulp.task('delete-electron-symlink', function() {
  return del(['node_modules/electron'], { force: true });
});

gulp.task('unit-test', function () {
  return gulp.src(['test/unit/**/*.js'], {read: false})
    .pipe(mocha({
      recursive: true,
      compilers: 'js:babel/register',
      env: { NODE_PATH: './browser' },
      grep: yargs.argv.grep,
      g: yargs.argv.g
    }));
});

gulp.task('browser-test', function(done) {
  new Server({
    configFile: __dirname + '/karma-conf.js',
    singleRun: yargs.argv.singleRun
  }, done).start();
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-run');
});

gulp.task('protractor-run', function() {
  return gulp.src(['./test/ui/**/*.js'])
    .pipe(angularProtractor({
      'configFile': 'protractor-conf.js',
      'autoStartStopServer': false,
      'debug': false
    }))
    .on('error', function(e) { throw e; });
});

gulp.task('default', function() {
  return runSequence('generate');
});
