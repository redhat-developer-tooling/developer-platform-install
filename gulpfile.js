	'use strict';

var gulp = require('gulp'),
    fs = require('fs-extra'),
    babel = require('gulp-babel'),
    runSequence = require('run-sequence'),
    zip = require('gulp-zip'),
    unzip = require('gulp-unzip'),
		request = require("request"),
    rename = require('gulp-rename'),
    del = require('del'),
    exec = require('child_process').exec,
    pjson = require('./package.json'),
    reqs = require('./requirements.json'),
    path = require('path'),
    minimatch = require('minimatch'),
    copy = require('gulp-copy'),
    concat = require('gulp-concat'),
    mkdirp = require('mkdirp'),
    merge = require('merge-stream'),
    rcedit = require('rcedit'),
    sourcemaps = require("gulp-sourcemaps"),
    symlink = require('gulp-symlink'),
		common = require('./gulp-tasks/common.js'),
		download = require('./gulp-tasks/download.js');

		require('./gulp-tasks/tests')(gulp);

var artifactName = 'devsuite',
    artifactPlatform = process.platform,
    artifactArch = process.arch;

var buildFolderRoot = path.join('dist', artifactPlatform + '-' + artifactArch );
var buildFileNamePrefix = artifactName;
// use folder outside buildFolder so that a 'clean' task won't wipe out the cache
var prefetchFolder = 'requirements-cache';
let toolsFolder = 'tools';
let buildFolderPath = path.resolve(buildFolderRoot);
let configIcon = path.resolve(path.join('resources', artifactName + '.ico'));

let zaRoot = path.resolve(buildFolderRoot);
let zaZip = path.join(toolsFolder, '7zip.zip');
let zaExe = path.join(zaRoot, '7za.exe');
let zaSfx = path.join(zaRoot, '7zS.sfx');
let zaExtra7z = path.join(toolsFolder, '7zip-extra.zip');
let zaElectronPackage = path.join(zaRoot, artifactName + '-win32-x64');
let bundled7z = path.join(zaRoot, artifactName +'-win32-x64.7z');
let installerExe = resolveInstallerExePath('');

process.on('uncaughtException', function(err) {
    if(err) {
      throw err;
    }
});

// transpile sources and copy resources to a separate folder
gulp.task('transpile:app', ['create-modules-link'], function() {
  var sources = gulp.src(['browser/**/*.js', 'main/**/*.js', '*.js'], {base: '.'})
    .pipe(sourcemaps.init())
    .pipe(babel())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('transpiled'));

  var resources = gulp.src(['browser/**/*', '!browser/**/*.js', '*.json', 'uninstaller/*.ps1'], {base: '.'})
    .pipe(gulp.dest('transpiled'));

  return merge(sources, resources);
});

// create symlink to node_modules in transpiled folder
gulp.task('create-modules-link', function() {
  return gulp.src('node_modules')
    .pipe(symlink('transpiled/node_modules', {
      force: true
    }));
});

// clean dist/ AND prefetch-dependencies/ folder
gulp.task('clean-all', ['clean'], function() {
  return del([prefetchFolder], { force: true });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
  return del(['dist','transpiled'], { force: true });
});

gulp.task('create-dist-win-dir', function(cb) {
  return mkdirp(buildFolderPath, cb);
})

gulp.task('generate', ['transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager transpiled ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out="' + buildFolderPath + '" --overwrite --asar=true';
  cmd += ' --version-string.CompanyName="Red Hat, Inc."';
  cmd += ' --version-string.ProductName="' + pjson.productName + '"';
  cmd += ' --version-string.OriginalFilename="' + artifactName + '-' + pjson.version + '-installer.exe"';
  cmd += ' --version-string.FileDescription="' + pjson.description + ' v' + pjson.version + '"';
  cmd += ' --app-copyright="Copyright 2016 Red Hat, Inc."';
  cmd += ' --app-version="' + pjson.version + '"' + ' --build-version="' + pjson.version + '"';
  cmd += ' --prune --ignore="test|' + prefetchFolder + '"';
  cmd += ' --icon="' + configIcon + '"';
  //console.log(cmd);
  exec(cmd,common.createExecCallback(cb, true));
});

// default task
gulp.task('default', ['run']);

gulp.task('run', ['update-requirements'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron transpiled',common.createExecCallback(cb));
});

gulp.task('unzip-7zip', function() {
  return gulp.src(zaZip)
      .pipe(unzip({ filter : function(entry){ return minimatch(entry.path, "**/7za.exe") } }))
      .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('unzip-7zip-extra', function(cb) {
  let cmd = zaExe + ' e ' + zaExtra7z + ' -o' + zaRoot + ' -y ' + '7zS.sfx';
  // console.log(cmd);
		exec(cmd, common.createExecCallback(cb,true));
	});

gulp.task('prepare-tools', function(cb) {
	runSequence('prefetch-tools', ['unzip-7zip'], 'unzip-7zip-extra', cb);
});

// wrap electron-generated app to 7zip archive
gulp.task('create-7zip-archive', function(cb) {
  let packCmd = zaExe + ' a ' + bundled7z + ' ' + zaElectronPackage + path.sep + '*'
  // only include prefetch folder when zipping if the folder exists and we're doing a bundle build
  if (fs.existsSync(path.resolve(prefetchFolder)) && installerExe.indexOf("-bundle") > 0) {
    packCmd = packCmd + ' ' + path.resolve(prefetchFolder) + path.sep + '*';
  } else {
      packCmd = packCmd + ' ' + path.resolve(prefetchFolder) + path.sep + 'cygwin.exe';
  }
  //console.log('[DEBUG]' + packCmd);
  exec(packCmd, common.createExecCallback(cb, true));
});

gulp.task('update-requirements',['transpile:app'], function() {

  let updateDevStudioVersion = ()=>{
    return new Promise((resolve,reject) => {
      let url = reqs['jbds.jar'].url.substring(0, reqs['jbds.jar'].url.lastIndexOf("/")) + '/content.json';
      request(url, (err, response, body)=>{
        if (err) {
          reject(err);
        } else {
          let versionRegex = /(\d+\.\d+\.\d+\.\w+\d*).*/;
          let finalVersion = versionRegex.exec(body)[1];

          if (reqs['jbds.jar'].version != finalVersion) {
            reqs['jbds.jar'].version = finalVersion;
          }
          resolve()
        }
      });
    });
  };

  let updateDevStudioSha = ()=>{
    return new Promise((resolve,reject) => {
      let url = reqs['jbds.jar'].sha256sum;
      if (url.length == 64 && url.indexOf("http")<0 && url.indexOf("ftp")<0) {
        resolve();
      } else {
        request(url, (err, response, body) => {
          reqs['jbds.jar'].sha256sum = body;
          resolve();
        });
      }
    });
  };

  return Promise.resolve()
    .then(updateDevStudioVersion)
    .then(updateDevStudioSha)
    .then(()=>{
      fs.writeFile('./transpiled/requirements.json', JSON.stringify(reqs, null, 2));
    }).catch((err)=>{
      console.log(err);
    });
});

gulp.task('update-metadata', function(cb) {
  return rcedit(zaSfx, {
    'icon': configIcon,
    'file-version': pjson.version,
    'product-version': pjson.version,
    'version-string': {
      'ProductName': pjson.productName,
      'FileDescription': pjson.description + ' v' + pjson.version,
      'CompanyName': 'Red Hat, Inc.',
      'LegalCopyright': 'Copyright 2016 Red Hat, Inc.',
      'OriginalFilename': artifactName + '-' + pjson.version + '-installer.exe'
    }
  }, cb);
});

gulp.task('create-final-exe', function(cb) {
  let configTxt = path.resolve(path.join(zaRoot, '..', '..', 'config.txt'));
  let packageCmd = 'copy /b ' + zaSfx + ' + ' + configTxt + ' + ' + bundled7z + ' ' + installerExe;

  exec(packageCmd, common.createExecCallback(cb, true));
});

gulp.task('create-sha256sum-of-exe', function(cb) {
  common.createSHA256File(installerExe, cb);
});

gulp.task('package', function(cb) {
  runSequence('create-7zip-archive', 'update-metadata', 'create-final-exe', 'create-sha256sum-of-exe', cb);
});

// Create stub installer that will then download all the requirements
gulp.task('package-simple', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-requirements', ['generate',
    'prepare-tools'], 'prefetch-cygwin', 'package', 'cleanup', cb);
});

gulp.task('package-bundle', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-requirements', ['generate',
   'prepare-tools'], 'prefetch', 'package', 'cleanup', cb);
});

// Create both installers
gulp.task('dist', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-requirements', ['generate',
    'prepare-tools'], 'prefetch-cygwin', 'package', 'prefetch', 'package', 'cleanup', cb);
});

gulp.task('cleanup', function(cb) {
  return del([bundled7z,
    path.resolve(path.join(buildFolderRoot, '7z*')),
    path.resolve(zaElectronPackage)],
    { force: false });
});

gulp.task('test', function() {
  return runSequence('unit-test');
});

gulp.task('ui-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'ui';
  return runSequence(['generate', 'protractor-install'], 'protractor-run', cb);
});

gulp.task('system-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'system';
  return runSequence(['generate', 'protractor-install'], 'protractor-run', cb);
})

function resolveInstallerExePath(artifactType) {
  return path.join(zaRoot, artifactName + '-' + pjson.version + artifactType + '-installer.exe');
}

gulp.task('create-prefetch-cache-dir',function() {
  if (!fs.existsSync(prefetchFolder)) {
     mkdirp(prefetchFolder);
  }
});

gulp.task('create-tools-dir',function() {
  if (!fs.existsSync(toolsFolder)) {
     mkdirp(toolsFolder);
  }
});

// prefetch all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', ['create-prefetch-cache-dir'], function() {
  return download.prefetch(reqs, 'yes', prefetchFolder).then(()=>{
			return new Promise((resolve, reject)=>{
				installerExe = resolveInstallerExePath('-bundle');
				resolve(true);
			});
		}
	);
});

// prefetch cygwin to always include into installer
gulp.task('prefetch-cygwin', ['create-prefetch-cache-dir'], function() {
	return download.prefetch(reqs,'always', prefetchFolder);
});

gulp.task('prefetch-tools', ['create-tools-dir'], function() {
  return download.prefetch(reqs, 'tools', toolsFolder);
});

gulp.task('prefetch-all', ['create-prefetch-cache-dir'], function() {
	return download.prefetch(reqs, 'no', prefetchFolder).then(()=>{
			return download.prefetch(reqs, 'yes', prefetchFolder);
		});
});

//check if URLs in requirements.json return 200 and generally point to their appropriate tools
gulp.task('check-requirements', function(cb) {
  exec('node test/check-requirements.js', common.createExecCallback(cb, false));
})

gulp.task('watch', function () {
  gulp.watch(['test/**/*.js', 'browser/**/*.js'], ()=>runSequence('unit-test'));
})
