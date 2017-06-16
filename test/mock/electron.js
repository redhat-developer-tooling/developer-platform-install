'use strict';

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
    }
  };
  let shell = {
    openExternal() {}
  };
  return {
    remote,
    shell
  };
}

export default electron;
