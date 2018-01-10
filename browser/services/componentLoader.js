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
    //this.orderInstallation();
  }

  loadComponent(key) {
    this.addComponent(key);
  }

  removeComponent(key) {
    this.installerDataSvc.allInstallables().delete(key);
    this.installerDataSvc.toDownload.delete(key);
    this.installerDataSvc.toInstall.delete(key);
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

  orderInstallation(graph) {
    let installers = graph.overallOrder();
    for(let i = 0; i < installers.length-1; i++) {
      this.installerDataSvc.getInstallable(installers[i]).thenInstall(this.installerDataSvc.getInstallable(installers[i+1]));
    }
  }

  static loadGraph(svc) {
    let graph = new DepGraph();
    // first add all the nodes into graph
    for (let key in svc.requirements) {
      let item = svc.requirements[key];
      if( item.bundle !== 'tools' && svc.getInstallable(key)) {
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
              let req = svc.getRequirementByName(orDep);
              // temp solution for conditional dependency resolution
              // would work for hyperv || virtualbox but not in general
              if(installable && (installable.isValidVersionDetected() || req.installable === true)) {
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
