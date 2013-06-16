'use strict';

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli();
var commander = module.exports = function(options) {
	return new Commander(options);
};

var node_path = require('path');
var node_events = require('events').EventEmitter;
var node_util = require('util');

var fs = require('fs-sync');
var opt = require('./opt');


Object.defineProperty(argv, 'EVENTS', {
    value: {
        COMMAND_NOT_FOUND: 'commandNotFound'
    }
});


var DEFAULT_EVENTS = {
    COMMAND_NOT_FOUND: function(command) {
        process.stdout.write( this.name + ': "' + command + '" is not a ' + this.name + ' command. See "ctx --help".\n');
        process.exit(1);
    }
};

function Commander(options){
	this.name = options.name;
    this.command_root = options.commands;
    this.opt_root = options.options;
}

var builtin_command_root = node_path.join( __dirname, 'lib', 'command' );
var builtin_opt_root = node_path.join( __dirname, 'lib', 'option' );

Commander.prototype = {
    cli: function() {
        var parsed = this.parse(process.argv);

        this.run(parsed.command, parsed.options);
    },

    run: function(command, options) {
        var commander_file = this._get_commander_file(command);

        if(!command){
            return this._emit('COMMAND_NOT_FOUND', command);
        }

        var commander = require(commander_file);

        commander(options);
    },

    // check if a sub commander 
    command_exists: function (command) {
        return !!this._get_commander_file(command);
    },

    // parse a specified arguments
    parse: function(argv) {

        // argv ->
        // ['node', __dirname, '<command>', ...]
        var command;
        var index_h = argv.indexOf('-h');
        var index_help = argv.indexOf('--help');

        // 'help' command need special treatment
        if(
            // ctx -h
            index_h > 0 || 
            // ctx --help
            index_help > 0 ||
            // ctx
            // root command will be help command
            argv.length === 2
        ){
            // 1   2       3
            // ctx install -h
            // ctx install --help 
            // -> ctx help --command install --no-detail
            var command_for_help = index_h !== 2 && index_help !== 2 && argv[2];

            return {
                command: 'help',
                options: {
                    // ctx
                    // -> ctx help --command * --no-detail
                    command: command_for_help,

                    // if there's only root command, an `entrance` option will be added
                    entrance: argv.length === 2
                    // detai: false 
                }
            };
        
        // normal command
        }else{
            command = argv[2];
            var parsed;

            var opt_file = this._get_option_file(command);
            var opt_rules;

            return {
                command: command,
                options: opt_file ? 
                    opt.parse(argv, require(opt_file)) :

                    // if no opt_rule matches 
                    {}
            };
        }
    },

    // ._emit('COMMAND_NOT_FOUND', command)
    _emit: function(type) {
        var standard_type = type;
        type = argv.EVENTS[type];

        if(!type){
            return;
        }

        // if there is no custom event listeners
        if( node_events.listenerCount(this, type) === 0 ){
            DEFAULT_EVENTS[standard_type].call(this, Array.prototype.slice.call(arguments, 1) );
        }else{
            // this.emit('commandNotFound', command)
            this.emit.apply(this, arguments);
        }
    },

    _get_commander_file: function(command) {
        return !!command && (
            this._get_file(this.command_root, command) || 
            command === 'help' && this._get_file(builtin_command_root, command)
        );
    },

    _get_option_file: function(command) {
        return !!command && (
            this._get_file(this.opt_root, command) || 
            command === 'help' && this._get_file(builtin_opt_root, command)
        );
    },

    _get_file: function(root, name) {
        var file = node_path.join( root, name + '.js' );

        return fs.exists(file) && file;
    }
};


node_util.inherits(Commander, node_events);