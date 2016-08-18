'use strict'

import angular from 'angular';

function progressBar() {
  return {
    restrict: 'E',
    replace: true,
    scope: {
      productName: '=',
      productVersion: '=',
      productDesc: '=',
      current: '=',
      min: '=',
      max: '=',
      label: '=',
      status: '='
    },
    template:
    [`
    <div class="panel panel-default">
      <div class="panel-heading">
        <div class="product-container">
          <div>
            <div class="progress-description">
              <span class="product-name">{{productName}}</span><span class="product-version">{{productVersion}}</span> - <span class="product-version">{{status}}</span>
              <div>{{productDesc}}</div>
            </div>
            <div class="progress progress-label-top-right">
              <div class="progress-bar" ng-class="{'progress-bar-striped active': status == 'Installing' || status == 'Setting up' || status.indexOf('Waiting') > -1}" role="progressbar" aria-valuenow="{{current}}" aria-valuemin="{{min}}" aria-valuemax="{{max}}"
                style="width: {{current}}%; animation: progress-bar-stripes 2s infinite steps(15);">
                <span>{{label}}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    `].join('')
  }
}

export default progressBar;
