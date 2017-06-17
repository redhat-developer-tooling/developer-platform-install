'use strict';
var DepGraph = require('dependency-graph').DepGraph;

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
    this.installerDataSvc.toDownload.delete(key);
    this.installerDataSvc.toInstall.delete(key);
    this.orderInstallation();
  }

  addComponent(key) {
    if (this.requirements[key] && this.requirements[key].bundle !== 'tools') {
      this.requirements[key].keyName = key;
      this.requirements[key].installerDataSvc = this.installerDataSvc;
      if(this.requirements[key].dmUrl) {
        this.requirements[key].downloadUrl = this.requirements[key].dmUrl;
      } else {
        this.requirements[key].downloadUrl = this.requirements[key].url;
      }
      let component = new DynamicClass(this.requirements[key].modulePath, this.requirements[key]);
      this.installerDataSvc.addItemToInstall(key, component);
    }
  }

  orderInstallation() {
    let newOrder = {};
    Object.assign(newOrder, this.buildBaseOrder());
    let changed;
    do {
      changed = false;
      for (let item of Object.keys(newOrder)) {
        let children = newOrder[item];
        let finalChildren = [];
        for (let i = 0; i < children.length; i++) {
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
    } while (changed);

    for (let [key, value] of this.installerDataSvc.allInstallables()) {
      value.installAfter = this.installerDataSvc.getInstallable(this.requirements[key].installAfter);
    }
  }

  buildBaseOrder() {
    let baseOrder = {
      root: []
    };
    let requirements = JSON.parse(JSON.stringify(require('../../requirements.json')));
    for (let key in requirements) {
      let item = requirements[key];
      if( item.bundle !== 'tools') {
        if(baseOrder[key] == undefined) {
          baseOrder[key] = [];
        }
        if(item.installAfter == undefined) {
          baseOrder.root.push(key);
        } else {
          if (baseOrder[item.installAfter] == undefined) {
            baseOrder[item.installAfter] = [];
          }
          baseOrder[item.installAfter].push(key);
        }
      }
    }
    return baseOrder;
  }

  buildBaseOrder() {
    let baseOrder = {
      root: []
    };
    let requirements = this.installerDataSvc.requirements;
    for (let key in requirements) {
      let item = requirements[key];
      if( item.bundle !== 'tools') {
        if(baseOrder[key] == undefined) {
          baseOrder[key] = [];
        }
        if(item.installAfter == undefined) {
          baseOrder.root.push(key);
        } else {
          if (baseOrder[item.installAfter] == undefined) {
            baseOrder[item.installAfter] = [];
          }
          baseOrder[item.installAfter].push(key);
        }
      }
    }
    return baseOrder;
  }

  static loadGraph(svc) {
    let graph = new DepGraph();
    // first add all the nodes into graph
    for (let key in svc.requirements) {
      let item = svc.requirements[key];
      if( item.bundle !== 'tools') {
        graph.addNode(key);
      }
    }
    // then add releations between nodes
    for (let key of graph.overallOrder()) {
      let item = svc.requirements[key];
      if(item.requires) {
        for(const dep of item.requires) {
          if(dep.includes('||')) {
            let orDeps = dep.split('||');
            for(let orDep of orDeps) {
              let installable = svc.getInstallable(orDep);
              if(installable.isConfigured() || installable.isSelected()) {
                graph.addDependency(key, orDep);
                break;
              }
            }
          } else {
            graph.addDependency(key, dep);
          }
        }
      }
    }
    return graph;
  }
}

class DynamicClass {
  constructor (modulePath, config) {
    let klass = require(`../${modulePath}`);
    let obj = klass.default.convertor.fromJson(config);
    return obj;
  }
}

export default ComponentLoader;
