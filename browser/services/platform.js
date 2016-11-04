'use strict';

class Platform {
  static identify(map) {
    try {
      return map[Platform.OS]();
    } catch (error) {
      return map['default']();
    }
  }

  static get OS() {
    return Platform.getOS();
  }

  static getOS() {
    return process.platform;
  }

  static get ENV() {
    return Platform.getEnv();
  }

  static getEnv() {
    return process.env;
  }
}

Platform.PATH = Platform.identify({
  win32: ()=>'Path',
  default: ()=>'PATH'
});

export default Platform;
