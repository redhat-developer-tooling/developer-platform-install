var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  del = require('del'),
  run = require('gulp-run');

gulp.task('transpile:app', function() {
  return gulp.src('main/index.es6.js')
    .pipe(babel())
    .pipe(rename('index.js'))
    .pipe(gulp.dest('main'));
});

gulp.task('clean', function(){
    return del('package', {force: true});
});

gulp.task('copy:app', ['clean'], function(){
    return gulp.src(['main/**/*', 'browser/**/*', 'installs/**/*', 'package.json'], {base: '.'})
        .pipe(gulp.dest('package'));
});

gulp.task('run', ['transpile:app'], function() {
  return run('electron .').exec();
});

gulp.task('default', function(){
    return runSequence('clean', 'transpile:app', 'copy:app');
  });
