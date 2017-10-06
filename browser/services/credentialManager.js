import keytar from 'keytar';
import path from 'path';
import fs from 'fs-extra';
import Platform from './platform';

class TokenStore {
  static setItem(key, login, value) {
    return keytar.setPassword(key, login, value);
  }

  static getItem(key, login) {
    return keytar.getPassword(key, login);
  }

  static getUserName() {
    let dataFilePath = path.join(Platform.localAppData(), 'settings.json');
    let username = '';
    if (fs.existsSync(dataFilePath)) {
      let data = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
      if (data.username) {
        username = data.username;
      }
    }
    return username;
  }
}

export default TokenStore;
