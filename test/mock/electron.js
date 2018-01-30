'use strict';

import EventEmitter from 'events';

function electron() {
  let electronWindow = {
    close() {},
    removeAllListeners() {},
    addListener() {},
    webContents: {
      session: {
        getUserAgent() {
          return 'agent';
        }
      }
    }
  };
  let remote = {
    getCurrentWindow () {
      return electronWindow;
    },
    currentWindow: electronWindow,
    dialog: {
      showOpenDialog() {}
    },
    app: {
      getVersion() {
        return '2.1.0-GA';
      }
    }
  };
  let shell = {
    openExternal() {}
  };
  let ipcRenderer = new EventEmitter();
  return {
    remote,
    shell,
    ipcRenderer
  };
}

export default electron;
