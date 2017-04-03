module.exports = {
  "env": {
      "node": true,
      "es6": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
      "sourceType": "module"
  },
  "rules": {
    "indent": [
        "error",
        2,
        { "SwitchCase": 1 }
    ],
    "quotes": [
        "error",
        "single"
    ],
    "semi": [
        "error",
        "always"
    ],
    "array-bracket-spacing": [
      "error",
      "never"
    ],
    "block-spacing": [
      "error",
      "always"
    ],
    "brace-style": [
      "error",
      "1tbs", {
        "allowSingleLine": true
      }
    ],
    "comma-style": [
      "error",
      "last"
    ],
    "comma-spacing": [
      "error", {
        "before": false,
        "after": true
      }
    ],
    "computed-property-spacing": [
      "error",
      "never"
    ],
    "no-trailing-spaces": [
      "error", {
        "skipBlankLines": true
      }
    ],
    "space-before-blocks": [
      "error",
      "always"
    ]
  }
};
