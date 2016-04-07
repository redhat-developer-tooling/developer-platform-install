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
    concat = require('gulp-concat');

require('./gulp-tasks/tests')(gulp);

var artifactName = 'DeveloperPlatformInstaller',
    artifactType = '',
    artifactPlatform = 'win32',
    artifactArch = 'x64';

var buildFolderRoot = 'dist/win/';
var buildFileNamePrefix = artifactName + '-' + artifactPlatform + '-' + artifactArch;
var buildFolder = buildFolderRoot + buildFileNamePrefix;
var prefetchFolder = buildFolderRoot + buildFileNamePrefix; // or just use downloads/ folder to that a clean doesn't wipe out the downloads

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

// currently not used
gulp.task('create-zip', () => {
  return gulp.src(buildFolderRoot + buildFolderRoot + '/**/*')
      .pipe(zip(buildFolderRoot + '.zip'))
      .pipe(gulp.dest(buildFolderRoot));
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

gulp.task('generate', ['clean', 'transpile:app'], function(cb) {
  var electronVersion = pjson.devDependencies['electron-prebuilt'];
  var cmd = path.join('node_modules', '.bin') + path.sep + 'electron-packager . ' + artifactName + ' --platform=' + artifactPlatform + ' --arch=' + artifactArch;
  cmd += ' --version=' + electronVersion + ' --out=./' + buildFolderRoot + ' --overwrite --asar=true';
  cmd += ' --prune --ignore=test';

  exec(cmd,createExecCallback(cb, true));
});

gulp.task('run', ['transpile:app'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron .',createExecCallback(cb));
});

// Wrap electron-generated app to self extractring 7zip archive
gulp.task('package', function (cb) {
  let zaRoot = path.resolve(buildFolderRoot);
  let zaElectronPackage = path.join(zaRoot, 'DeveloperPlatformInstaller-win32-x64');
  let zaZip = path.join(zaRoot, '7za920.zip');
  let zaExe = path.join(zaRoot, '7za.exe');
  let zaSfx = path.join(zaRoot, '7zS.sfx');
  let zaExtra7z = path.join(zaRoot, '7z920_extra.7z');
  let configTxt = path.resolve(path.join(zaRoot, '..', '..', 'config.txt'));
  let bundled7z = path.join(zaRoot, 'DeveloperPlatformInstaller-w32-x64.7z');
  let installerExe = path.join(zaRoot, 'DeveloperPlatformInstaller-win32-x64' + artifactType + '.exe');
  console.log("Creating " + installerExe);
  request('http://downloads.sourceforge.net/project/sevenzip/7-Zip/9.20/7za920.zip?r=https%3A%2F%2Fsourceforge.net%2Fprojects%2Fsevenzip%2Ffiles%2F7-Zip%2F9.20%2F')
      .pipe(fs.createWriteStream(zaZip)).on('finish', function () {
    //console.log(zaZip);
    gulp.src(path.join(buildFolderRoot, '7za920.zip'))
        .pipe(unzip({ filter : function(entry){ return minimatch(entry.path, "**/7za.exe") } }))
        .pipe(gulp.dest(buildFolderRoot));
    request('http://downloads.sourceforge.net/project/sevenzip/7-Zip/9.20/7z920_extra.7z?r=https%3A%2F%2Fsourceforge.net%2Fprojects%2Fsevenzip%2Ffiles%2F7-Zip%2F9.20%2F')
        .pipe(fs.createWriteStream(zaExtra7z)).on('finish', function () {
      var cmd = zaExe + ' e ' + zaExtra7z + ' -o' + zaRoot + ' -y ' + '7zS.sfx';
      console.log(cmd);
      exec(cmd, function (err, stdout, stderr) {
        //console.log(stdout);
        console.log(stderr);
        if (!err) {
          var packCmd = zaExe + ' a ' + bundled7z + ' ' + zaElectronPackage + path.sep + '*';
          console.log(packCmd);
          exec(packCmd, function (err, stdout, stderr) {
            //console.log(stdout);
            console.log(stderr);
            if (!err) {
              var packageCmd = 'copy /b ' + zaSfx + ' + ' + configTxt + ' + ' + bundled7z + ' ' + installerExe;
              console.log(packageCmd);
              exec(packageCmd, createExecCallback(cb, true));
            } else {
              cb(err);
            }
          });
        } else {
          cb(err);
        }
      });
    });
  });
  createSHA256File(installerExe);
});

// should return a string that matches what you get when you run `sha256sum.exe gulpfile.js`
gulp.task('test_getSHA256',function() {
  var filename = "dist/win/DeveloperPlatformInstaller-win32-x64/cygwin.exe"; // 08079a13888b74f6466def307a687e02cb26fc257ea2fa78d40f02e28330fd56
  var filename2 = "C:\\Program Files\\Internet Explorer\\iexplore.exe"; // a7da255b161c2c648e8465b183e2483a3bcc64ea1aa9cbdc39d00eeb51cbcf38
  getSHA256(filename, function(hashstring) { console.log("Got sha256 ( " + filename + " ) = "+ hashstring); } );
  getSHA256(filename2, function(hashstring) { console.log("Got sha256 ( " + filename2 + " ) = "+ hashstring); } );
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

// doesn't work on large files - Error: toString failed
function getSHA256Sync(filename) {
  return crypto.createHash('sha256').update(fs.readFileSync(filename, 'binary').toString()).digest("hex");
}

// should return a string that matches what you get when you run `sha256sum.exe gulpfile.js`
gulp.task('test_getSHA256Sync',function() {
  var filename = "dist/win/DeveloperPlatformInstaller-win32-x64/cygwin.exe"; // 08079a13888b74f6466def307a687e02cb26fc257ea2fa78d40f02e28330fd56
  var filename2 = "C:\\Program Files\\Internet Explorer\\iexplore.exe"; // a7da255b161c2c648e8465b183e2483a3bcc64ea1aa9cbdc39d00eeb51cbcf38
  console.log("Got sha256 ( " + filename + " ) = "+ getSHA256Sync(filename));
  console.log("Got sha256 ( " + filename2 + " ) = "+ getSHA256Sync(filename2));
});

// should create a file called gulpfile.js.sha256 with contents that match what you get when you run `sha256sum.exe gulpfile.js`
gulp.task('test_createSHA256FileSync',function() {
  var filename = "requirements.json";
  createSHA256FileSync(filename); console.log("Wrote sha256 to " + filename + ".sha256"); // async so won't write until method is done
  console.log("---");console.log(fs.readFileSync(filename + ".sha256",'utf-8').toString());console.log("---"); // sync, so might have old contents (or fail if file not yet created); run a second time
  console.log("Got sha256 ( " + filename + " ) = "+ getSHA256Sync(filename));
});

// should create a file called gulpfile.js.sha256 with contents that match what you get when you run `sha256sum.exe gulpfile.js`
gulp.task('test_createSHA256File',function() {
  var filename = "requirements.json";
  createSHA256File(filename); console.log("Wrote sha256 to " + filename + ".sha256"); // async so won't write until method is done
  console.log("---");console.log(fs.readFileSync(filename + ".sha256",'utf-8').toString());console.log("---"); // sync, so might have old contents (or fail if file not yet created); run a second time
  getSHA256(filename, function(hashstring) { console.log("Got sha256 ( " + filename + " ) = " + hashstring); });
});

// writes to {filename}.sha256, eg., 6441cde1821c93342e54474559dc6ff96d40baf39825a8cf57b9aad264093335 requirements.json
function createSHA256File(filename) {
  getSHA256(filename, function(hashstring) {
    console.log(hashstring);
    fs.writeFileSync(filename + ".sha256", hashstring + " " + path.parse(filename).base); })
  return true;
}

// writes to {filename}.sha256, eg., 6441cde1821c93342e54474559dc6ff96d40baf39825a8cf57b9aad264093335 requirements.json
function createSHA256FileSync(filename) {
  var hashstring = getSHA256(filename) + " "  + filename;
  fs.writeFileSync(filename + ".sha256", hashstring);
  return true;
}

// Create bundled installer
gulp.task('package-bundle', function() {
  return runSequence('prefetch', 'package');
});

gulp.task('7zip-cleanup', function() {
    del([buildFolderRoot + 'DeveloperPlatformInstaller-w32-x64.7z',buildFolderRoot + '7zS.sfx', buildFolderRoot + '7za.exe', buildFolderRoot + '7za920.zip', buildFolderRoot + '7z920_extra.7z'], { force: true });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink', 'browser-test');
});

gulp.task('ui-test', function() {
  return runSequence('generate', 'protractor-install', 'protractor-run');
});

gulp.task('default', function() {
  return runSequence('generate');
});

// read the existing .sha256 file and compare it to the existing file's SHA
function isExistingSHA256Current(currentFile, processResult) {
  if (fs.existsSync(currentFile) && reqs[path.parse(currentFile).base].checksum) {
    var existingSHA256 = reqs[path.parse(currentFile).base].checksum.value;
    // console.log("Existing SHA file (" + currentFile + ".sha256): " + existingSHA256);
    // console.log("Existing file's SHA (" + currentFile + ")     : " + getSHA256(currentFile));
    getSHA256(currentFile, function(hashstring) {
      console.log("configured=>" + existingSHA256);
      console.log("existing  =>" + hashstring);
      processResult(existingSHA256 === hashstring);
    });
  } else {
    processResult(false);
  }
}

// download all the installer dependencies so we can package them up into the .exe
gulp.task('prefetch', function(cb) {
  let counter=0;
  for (var key in reqs) {
    if (reqs.hasOwnProperty(key)) {
      let currentUrl = reqs[key].url;
      let currentKey = key;
      let currentFile = path.join(prefetchFolder, key)
      let alreadyDownloaded = false
      if (reqs[key].bundle === 'no') continue;
      // if file is already downloaded, check its sha against the stored one
      isExistingSHA256Current(currentFile,(downloaded)=> {
        if(!downloaded) {
          // download only what can be included in offline installer
          if (reqs[key].bundle === 'yes' && !alreadyDownloaded) {
            counter++;
            console.log('DOWNLOADING -> ' + reqs[key].url);
            request(reqs[key].url)
              .pipe(fs.createWriteStream(currentFile)).on('finish',function() {
                // create a sha256sum file
                createSHA256File(currentFile);
                counter--;
                if(counter===0) {
                  cb();
                }
              });
          }
        }
      });
    }
  }
  artifactType = "-bundle";
});
