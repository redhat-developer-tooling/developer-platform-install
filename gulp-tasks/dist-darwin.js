module.exports = function(gulp) {

  gulp.task('prepare-tools', function(cb) {
    console.log("Skip for darwin build");
    cb();
  });

};
