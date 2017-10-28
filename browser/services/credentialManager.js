import keytar from 'keytar';
import path from 'path';
import fs from 'fs-extra';
import Platform from './platform';
import {LocalStorage} from 'node-localstorage';

let localStorage;

class TokenStore {
  static setItem(key, login, value) {
    return keytar.setPassword(key, login, value);
  }

  static getItem(key, login) {
    return keytar.getPassword(key, login);
  }

  static deleteItem(key, login) {
    return keytar.deletePassword(key, login);
  }

  static getUserName() {
    let username = TokenStore.localStorage.getItem('username');
    return username ? username : '';
  }

  static setUserName(username) {
    TokenStore.localStorage.setItem('username',username);
  }

  static getPassword() {
    return TokenStore.getItem('RedHatDevelopmentSuite', 'password');
  }

  static setPassword(password) {
    return TokenStore.setItem('RedHatDevelopmentSuite', 'password', password);
  }

  static removePassword() {
    return TokenStore.deleteItem('RedHatDevelopmentSuite', 'password');
  }

  static getStatus(){
    return JSON.parse(TokenStore.localStorage.getItem('rememberMe'));
  }

  static get localStorage() {
    if (localStorage == undefined) {
      localStorage = new LocalStorage(path.join(Platform.localAppData(), 'settings'));
    }
    return localStorage;
  }
}

export default TokenStore;
