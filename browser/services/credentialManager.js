import keytar from 'keytar';
import path from 'path';
import fs from 'fs-extra';

class TokenStore {
  static setItem(key, login, value) {
    return keytar.setPassword(key, login, value);
  }

  static getItem(key, login) {
    return keytar.getPassword(key, login);
  }

  static getUserName() {
    let dataFilePath = path.join(remote.app.getPath('userData'),'RedHat','DevelopmentSuite', 'settings.json');
    console.log(fs.existsSync(dataFilePath));
    if (fs.existsSync(dataFilePath)) {
      let data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
      if (data.username) {
        return data.username;
      } else {
        return "";
      }
    } else {
      return "";
    }
  }
}

export default TokenStore;
