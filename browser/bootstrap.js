'use strict';

import mainModule from './main';
import { remote } from 'electron';

angular.element(document).ready(function() {
  angular.bootstrap(document, [mainModule.name], { strictDi: true });
});

// Importing this adds a right-click menu with 'Inspect Element' option
const { BrowserWindow } = require('electron').remote;
const { Menu, MenuItem } = remote;

let rightClickPosition = null;

var menu;
const toggleDevToolsItem = new MenuItem({
  label: 'Toggle Development Tools',
  accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
  click: () => {
    remote.getCurrentWindow().toggleDevTools();
  }
});
const inspectElementItem = new MenuItem({
  label: 'Inspect Element',
  click: () => {
    remote.getCurrentWindow().inspectElement(rightClickPosition.x, rightClickPosition.y);
  }
});

function openAboutWindow() {

  let aboutWindow = new BrowserWindow({
    parent: remote.getCurrentWindow(),
    modal: true,
    useContentSize: true,
    width: 565,
    height: 355,
    'autoHideMenuBar': true,
    resizable: false,
    show: false
  });
  let baseLocation = encodeURI(__dirname.replace(/\\/g, '/')).replace(/#/g, '%23');

  // Load the about.html of the app
  aboutWindow.loadURL(`file://${baseLocation}/about.html`);
  aboutWindow.setMenu(null);
  aboutWindow.once('ready-to-show', () => {
    aboutWindow.show();
  });
}

const aboutItem = new MenuItem({
  label: 'About Red Hat Development Suite',
  click: openAboutWindow
});

const separator = new MenuItem({
  type: 'separator'
});

const help = new MenuItem({
  label: 'Help',
  accelerator: 'f1',
  click: () => {
    require('electron').shell.openExternal('https://access.redhat.com/documentation/en/red-hat-development-suite/');
  }
});

function restoreMenu() {
  menu = new Menu();
  menu.append(toggleDevToolsItem);
  menu.append(inspectElementItem);
  menu.append(separator);
  menu.append(help);
  menu.append(separator);
  menu.append(aboutItem);
}

restoreMenu();

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  rightClickPosition = {x: e.x, y: e.y};
  menu.popup(remote.getCurrentWindow());
}, false);
