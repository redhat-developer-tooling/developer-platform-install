var angularProtractor = require('gulp-angular-protractor'),
  exec = require('child_process').exec,
  mocha = require('gulp-spawn-mocha'),
  path = require('path');

var yargs = require('yargs');
var buildFolder = path.join('dist', process.platform + '-' + process.arch);

module.exports = function(gulp) {
  gulp.task('unit-test', function() {
    return gulp.src([yargs.argv['spec-file'] || 'test/unit/**/*.js'], {
      read: false
    }).pipe(mocha({
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
      'node_modules', '.bin', 'webdriver-manager');
    cmd += ' update';

    exec(cmd, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  });

  gulp.task('protractor-run', function() {
    yargs.string(['virtualbox', 'hyperv', 'cygwin', 'jdk', 'targetFolder']);
    assignArgument('virtualbox', 'PDKI_TEST_INSTALLED_VBOX');
    assignArgument('hyperv', 'PDKI_TEST_INSTALLED_HYPERV');
    assignArgument('cygwin', 'PDKI_TEST_INSTALLED_CYGWIN');
    assignArgument('jdk', 'PDKI_TEST_INSTALLED_JDK');
    assignArgument('targetFolder', 'PDKI_TEST_TARGET_FOLDER');

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
    var cmd;

    if (process.platform === 'win32') {
      cmd = zip + ' x ' + process.env.PTOR_BINARY + ' -o' + targetFolder + ' -ry';
      process.env.PTOR_BINARY = path.join(targetFolder, 'devsuite.exe');
    } else if (process.platform === 'darwin') {
      cmd = 'unzip -o ' + process.env.PTOR_BINARY;
      process.env.PTOR_BINARY = path.join('Red\ Hat\ Development\ Suite\ Installer.app', 'Contents', 'MacOS', 'Red\ Hat\ Development\ Suite\ Installer');
    }

    exec(cmd, {maxbuffer: 1024 * 512}, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  });
};

function assignArgument(argument, target) {
  if (yargs.argv[argument] && yargs.argv[argument].length > 0) {
    process.env[target] =  yargs.argv[argument];
  }
}
