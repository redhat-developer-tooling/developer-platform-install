'use strict';

import JdkInstall from '../model/jdk-install';
import JbdsInstall from '../model/jbds';
import VagrantInstall from '../model/vagrant';
import VirtualBoxInstall from '../model/virtualbox';
import CygwinInstall from '../model/cygwin';
import CDKInstall from '../model/cdk';

/*
  Used to override model methods to fake the actual installation using monkey-patching.
  !!! FOR TESTING PURPOSES ONLY - DO NOT USE IN PRODUCTION !!!
*/
export class OverrideService {
  constructor() {
    this.model = {};
    this.model[JdkInstall.key()] = JdkInstall.prototype;
    this.model[JbdsInstall.key()] = JbdsInstall.prototype;
    this.model[VagrantInstall.key()] = VagrantInstall.prototype;
    this.model[VirtualBoxInstall.key()] = VirtualBoxInstall.prototype;
    this.model[CygwinInstall.key()] = CygwinInstall.prototype;
    this.model[CDKInstall.key()] = CDKInstall.prototype;

    this.values = require('./mockup/results.json');
  }

  overrideModel() {
    for (var key in this.model) {
      let fakeModel = this.values[key];

      this.overrideTask(key, "downloadInstaller", fakeModel.download.result, fakeModel.download.time, fakeModel.download.skip);
      this.overrideTask(key, "install", fakeModel.install.result, fakeModel.install.time);
      this.overrideTask(key, "setup", fakeModel.setup.result, fakeModel.setup.time);
    }
  }

  overrideTask(key, task, resolution, time, skip) {
    this.overrideMethod(this.model[key], task, function(original) {
      if(task === "downloadInstaller" && skip) {
        return function(progress, success, failure) {
          success();
        }
      } else {
        return function(progress, success, failure) {
          console.log('Placeholder method for ' + key + ' ' + task);

          let status = task === "downloadInstaller" ? "Pretending to be  Downloading"
            : (task === "install" ? "Pretending to be Installing" : "Pretending to be Setting up");
          progress.setStatus(status);

          setTimeout(function () {
            if (resolution === "success") {
              if (task === "setup") {
                progress.setComplete();
              }
              success();
            } else {
              progress.setStatus('Pretending to have Failed');
              failure();
            }
          }, time);
        }
      }
    });
  }

  overrideMethod(object, methodName, callback) {
    object[methodName] = callback(object[methodName])
  }

}
