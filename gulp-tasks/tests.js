var angularProtractor = require('gulp-angular-protractor'),
  exec = require('child_process').exec,
  mocha = require('gulp-spawn-mocha'),
  path = require('path'),
  globby = require('globby');

var open = require('gulp-open');
var yargs = require('yargs');
var buildFolder = path.join('dist', process.platform + '-' + process.arch);

module.exports = function(gulp) {

  gulp.task('unit-test-1by1', function() {
    return globby('test/unit/**/*.js', {root: '.'}).then(function(files) {
      files.reduce((promises, file) => {
        return promises.then(function() {
          return new Promise(function(resolve) {
            gulp.src([file], {
              read: false
            }).pipe(mocha({
              recursive: false,
              compilers: 'js:babel-core/register',
              env: {
                NODE_PATH: '.'
              },
              grep: yargs.argv.grep,
              g: yargs.argv.g,
              reporter: yargs.argv.reporter
            })).on('end', resolve);
          });
        });
      }, Promise.resolve());
    });
  });

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
    })).on('end', function() {
      if(yargs.argv['open-report']) {
        gulp.src(path.join('coverage', 'lcov-report', 'index.html')).pipe(open());
      }
    });
  });

  gulp.task('webdriver-update', function(cb) {
    let cmd = 'node ' + path.join('node_modules', 'protractor', 'bin', 'webdriver-manager') + ' update --chrome=true --gecko=false';

    exec(cmd, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      cb(err);
    });
  });

  gulp.task('protractor-run', ['webdriver-update'], function(cb) {
    yargs.string(['virtualbox', 'hyperv', 'cygwin', 'jdk', 'targetFolder', 'additionalItems']);
    assignArgument('virtualbox', 'PDKI_TEST_INSTALLED_VIRTUALBOX');
    assignArgument('hyperv', 'PDKI_TEST_INSTALLED_HYPERV');
    assignArgument('cygwin', 'PDKI_TEST_INSTALLED_CYGWIN');
    assignArgument('jdk', 'PDKI_TEST_INSTALLED_JDK');
    assignArgument('targetFolder', 'PDKI_TEST_TARGET_FOLDER');
    assignArgument('additionalItems', 'PDKI_TEST_ADDITIONAL_ITEMS');

    gulp.src(['../test/ui/**/*.js'])
      .pipe(angularProtractor({
        'configFile': 'protractor-conf.js',
        'autoStartStopServer': false,
        'debug': false
      }))
      .on('error', function(e) {
        cb(e);
      })
      .on('end', cb);
  });

  gulp.task('unpack-installer', function(cb) {
    process.env.PTOR_BINARY = yargs.argv.binary;
    var bundle = yargs.argv.bundle;
    var zip = path.join(buildFolder, '7za.exe');
    var targetFolder = path.join(buildFolder, 'target');
    var cmd;

    if (process.platform === 'win32') {
      cmd = zip + ' x ' + process.env.PTOR_BINARY + ' -o' + targetFolder + ' -ry';
      process.env.PTOR_BINARY = targetFolder;
    } else if (process.platform === 'darwin') {
      targetFolder = 'dist';
      cmd = 'unzip -o ' + '"' + process.env.PTOR_BINARY + '" -d ' + targetFolder;
      process.env.PTOR_BINARY = path.join(targetFolder, 'Red\ Hat\ Development\ Suite\ Installer.app', 'Contents');
    }

    exec(cmd, {maxbuffer: 1024 * 512}, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      if (process.platform === 'win32' && bundle) {
        var fileName = globby.sync(process.env.PTOR_BINARY + '/devsuite*.exe')[0];
        cmd = zip + ' x ' + fileName + ' -o' + targetFolder + ' -ry';
        exec(cmd, {maxbuffer: 1024 * 512}, function(error, stdo, stde) {
          console.log(stdo);
          console.log(stde);
          cb(error);
        });
      } else {
        cb(err);
      }
    });
  });
};

function assignArgument(argument, target) {
  if (yargs.argv[argument] && yargs.argv[argument].length > 0) {
    process.env[target] =  yargs.argv[argument];
  }
}
