'use strict';

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli();
module.exports = Comfort;


var DEFAULT_EVENTS = {
    commandNotFound = function(e) {
        this.logger.error(
            this.logger.template('{{name}}: "{{command}}" is not a {{name}} command. See "{{name}} --help".', {
                name: e.name,
                command: e.command
            })
        );
    },

    complete = function(e) {
        if(e.err){
            this.logger.error(e.err);
        }else if(e.command !== 'help'){
            this.logger.info('{{green OK!}}');
        }
    }
};

var node_path = require('path');
var EE = require('events').EventEmitter;
var node_util = require('util');

var node_fs = require('fs');
var clean = require('clean');


var builtin_command_root = node_path.join( __dirname, 'built-in', 'command' );
var builtin_option_root = node_path.join( __dirname, 'built-in', 'option' );


var exists = node_fs.existsSync ?
    function (file) {
        return node_fs.existsSync(file);
    } :

    // if node <= 0.6, there's no fs.existsSync method.
    function (file) {
        try {
            node_fs.statSync(file);
            return true;
        } catch(e) {
            return false;
        }
    };


function Comfort(options){
    this.options = options = options || {};
    this.logger = options.logger || require('loggie')();
    this.context = options.context || {};

    options.offset = 'offset' in options ? options.offset : 3;
    // options.default_command = options.default_command || 'help';

    this.__commander = {};
}

node_util.inherits(Comfort, EE);

// # Design spec

// ## method to run in cli (bin): 
// - .cli()

// Should:
// - driven by events

// ## method used by users or utility methods:
// - .run(), 
// - .command_exists(), 
// - .get_commander()

// Should:
// - driven by callbacks
// - handle errors with node.js favored async way

// run cli
Comfort.prototype.cli = function(argv) {
    var self = this;

    this.parse(argv || process.argv, function(err, result, details){
        var command = result.command;
        var opt = result.opt;

        self.run(command, opt, function (err) {
            
        })
    });
};


Comfort.prototype._argv_error = function (data) {
    var errors = data.options.errors;

    this._emit('complete', {
        name: this.options.name,
        command: data.command,
        err: Object.keys(errors).map(function (option) {
            var err_text = errors[option];

            return 'Error parsing option "--' + option + '": ' + err_text.join('. ');
        }).join('\n'),

        data: null
    });
};


// Run a specific command by comfort it self
Comfort.prototype._run_cli = function(command, options) {
    this.run(command, options, this._callback_handler(command));
};


// ＠public
// Run a command with callbacks.
// This method might be called manually.
Comfort.prototype.run = function (command, options, callback) {
    var commander = this.get_commander(command);
    var name = this.options.name;

    // explode `comfort` options to sub commands
    if(command === 'help'){
        options.options = this.options;
    }

    if ( !commander ) {
        // this._emit('commandNotFound', {
        //     command: command,
        //     name: name
        // });

        callback({
            code: 'E_COMMAND_NOT_FOUND',
            message: '"' + command + '" is not a built-in ' + name + ' command', 
            data: {
                name: this.options.name,
                command: command
            }
        });

    } else {
        this._run_commander(commander, options, callback);
    }
};


// Run a given commander
Comfort.prototype._run_commander = function (commander, options, callback) {
    commander.run(options.callback);
};


// parse a specified argument vector
// @param {function()} callback 
Comfort.prototype.parse = function(argv, callback) {

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

        callback(null, {
            command: 'help',
            opt: {
                // ctx
                // -> ctx help --command * --no-detail
                command: command_for_help || '*',

                // if there's only root command, an `entrance` option will be added
                entrance: argv.length === 2
            }
        });
    
    // normal command
    } else {
        command = argv[2];
        var parsed;

        var opt_file = this._get_option_file(command);
        var opt_rules;

        if ( opt_file ) {
            var rule = require(opt_file);

            clean({
                schema: rule.options,
                shorthands: rule.shorthands,
                offset: this._offset

            }).parseArgv(argv, function (err, results, details) {
                callback(err, {
                    command: command,
                    opt: results
                }, details);
            });
        
        // if no opt_rule matches 
        } else {
            callback(null, {
                command: command,
                opt: {}
            });
        }
    }
};


// check if a sub commander 
Comfort.prototype.command_exists = function (command) {
    return !!this._get_commander_file(command);
};


// @returns {Object|false}
Comfort.prototype.get_commander = function (command) {
    // cache commander to improve performance
    var commander = this.__commander[command];

    if(!commander){
        var commander_file = this._get_commander_file(command);

        if(!commander_file){
            return false;
        }

        commander = require(commander_file);

        // There might be more than one comfort instances,
        // so `Object.create` a new commander object to prevent reference pollution.
        this.__commander[command] = Object.create(commander);

        commander.context = this.context;
        commander.logger  = this.logger;
    }

    return commander;
};


Comfort.prototype._callback_handler = function(command) {
    var self = this;

    return function() {
        var args = Array.prototype.slice.call(arguments);
        var error = args.shift();

        self._emit('complete', {
            name   : self.options.name,
            command: command,
            err    : error && (error.stack || error.message || error.error || error),
            data   : args
        });
    }
};


// ._emit('COMMAND_NOT_FOUND', command)
Comfort.prototype._emit = function(type, data) {
    if(!type){
        return;
    }

    // if there is no custom event listeners
    if( EE.listenerCount(this, type) === 0 ){
        DEFAULT_EVENTS[type].apply(this, Array.prototype.slice.call(arguments, 1) );
    }else{
        // this.emit('commandNotFound', command)
        this.emit.apply(this, arguments);
    }
};


// @param {string} command name of the command
// @returns
//      {false} if commander not found
//      {path} path of the commander file
Comfort.prototype._get_commander_file = function(command) {
    return !!command && (
        this._get_file(this.options.command_root, command) || 
        command === 'help' && this._get_file(builtin_command_root, command)
    );
};


Comfort.prototype._get_option_file = function(command) {
    return !!command && (
        this._get_file(this.options.option_root, command) || 
        command === 'help' && this._get_file(builtin_option_root, command)
    );
};


Comfort.prototype._get_file = function(root, name) {
    var file = node_path.join( root, name + '.js' );

    return exists(file) && file;
};

