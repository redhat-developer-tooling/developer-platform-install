var angularProtractor = require('gulp-angular-protractor'),
  del = require('del'),
  exec = require('child_process').exec,
  mocha = require('gulp-spawn-mocha'),
  path = require('path'),
  symlink = require('gulp-symlink');

var yargs = require('yargs');
var buildFolder = path.join('dist', process.platform + '-' + process.arch);

module.exports = function(gulp) {
  gulp.task('unit-test', function() {
    return gulp.src(['test/unit/**/*.js'], {
        read: false
      })
      .pipe(mocha({
        recursive: true,
        compilers: 'js:babel-core/register',
        env: {
          NODE_PATH: '.'
        },
        grep: yargs.argv.grep,
        g: yargs.argv.g,
        reporter: yargs.argv.reporter,
        istanbul: {
          report: yargs.argv.report || 'lcov'
        }
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

  gulp.task('unpack-installer', function(cb) {
    process.env.PTOR_BINARY = yargs.argv.binary;
    var zip = path.join(buildFolder, '7za.exe');
    var targetFolder = path.join(buildFolder, 'target');
    console.log(targetFolder);
    var cmd = zip + ' x ' + process.env.PTOR_BINARY + ' -o' + targetFolder + ' -ry';
    process.env.PTOR_BINARY = path.join(targetFolder, 'devsuite.exe');

    exec(cmd, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  });
};
