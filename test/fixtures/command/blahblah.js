'use strict';

var command = module.exports = {};

command.run = function (options, callback) {
  options.blahblahblah = true;
  callback(null, options);
};