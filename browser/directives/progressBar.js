'use strict'

import angular from 'angular';

function progressBar() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      current: '=',
      min: '=',
      max: '=',
      desc: '=',
      label: '='
    },
    template:
    [
      '<div>',
        '<div class="progress-description">',
          '<span>{{desc}}</span>',
        '</div>',
        '<div class="progress progress-label-top-right">',
          '<div class="progress-bar" role="progressbar" aria-valuenow="{{current}}" aria-valuemin="{{min}}" aria-valuemax="{{max}}" style="width: {{current}}%;">',
            '<span>{{label}}</span>',
          '</div>',
        '</div>',
      '</div>'
    ].join('')
  }
}

export default progressBar;
