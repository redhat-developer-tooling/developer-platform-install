module.exports = function(gulp) {
  gulp.task('prepare-tools', function(cb) {
    runSequence('prefetch-tools', ['unzip-7zip'], 'unzip-7zip-extra', cb);
  });
};
