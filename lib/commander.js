'use strict';

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli();
module.exports = Commander;


var DEFAULT_EVENTS = {
    commandNotFound: function(e) {
        typo.log( '{{name}}: "{{command}}" is not a {{name}} command. See "{{name}} --help".', {
            name: e.name,
            command: e.command
        });
    },

    complete: function(e) {
        if(e.err){
            typo.log( '{{red ERR!}}', e.err );
        }else{
            typo.log( '{{green OK!}}' );
        }
    }
};

var node_path = require('path');
var node_events = require('events').EventEmitter;
var node_util = require('util');

var fs = require('fs-sync');
var typo = require('typo');
var parser = require('./parser');


var builtin_command_root = node_path.join( __dirname, 'built-in', 'command' );
var builtin_option_root = node_path.join( __dirname, 'built-in', 'option' );

function Commander(options){
    this.options = options;
}

node_util.inherits(Commander, node_events);

function mix(receiver, supplier){
    var key;
    for(key in supplier){
        receiver[key] = supplier[key];
    }
}

// `node_util.inherits` is really NOT intimate which will reset all existed properties of the prototype.
// we should define our prototype after `node_util.inherits`
mix(Commander.prototype, {
    cli: function() {
        var parsed = this.parse(process.argv);

        this.run(parsed.command, parsed.options);
    },

    run: function(command, options) {
        var commander_file = this._get_commander_file(command);

        if(!commander_file){
            return this._emit('commandNotFound', {
                command: command,
                name: this.options.name
            });
        }

        var commander = require(commander_file);

        if(typeof commander.run === 'function'){
            commander = commander.run;
        }

        // explode `comfort` options to sub commands
        if(command === 'help'){
            options.options = this.options;
        }

        commander(options, this._callback_handler(command) );
    },

    _callback_handler: function(command) {
        var args = Array.prototype.slice.call(arguments);
        var error = args.shift();
        var self = this;

        return function() {
            self._emit('complete', {
                command: command,
                err    : error,
                data   : args
            });
        } 
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
                    command: command_for_help || '*',

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
                    parser.parse(argv, require(opt_file).options) :

                    // if no opt_rule matches 
                    {}
            };
        }
    },

    // ._emit('COMMAND_NOT_FOUND', command)
    _emit: function(type, data) {
        if(!type){
            return;
        }

        // if there is no custom event listeners
        if( node_events.listenerCount(this, type) === 0 ){
            DEFAULT_EVENTS[type].call(this, Array.prototype.slice.call(arguments, 1) );
        }else{
            // this.emit('commandNotFound', command)
            this.emit.call(this, type, data);
        }
    },

    _get_commander_file: function(command) {
        return !!command && (
            this._get_file(this.options.command_root, command) || 
            command === 'help' && this._get_file(builtin_command_root, command)
        );
    },

    _get_option_file: function(command) {
        return !!command && (
            this._get_file(this.options.option_root, command) || 
            command === 'help' && this._get_file(builtin_option_root, command)
        );
    },

    _get_file: function(root, name) {
        var file = node_path.join( root, name + '.js' );

        return fs.exists(file) && file;
    }
});
