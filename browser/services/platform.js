'use strict';

class Platform {

  static addToPath(location){
    return [
      '$newPath = "' + location + '";',
      '$oldPath = [Environment]::GetEnvironmentVariable("path", "User");',
      '[Environment]::SetEnvironmentVariable("Path", "$newPath;$oldPath", "User");',
      '[Environment]::Exit(0)'
    ].join('\r\n');
  }

  static identify(map) {
    try {
      return map[Platform.OS]();
    } catch (error) {
      let defaultCallback = map['default'];
      return defaultCallback ? defaultCallback() : undefined;
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

  static get PATH() {
    return Platform.identify({
      win32: ()=>'Path',
      default: ()=>'PATH'
    });
  }
}


export default Platform;
