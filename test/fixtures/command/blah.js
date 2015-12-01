'use strict';

var command = module.exports = {};

command.run = function (options, callback) {
  options.blah = true;

  this.emit('event', options);
  callback(null, options);
};