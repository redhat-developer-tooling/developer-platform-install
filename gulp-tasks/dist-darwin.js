'use strict';

const builder = require("electron-builder");
const Platform = builder.Platform;
const download = require('./download.js');
const reqs = require('../requirements-darwin.json');
const config = require('./config.js');
const copy = require('gulp-copy');
const rename = require('gulp-rename');
const runSequence = require('run-sequence');
const pjson = require('../package.json');
const fs = require('fs-extra');

module.exports = function(gulp) {

  // prefetch all the installer dependencies so we can package them up into the .exe
  gulp.task('prefetch', ['create-prefetch-cache-dir'], function() {
    return download.prefetch(reqs, 'yes', config.prefetchFolder);
  });

  gulp.task('dist', function(){
      return runSequence('clean','dist-simple','dist-bundle');
  });

  gulp.task('update-package',['update-requirements'], function() {
    return Promise.resolve().then(()=> {
        pjson.version = pjson.version.replace('GA','Alpha1');
      }).then(()=>{
        fs.writeFile('./transpiled/package.json', JSON.stringify(pjson, null, 2));
      }).catch((err)=>{
        console.log(err);
      });
  });

  gulp.task('dist-bundle', ['prefetch','update-package'], function() {
    const builder = require("electron-builder")
    const Platform = builder.Platform

    // Promise is returned
    return builder.build({
      targets: Platform.MAC.createTarget(),
      devMetadata: {
        build: {
          appId: "com.redhat.devsuite.installer",
          category: "public.app-category.developer-tools",
          mac: {
            icon: "resources/devsuite.icns",
            target: "zip"
          },
          extraFiles: [{
            "from": "requirements-cache",
            "to": ".",
            "filter": ["*"]
          }]
        },
        directories: {
          app : "transpiled"
        },

      }
    }).then(() => {
      let pn =pjson.productName;
      let pv =pjson.version;
      return gulp.src(`dist/mac/${pn}-${pv}-mac.zip`)
        .pipe(rename(`devsuite-${pv}-bundle-installer-mac.zip`))
        .pipe(gulp.dest(`dist/`));
    }).catch((error) => {
        // handle error
    });
  });

  gulp.task('dist-simple', ['update-package'], function() {
    const builder = require("electron-builder")
    const Platform = builder.Platform

    // Promise is returned
    return builder.build({
      targets: Platform.MAC.createTarget(),
      devMetadata: {
        build: {
          appId: "com.redhat.devsuite.installer",
          category: "public.app-category.developer-tools",
          mac: {
            icon: "resources/devsuite.icns",
            target: "zip"
          }
        },
        directories: {
          app : "transpiled"
        },

      }
    }).then(() => {
      let pn =pjson.productName;
      let pv =pjson.version;
      return gulp.src(`dist/mac/${pn}-${pv}-mac.zip`)
        .pipe(rename(`devsuite-${pv}-installer-mac.zip`))
        .pipe(gulp.dest(`dist/`));
    }).catch((error) => {

    });
  });

}
