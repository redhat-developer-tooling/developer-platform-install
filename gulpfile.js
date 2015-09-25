var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  rename = require('gulp-rename'),
  electron  = require('gulp-atom-electron'),
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

gulp.task('build', function() {
  return gulp.src('package/**')
        .pipe(electron({
          version: '0.30.3',
          platform: 'win32',
          arch: 'x64' }))
        .pipe(electron.zfsdest('dist/developer-platform-install.zip'));
});

gulp.task('default', function(){
    return runSequence('clean', 'transpile:app', 'copy:app','build');
  });
