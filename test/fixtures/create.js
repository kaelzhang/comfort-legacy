'use strict';

var comfort = require('../../');
var node_path = require('path');

module.exports = function(){
    return comfort({
        command_root: node_path.join( __dirname, 'command'),
        option_root : node_path.join( __dirname, 'option'),
        name: 'abc'
    });
};