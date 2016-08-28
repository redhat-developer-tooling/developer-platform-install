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
    mkdirp = require('mkdirp'),
    merge = require('merge-stream'),
    rcedit = require('rcedit'),
    sourcemaps = require("gulp-sourcemaps"),
    symlink = require('gulp-symlink'),
    progress = require('request-progress');

require('./gulp-tasks/tests')(gulp);

var artifactName = 'devsuite',
    artifactPlatform = 'win32',
    artifactArch = 'x64';

var buildFolderRoot = 'dist/win/';
var buildFileNamePrefix = artifactName + '-' + artifactPlatform + '-' + artifactArch;
var buildFolder = buildFolderRoot + buildFileNamePrefix;
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
  exec(cmd,createExecCallback(cb, true));
});

// default task
gulp.task('default', ['run']);

gulp.task('run', ['transpile:app'], function(cb) {
  exec(path.join('node_modules', '.bin') + path.sep + 'electron transpiled',createExecCallback(cb));
});

gulp.task('unzip-7zip', function() {
  return gulp.src(zaZip)
      .pipe(unzip({ filter : function(entry){ return minimatch(entry.path, "**/7za.exe") } }))
      .pipe(gulp.dest(buildFolderRoot));
});

gulp.task('unzip-7zip-extra', function(cb) {
  let cmd = zaExe + ' e ' + zaExtra7z + ' -o' + zaRoot + ' -y ' + '7zS.sfx';
  // console.log(cmd);
  exec(cmd, createExecCallback(cb,true));
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
  }
  //console.log('[DEBUG]' + packCmd);
  exec(packCmd, createExecCallback(cb, true));
});

gulp.task('update-devstudio-version', function(cb) {
  let url = reqs['jbds.jar'].url.substring(0, reqs['jbds.jar'].url.lastIndexOf("/")) + '/content.json';
  request(url, function(err, response, body) {
    if (err) {
      cb(err);
    } else {
      let versionRegex = /(\d+\.\d+\.\d+\.\w+\d*).*/;
      let finalVersion = versionRegex.exec(body)[1];

      if (reqs['jbds.jar'].version != finalVersion) {
        reqs['jbds.jar'].version = finalVersion;
        fs.writeFile('./requirements.json', JSON.stringify(reqs, null, 2), cb);
      } else {
        cb();
      }
    }
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

  exec(packageCmd, createExecCallback(cb, true));
});

gulp.task('create-sha256sum-of-exe', function(cb) {
  createSHA256File(installerExe, cb);
});

gulp.task('package', function(cb) {
  runSequence('create-7zip-archive', 'update-metadata', 'create-final-exe', 'create-sha256sum-of-exe', cb);
});

// for a given filename, return the sha256sum
function getSHA256(filename, cb) {
  var hashstring = "NONE";
  var hash = crypto.createHash('sha256');
  var readStream = fs.createReadStream(filename);
  readStream.on('readable', function () {
    var chunk;
    while (null !== (chunk = readStream.read())) {
      hash.update(chunk);
    }
  }).on('end', function () {
    hashstring = hash.digest('hex');
    cb(hashstring);
  });
}

// writes to {filename}.sha256, eg., 6441cde1821c93342e54474559dc6ff96d40baf39825a8cf57b9aad264093335 requirements.json
function createSHA256File(filename, cb) {
  !cb && cb();
  getSHA256(filename, function(hashstring) {
    fs.writeFile(filename + ".sha256", hashstring + " *" + path.parse(filename).base,(err)=>{
      cb(err);
    });
  });
}

// Create stub installer that will then download all the requirements
gulp.task('package-simple', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-devstudio-version', ['generate',
    'prepare-tools'], 'package', 'cleanup', cb);
});

gulp.task('package-bundle', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-devstudio-version', ['generate',
   'prepare-tools'], 'prefetch', 'package', 'cleanup', cb);
});

// Create both installers
gulp.task('dist', function(cb) {
  runSequence(['check-requirements', 'clean'], 'create-dist-win-dir', 'update-devstudio-version', ['generate',
    'prepare-tools'], 'package', 'prefetch', 'package', 'cleanup', cb);
});

gulp.task('cleanup', function(cb) {
  return del([bundled7z,
    path.resolve(path.join(buildFolderRoot, '7z*')),
    path.resolve(zaElectronPackage)],
    { force: false });
});

gulp.task('test', function() {
  return runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink');
});

gulp.task('ui-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'ui';
  return runSequence(['generate', 'protractor-install'], 'protractor-run', cb);
});

gulp.task('system-test', function(cb) {
  process.env.PTOR_TEST_RUN = 'system';
  return runSequence(['generate', 'protractor-install'], 'protractor-run', cb);
})

// read the existing .sha256 file and compare it to the existing file's SHA
function isExistingSHA256Current(currentFile, sha256sum, processResult) {
  if (fs.existsSync(currentFile)) {
    console.log('[INFO] \'' + currentFile + '\' exists in cache');
    getSHA256(currentFile, function(hashstring) {
      if (sha256sum !== hashstring) {
        console.log('[WARN] SHA256 in requirements.json (' + sha256sum + ') does not match computed SHA (' + hashstring + ') for ' + currentFile);
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
  return prefetch('yes', prefetchFolder);
});

gulp.task('prefetch-tools', ['create-tools-dir'], function() {
  return prefetch('tools', toolsFolder);
});

gulp.task('prefetch-all', ['create-prefetch-cache-dir'], function() {
  return prefetch('no', prefetchFolder).then(()=>{return prefetch('yes', prefetchFolder);});
});

function prefetch(bundle, targetFolder) {
  let promises = new Array();
  for (let key in reqs) {
    if (reqs[key].bundle === bundle) {
      let currentUrl = reqs[key].url;
      let currentFile = path.join(targetFolder, key);
      promises.push(() => {
        return new Promise((resolve,reject) => {
          // if file is already downloaded, check its sha against the stored one
          downloadAndReadSHA256(targetFolder, key + ".sha256", reqs[key].sha256sum, reject, (currentSHA256) => {
            //console.log('[DEBUG] SHA256SUM for ' + key + ' = ' + currentSHA256);
            isExistingSHA256Current(currentFile, currentSHA256, (dl) => {
              if(dl) {
                console.log('[INFO] \'' + currentFile + '\' SHA256 is correct, no download required');
                resolve(true);
              } else {
                if(fs.existsSync(currentFile)) {
                  console.log('[INFO] \'' + currentFile + '\' SHA256 is not correct, download required');
                } else {
                  console.log('[INFO] \'' + currentFile + '\' is not downloaded yet');
                }
                downloadFileAndCreateSha256(targetFolder, key, reqs[key].url, currentSHA256, resolve, reject);
              }
            });
          });
        })
      });
    }
  }
  promises.push(() => {
    return new Promise((resolve, reject)=>{
      if (bundle === 'yes') {
          installerExe = resolveInstallerExePath('-bundle');
        }
        resolve(true);
    });
  });
  return promises.reduce( function(pacc, fn) { return pacc.then(fn); }, Promise.resolve() );
};

function downloadAndReadSHA256(targetFolder, fileName, reqURL, reject, processResult) {
  let currentFile = path.join(targetFolder, fileName);
  let currentSHA256 = 'NOSHA256SUM';
  if (reqURL.length == 64 && reqURL.indexOf("http")<0 && reqURL.indexOf("ftp")<0)
  {
    // return the hardcoded SHA256sum in requirements.json
    if(!fileName.endsWith('.sha256')) {
      console.log('[INFO] \'' + fileName + '\' hardcoded sha256 check');
    }
    processResult(reqURL);
  } else {
    // download the remote SHA256sum, save the file, and return its value to compare to existing downloaded file
    console.log('[INFO] \'' + fileName + '\' remote sha256 check');
    downloadFile(reqURL, currentFile, (err, res)=>{
      if (err) {
        reject(err);
      } else {
        // read the contents of the sha256sum file
        currentSHA256 = fs.readFileSync(currentFile,'utf8');
        processResult(currentSHA256);
      }
    });
  }
}

function downloadFileAndCreateSha256(targetFolder, fileName, reqURL, sha256sum, resolve, reject) {
  let currentFile = path.join(targetFolder, fileName);
  downloadFile(reqURL, currentFile, (err, res)=>{
    if (err) {
      reject(err);
    } else {
      getSHA256(currentFile,(currentSHA256)=>{
        if(currentSHA256 == sha256sum) {
          console.log( '[INFO] \'' + currentFile + '\' is downloaded and sha256 is correct');
          createSHA256File(currentFile,(shaGenError)=>{
            shaGenError ? reject(shaGenError) : resolve(res);
          });
        } else {
          reject( '\'' + currentFile + '\' is downloaded and sha256 is not correct');
        }
      });
    }
  });
}

const progressLine = '======25%\|======50%\|======75%\|=====100%\|';

function downloadFile(fromUrl, toFile, onFinish) {
  //request(fromUrl).pipe(fs.createWriteStream(toFile)).on('finish', onFinish);
  let previous = -1;

  progress(request(fromUrl), {
    throttle: 5000,
    delay: 0,
    lengthHeader: 'content-length'
  })
  .on('progress', (state) => {
    if (previous == -1) {
      console.log('[INFO] \'' + toFile + '\' download started from \'' + fromUrl + '\'');
      console.log('0%');
      previous = 0;
    }
    let current = Math.round(state.percentage*100);
    if(current!=100 && current!=0 && previous!=current) {
      console.log(current + '%');
    }
    previous = current;
  })
  .on('end',()=>{
    if (previous == -1) {
      console.log('[INFO] \'' + toFile + '\' download started from \'' + fromUrl + '\'');
      console.log('0%');
    }
    console.log('100%');
  })
  .pipe(fs.createWriteStream(toFile)).on('finish', onFinish);
}

//check if URLs in requirements.json return 200 and generally point to their appropriate tools
gulp.task('check-requirements', function(cb) {
  exec('node test/check-requirements.js', createExecCallback(cb, false));
})

gulp.task('watch', function () {
  gulp.watch(['test/**/*.js', 'browser/**/*.js'], ()=>runSequence('create-electron-symlink', 'unit-test', 'delete-electron-symlink'));
})
