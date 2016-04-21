'use strict';

var gulp = require('gulp'),
    fs = require('fs-extra'),
    crypto = require('crypto'),
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
    mkdirp = require('mkdirp');

require('./gulp-tasks/tests')(gulp);

var artifactName = 'jboss-devstudio-platform',
    artifactPlatform = 'win32',
    artifactArch = 'x64';

var buildFolderRoot = 'dist/win/';
var buildFileNamePrefix = artifactName + '-' + artifactPlatform + '-' + artifactArch;
var buildFolder = buildFolderRoot + buildFileNamePrefix;
var prefetchFolder = buildFolderRoot + buildFileNamePrefix; // or just use downloads/ folder to that a clean doesn't wipe out the downloads
let buildFolderPath = path.resolve(buildFolderRoot);

let zaRoot = path.resolve(buildFolderRoot);
let zaZip = path.join(zaRoot, '7za920.zip');
let zaExe = path.join(zaRoot, '7za.exe');
let zaSfx = path.join(zaRoot, '7zS.sfx');
let zaSfxExe = path.join(zaRoot, '7zS.exe');
let zaExtra7z = path.join(zaRoot, '7z920_extra.7z');
let rhZip = path.join(zaRoot, 'resource_hacker.zip');
let rhExe = path.join(zaRoot, 'ResourceHacker.exe');
let zaElectronPackage = path.join(zaRoot, artifactName + '-win32-x64');
let bundled7z = path.join(zaRoot, artifactName +'-win32-x64.7z');
let installerExe = resolveInstallerExePath('');

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
  return del([prefetchFolder], { force: true });
});

// clean dist/ folder in prep for fresh build
gulp.task('clean', function() {
  return del(['dist'], { force: true });
});

// Create default callback for exec
function createExecCallback(cb, quiet) {
  return function(err,stdout,stderr) {
    if (!quiet) {
      console.log(stdout);
    }
    console.log(stderr);
    cb(err);
  }
}

gulp.task('create-dist-win-dir', function(cb) {
  return mkdirp(buildFolderPath, cb);
})

gulp.task('generate', ['transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  let configIcon = path.resolve(path.join(buildFolderPath, '..', '..', 'resources', artifactName + '.ico'));
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out="' + buildFolderPath + '" --overwrite --asar=true';
  cmd += ' --version-string.CompanyName="Red Hat, Inc."';
  cmd += ' --version-string.ProductName="' + pjson.productName + '"';
  cmd += ' --version-string.OriginalFilename="' + artifactName + '-' + pjson.version + '-installer.exe"';
  cmd += ' --version-string.FileDescription="' + pjson.description + ' v' + pjson.version + '"';
  cmd += ' --app-copyright="Copyright 2016 Red Hat, Inc."';
  cmd += ' --app-version="' + pjson.version + '"' + ' --build-version="' + pjson.version + '"';
  cmd += ' --prune --ignore=test';
  cmd += ' --icon="' + configIcon + '"';
  //console.log(cmd);
  exec(cmd,createExecCallback(cb, true));
});

// default task
gulp.task('default', ['run']);

gulp.task('run', ['transpile:app'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron .',createExecCallback(cb));
});

gulp.task('download-7zip', function() {
  return request('https://downloads.sourceforge.net/project/sevenzip/7-Zip/9.20/7za920.zip?r=https%3A%2F%2Fsourceforge.net%2Fprojects%2Fsevenzip%2Ffiles%2F7-Zip%2F9.20%2F')
      .pipe(fs.createWriteStream(zaZip));
});

gulp.task('unzip-7zip', function() {
  return gulp.src(zaZip)
      .pipe(unzip({ filter : function(entry){ return minimatch(entry.path, "**/7za.exe") } }))
      .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('download-7zip-extra', function() {
  return request('https://downloads.sourceforge.net/project/sevenzip/7-Zip/9.20/7z920_extra.7z?r=https%3A%2F%2Fsourceforge.net%2Fprojects%2Fsevenzip%2Ffiles%2F7-Zip%2F9.20%2F')
      .pipe(fs.createWriteStream(zaExtra7z));
});

gulp.task('unzip-7zip-extra', function(cb) {
  let cmd = zaExe + ' e ' + zaExtra7z + ' -o' + zaRoot + ' -y ' + '7zS.sfx';
  // console.log(cmd);
  exec(cmd, createExecCallback(cb, true));
});

gulp.task('download-resource-hacker', function() {
  return request('http://www.angusj.com/resourcehacker/resource_hacker.zip')
      .pipe(fs.createWriteStream(rhZip));
});

gulp.task('unzip-resource-hacker', function() {
  return gulp.src(rhZip)
      .pipe(unzip({ filter : function(entry){ return minimatch(entry.path, "**/ResourceHacker.*") } }))
      .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('prepare-tools', function(cb) {
  runSequence(['download-7zip', 'download-7zip-extra', 'download-resource-hacker'],
    ['unzip-7zip', 'unzip-resource-hacker'], 'unzip-7zip-extra', cb);
});

// wrap electron-generated app to 7zip archive
gulp.task('create-7zip-archive', function(cb) {
  let packCmd = zaExe + ' a ' + bundled7z + ' ' + zaElectronPackage + path.sep + '*';
  exec(packCmd, createExecCallback(cb, true));
});

gulp.task('update-metadata', function(cb) {
  // compiling a .rc to .res doesn't work so have to do it by hand when the version in package.json changes
  // let configRC = path.resolve(path.join(buildFolderRoot, '..', '..', 'resources', artifactName + '.rc')); // metadataincluding company info and copyright
  let configRes = path.resolve(path.join(buildFolderRoot, '..', '..', 'resources', artifactName + '.res')); // resource ncluding icon & metadata
  // let resHackCompileCmd = rhExe + ' -compile ' + configRC + ", " + configRes;
  // console.log(resHackCompileCmd);
  // run ResourceHacker.exe to insert a new icon into the installer .exe
  // exec(resHackCompileCmd, function (err, stdout, stderr) {
  //   console.log(stderr);
  //   if (!err) {
  let resHackModifyCmd = rhExe + ' -modify ' + zaSfx + ', ' + zaSfxExe + ', ' + configRes + ", , , "; // trailing commasrequired here!
  // console.log(resHackModifyCmd);

  exec(resHackModifyCmd, createExecCallback(cb, true));
});

gulp.task('create-final-exe', function(cb) {
  let configTxt = path.resolve(path.join(zaRoot, '..', '..', 'config.txt'));
  let packageCmd = 'copy /b ' + zaSfxExe + ' + ' + configTxt + ' + ' + bundled7z + ' ' + installerExe;
  // console.log(packageCmd);

  exec(packageCmd, createExecCallback(cb, true));
});

gulp.task('create-sha256sum-of-exe', function(cb) {
  createSHA256File(installerExe, cb);
});

gulp.task('package', function(cb) {
  runSequence('create-7zip-archive', 'update-metadata', 'create-final-exe', 'create-sha256sum-of-exe', cb);
});

// for a given filename, return the sha256sum
// eg., a7da255b161c2c648e8465b183e2483a3bcc64ea1aa9cbdc39d00eeb51cbcf38
// getSHA256("C:\\Program Files\\Internet Explorer\\iexplore.exe", function(hashstring) { console.log("Got sha256 = "+ hashstring); } );
function getSHA256(filename, cb) {
  var hashstring = "NONE";
  var hash = crypto.createHash('sha256');
  //console.log("Generate SHA256 for " + filename);
  var readStream = fs.createReadStream(filename);
  readStream
    .on('readable', function () {
      var chunk;
      while (null !== (chunk = readStream.read())) {
        hash.update(chunk);
      }
    })
    .on('end', function () {
      // a7da255b161c2c648e8465b183e2483a3bcc64ea1aa9cbdc39d00eeb51cbcf38
      hashstring = hash.digest('hex');
      // console.log("[1] SHA256 = " + hashstring);
      cb(hashstring);
    });
  return hashstring;
}

// writes to {filename}.sha256, eg., 6441cde1821c93342e54474559dc6ff96d40baf39825a8cf57b9aad264093335 requirements.json
function createSHA256File(filename, cb) {
  getSHA256(filename, function(hashstring) {
    fs.writeFileSync(filename + ".sha256", hashstring + " *" + path.parse(filename).base);
    if (cb) {
      cb();
    } else {
      return true;
    }
  });
}

// Create stub installer that will then download all the requirements
gulp.task('package-simple', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', ['generate',
    'prepare-tools'], 'package', 'cleanup', cb);
});

  // Create bundled installer
gulp.task('package-bundle', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', ['generate',
    'prepare-tools'], 'prefetch', 'package', 'cleanup', cb);
});

// Create both installers
gulp.task('dist', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', ['generate',
    'prepare-tools'], 'package', 'prefetch', 'package', 'cleanup', cb);
});

gulp.task('7zip-cleanup', function() {
  return del([buildFolderRoot + 'DeveloperPlatformInstaller-w32-x64.7z', path.resolve(path.join(buildFolderRoot, '7z*'))], { force: false });
});

gulp.task('resource-hacker-cleanup', function() {
  return del([path.resolve(path.join(buildFolderRoot, 'resource_hacker.zip')), path.resolve(path.join(buildFolderRoot, 'ResourceHacker.*'))], { force: false });
});

gulp.task('cleanup', function(cb) {
  runSequence(['7zip-cleanup', 'resource-hacker-cleanup'], cb);
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-install', 'protractor-run');
});

// read the existing .sha256 file and compare it to the existing file's SHA
function isExistingSHA256Current(currentFile, sha256sum, processResult) {
  if (fs.existsSync(currentFile)) {
    getSHA256(currentFile, function(hashstring) {
      if (sha256sum !== hashstring) {
        console.log('[WARNING] SHA256 in requirements.json (' + sha256sum + ') does not match computed SHA (' + hashstring + ') for ' + currentFile);
      }
      processResult(sha256sum === hashstring);
    });
  } else {
    processResult(false);
  }
}

function resolveInstallerExePath(artifactType) {
  return path.join(zaRoot, artifactName + '-' + pjson.version + artifactType + '-installer.exe');
}

// download all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', function(cb) {
  let counter=0;
  for (var key in reqs) {
    if (reqs.hasOwnProperty(key)) {
      let currentUrl = reqs[key].url;
      let currentKey = key;
      let currentFile = path.join(prefetchFolder, key);
      let alreadyDownloaded = false;

      // if file is already downloaded, check its sha against the stored one
      isExistingSHA256Current(currentFile, reqs[currentKey].sha256sum, (alreadyDownloaded)=> {
        //console.log('For ' + currentFile + ": " + alreadyDownloaded + ", " + reqs[currentKey].bundle);
        if(!alreadyDownloaded) {
          // download only what can be included in offline installer
          if (reqs[currentKey].bundle === 'yes') {
            counter++;
            console.log('DOWNLOADING -> ' + currentUrl);
            request(currentUrl)
              .pipe(fs.createWriteStream(currentFile)).on('finish',function() {
                // create a sha256sum file
                counter--;
                if(counter===0) {
                  cb();
                }
              });
          }
        } else {
          console.log('DOWNLOADED <- ' + currentFile);
        }
      });
    }
  }
  installerExe = resolveInstallerExePath('-bundle');
});

//check if URLs in requirements.json return 200 and generally point to their appropriate tools
gulp.task('check-requirements', function(cb) {
  exec('node test/check-requirements.js', createExecCallback(cb, false));
})
