var gulp = require('gulp'),
  babel = require('gulp-babel'),
  runSequence = require('run-sequence'),
  zip = require('gulp-zip'),
  electronInstaller = require('electron-winstaller'),
  download = require("download"),
  rename = require('gulp-rename'),
  del = require('del'),
  exec = require('child_process').exec,
  pjson = require('./package.json'),
  ijson = require('./installers.json'),
  path = require('path'),
  mocha = require('gulp-spawn-mocha'),
  symlink = require('gulp-symlink'),
  yargs = require('yargs')
  .boolean('singleRun')
  .default({ singleRun : true });
  Server = require('karma').Server,
  angularProtractor = require('gulp-angular-protractor');

// TODO add timestamp and buildID to this installerVersion
var installerVersionBase = '9.1.0';
var installerVersion = installerVersionBase + '.CR1';

var artifactName = 'DeveloperPlatformInstaller',
    artifactPlatform = 'win32',
    artifactArch = 'x64';

var prefetchFolder = 'dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch; // or use downloads/ folder to that a clean doesn't wipe out the downloads

gulp.task('transpile:app', function() {
  return gulp.src(['./main/*.es6.js'])
    .pipe(babel())
    .pipe(rename(function (path) {
      path.basename = path.basename.substring(0, path.basename.length - 4)
    }))
    .pipe(gulp.dest('./main'));
});

// clean dist/ AND downloads/ folder
gulp.task('clean-all', ['clean'], function() {
    return del([prefetchFolder], {force: true});
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
    return del(['dist'], {force: true});
});

gulp.task('create-zip', () => {
    return gulp.src('dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch + '/**/*')
        .pipe(zip(artifactName + '-' + artifactPlatform + '-' + artifactArch + '.zip'))
        .pipe(gulp.dest('dist/win'));
});

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out=./dist/win/ --overwrite --asar=true';
  cmd += ' --prune --ignore=test';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('run', ['transpile:app'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron .', function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('package', function(cb) {
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-installer-squirrel-windows ./dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch;
  cmd += ' --out=./dist/win/ --name=developer_platform --exe=' + artifactName + '.exe';
  cmd += ' --overwrite --authors="Red Hat Developer Tooling Group"';
  cmd += ' --loading_gif=./resources/loading.gif';

  exec(cmd, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    cb(err);
  });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('create-electron-symlink', function() {
  return gulp.src('node_modules/electron-prebuilt')
    .pipe(symlink('node_modules/electron', { force: true }));
});

gulp.task('delete-electron-symlink', function() {
  return del(['node_modules/electron'], { force: true });
});

gulp.task('unit-test', function () {
  return gulp.src(['test/unit/**/*.js'], {read: false})
    .pipe(mocha({
      recursive: true,
      compilers: 'js:babel/register',
      env: { NODE_PATH: './browser' },
      grep: yargs.argv.grep,
      g: yargs.argv.g,
      reporter: yargs.argv.reporter
    }));
});

gulp.task('browser-test', function(done) {
  new Server({
    configFile: __dirname + '/karma-conf.js',
    singleRun: yargs.argv.singleRun
  }, done).start();
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-install', 'protractor-run');
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
  return gulp.src(['./test/ui/**/*.js'])
    .pipe(angularProtractor({
      'configFile': 'protractor-conf.js',
      'autoStartStopServer': false,
      'debug': false
    }))
    .on('error', function(e) { throw e; });
});

gulp.task('default', function() {
  return runSequence('generate','create-zip','electronwinstaller');
});

// TODO this should just be a recursive function
// download all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', function() {
	for (var name in ijson.installerURLs) 
	{
		var url = ijson.installerURLs[name];
		if (url.toString().indexOf("http")>=0)
		{
			console.log("[INFO] Downloading " + url + " ...");
			new download({mode: '755'}).get(url).dest(prefetchFolder).run();				
		}
		else
		{
			// check in nested map for URLs, one level deep
			for (var child in url) 
			{
				var url2 = url[child];
				if (url2.toString().indexOf("http")>=0)
				{
					// TODO: handle the case where the URL passed in is for openshift origin client tools build folder and we need the zip (see code in browser/model/cdk.js), eg.,
					// https://ci.openshift.redhat.com/jenkins/job/devenv_ami/lastSuccessfulBuild/artifact/origin/artifacts/release/ -> 
					// https://ci.openshift.redhat.com/jenkins/job/devenv_ami/lastSuccessfulBuild/artifact/origin/artifacts/release/openshift-origin-client-tools-v1.1.4-160-g97f3219-97f3219-windows.zip

					// TODO: handle login/auth requirements for github.com and cdk-builds.usersys.redhat.com
					console.log("[INFO] Downloading " + url2 + " ...");
					new download({mode: '755'}).get(url2).dest(prefetchFolder).run();				
				}
			}
		}
	}
});

// see https://github.com/electronjs/windows-installer for more params
// must install 7zip from http://www.7-zip.org/ for this to work
// TODO this should depend on the output of the prefetch task, and the prefetched stuff should be bundled into the installer; installer should then LOOK into local filesystem for these files
// instead of fetching them (again) remotely
gulp.task('electronwinstaller', function() {
	console.log("Creating .exe installer.");
	resultPromise = electronInstaller.createWindowsInstaller({
	    appDirectory: 'dist/win/' + artifactName + '-' + artifactPlatform + '-' + artifactArch,
	    outputDirectory: 'dist/win/',
	    // authors: 'Red Hat Developer Tooling Group', see package.json authors
	    exe: artifactName + ".exe",
	    title: artifactName + "_" + installerVersion,
	    version: installerVersionBase, // can only be x.y.z
	    loadingGif: 'resources/loading.gif',
	    id: artifactName + "_" + installerVersion,
	    noMsi: "true"
	  });

	resultPromise.then(() => console.log("[INFO] Installer(s) created."), (e) => console.log(`[ERROR] Installer creation failed: ${e.message}`));
});
