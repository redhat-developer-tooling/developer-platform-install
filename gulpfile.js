var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec;

gulp.task('transpile:app', function() {
  return gulp.src('./src/main/index.es6.js')
    .pipe(babel())
    .pipe(rename('index.js'))
    .pipe(gulp.dest('./src/main'));
});

gulp.task('clean', function() {
    return del(['dist'], {force: true});
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  exec('npm run-script generate', function(err, stdout, stderr) {
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

gulp.task('package', function(cb) {
  exec('npm run-script package', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
  });
});

gulp.task('default', function() {
  return runSequence('clean', 'transpile:app', 'generate');
});
