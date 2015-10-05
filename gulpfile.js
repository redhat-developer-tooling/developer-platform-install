var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec;

gulp.task('transpile:app', function() {
  return gulp.src('main/index.es6.js')
    .pipe(babel())
    .pipe(rename('index.js'))
    .pipe(gulp.dest('main'));
});

gulp.task('clean', function() {
    return del(['build', 'dist', 'install'], {force: true});
});

gulp.task('copy:app', ['clean', 'transpile:app'], function() {
    return gulp.src(['main/**/*', 'browser/**/*', 'installs/**/*', 'package.json'], {base: '.'})
        .pipe(gulp.dest('build'));
});

gulp.task('package', ['copy:app'], function(cb) {
  exec('npm run-script package', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('run', ['transpile:app'], function() {
  exec('npm start', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });
});

gulp.task('default', function() {
  return runSequence('clean', 'transpile:app', 'copy:app', 'package');
});
