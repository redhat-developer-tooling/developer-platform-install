'use strict';

import InstallerDataService from './data';

const baseOrder = {
  'root': ['jdk'],
  'jdk':  ['virtualbox', 'devstudio'],
  'virtualbox': ['hyperv'],
  'hyperv': ['cygwin'],
  'cygwin': ['cdk'],
  'devstudio': [],
  'cdk': []
};

class ComponentLoader {
  constructor(installerDataSvc) {
    this.requirements = installerDataSvc.requirements;
    this.installerDataSvc = installerDataSvc;
  }

  loadComponents() {
    for (let key in this.requirements) {
      this.addComponent(key);
    }
    this.orderInstallation();
  }

  loadComponent(key) {
    this.addComponent(key);
    this.orderInstallation();
  }

  removeComponent(key) {
    this.installerDataSvc.allInstallables().delete(key);
    this.orderInstallation();
  }

  addComponent(key) {
    if (this.requirements[key] && this.requirements[key].bundle !== 'tools') {
      let skippedProperties = ['name', 'description', 'bundle', 'vendor', 'virusTotalReport', 'modulePath'];
      let args = [this.installerDataSvc];
      if (this.requirements[key].dmUrl) {
        skippedProperties.push('url');
      }

      for (let property in this.requirements[key]) {
        if (skippedProperties.indexOf(property) < 0) {
          args.push(this.requirements[key][property]);
        }
      }
      let component = new DynamicClass(this.requirements[key].modulePath, args);

      this.installerDataSvc.addItemToInstall(key, component);
    }
  }

  orderInstallation() {
    let newOrder = {};
    Object.assign(newOrder, baseOrder);
    let changed;

    do {
      changed = false;
      for (let item of Object.keys(newOrder)) {
        let children = newOrder[item];
        let finalChildren = [];
        for (var i = 0; i < children.length; i++) {
          if (this.installerDataSvc.getInstallable(children[i])) {
            finalChildren.push(children[i]);
          } else {
            if (newOrder[children[i]]) {
              finalChildren = finalChildren.concat(newOrder[children[i]]);
              newOrder[item] = finalChildren;
              changed = true;
            }
          }
        }
      }
    } while (changed)

    for (let [key, value] of this.installerDataSvc.allInstallables()) {
      for (var i = 0; i < newOrder[key].length; i++) {
        let nextItem = this.installerDataSvc.getInstallable(newOrder[key][i]);
        value.thenInstall(nextItem);
      }
    }
  }
}

class DynamicClass {
  constructor (modulePath, opts) {
    let klass = require(`../${modulePath}`);
    return new klass.default(...opts);
  }
}

export default ComponentLoader;
