'use strict';

function electron() {
  let electronWindow = {
    close: function() {}
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

  return {
    remote
  };
}

export default electron;
