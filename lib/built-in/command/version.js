'use strict';

var version = exports;

var fs = require('fs');
var node_path = require('path');
var package_version = require('package-version');

version.run = function(options, callback) {
  var logger = this.logger;
  package_version(options.root, function (err, v) {
    if (err) {
      return callback(err);
    }

    logger.info(v);
    callback(null);
  });
};