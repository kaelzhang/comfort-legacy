'use strict';

var expect = require('chai').expect;

var command = module.exports = {};

command.run = function (options, callback) {
    expect(this.abc).to.equal(undefined);
    
    this.abc = 1;
    callback(null, options);
};