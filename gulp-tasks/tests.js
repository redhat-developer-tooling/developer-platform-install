var angularProtractor = require('gulp-angular-protractor'),
  del = require('del'),
  exec = require('child_process').exec
  mocha = require('gulp-spawn-mocha'),
  path = require('path'),
  symlink = require('gulp-symlink');

var yargs = require('yargs');

module.exports = function(gulp) {

  gulp.task('create-electron-symlink', function() {
    return gulp.src('node_modules/electron-prebuilt')
      .pipe(symlink('node_modules/electron', {
        force: true
      }));
  });

  gulp.task('delete-electron-symlink', function() {
    return del(['node_modules/electron'], {
      force: true
    });
  });

  gulp.task('unit-test', function() {
    return gulp.src(['test/unit/**/*.js'], {
        read: false
      })
      .pipe(mocha({
        recursive: true,
        compilers: 'js:babel/register',
        env: {
          NODE_PATH: './browser'
        },
        grep: yargs.argv.grep,
        g: yargs.argv.g,
        reporter: yargs.argv.reporter
      }));
  });

  gulp.task('protractor-install', function(cb) {
    var cmd = path.join('node_modules', 'gulp-angular-protractor',
      'node_modules', 'gulp-protractor', 'node_modules', '.bin') + path.sep + 'webdriver-manager';
    cmd += ' update';

    exec(cmd, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  });

  gulp.task('protractor-run', function() {
    return gulp.src(['../test/ui/**/*.js'])
      .pipe(angularProtractor({
        'configFile': 'protractor-conf.js',
        'autoStartStopServer': false,
        'debug': false
      }))
      .on('error', function(e) {
        throw e;
      });
  });
};
