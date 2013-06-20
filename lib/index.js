'use strict';

// ### design
//  commander({
//      command_root: './lib/command',
//      option_root: './opt/',
//      name: 'cortex'
//  }).cli();

var Commander = require('./commander');

var sub_commander = module.exports = function(options) {
    return new Commander(options);
};

sub_commander.Commander = Commander;
sub_commander.parser = require('./parser');
