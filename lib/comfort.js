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
        this.logger.error(
            this.logger.template('{{name}}: "{{command}}" is not a {{name}} command. See "{{name}} --help".', {
                name: e.name,
                command: e.command
            })
        );
    },

    complete: function(e) {
        if(e.err){
            this.logger.error(e.err);
        }else if(e.command !== 'help'){
            this.logger.info('{{green OK!}}');
        }
    }
};

var node_path = require('path');
var node_events = require('events').EventEmitter;
var node_util = require('util');

var fs = require('fs-sync');
var parser = require('argv-parser');


var builtin_command_root = node_path.join( __dirname, 'built-in', 'command' );
var builtin_option_root = node_path.join( __dirname, 'built-in', 'option' );

function Commander(options){
    this.options = options;
    this.logger = options.logger || require('loggie')();
    this.context = options.context || {};
    this.offset = 'offset' in options ? options.offset : 3;

    this.__commander = {};
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
        var data = this.parse(process.argv);

        this._argv_info(data);

        if(data.options.err){
            this._argv_error(data);

        }else{
            this._run(data.command, data.options.parsed);
        }
    },

    _argv_info: function (data) {
        var infos = data.options.infos;
        var self = this;

        infos && Object.keys(infos).forEach(function (key) {
            var text = infos[key];

            text.forEach(function (t) {
                self.logger.info(t); 
            });
        });
    },

    _argv_error: function (data) {
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
    },

    // Run a specific command by comfort it self
    _run: function(command, options) {
        this.run(command, options, this._callback_handler(command));
    },


    // ＠public
    // Run a command with callbacks.
    // This method might be called manually.
    run: function (command, options, callback) {
        var commander = this.get_commander(command);

        // explode `comfort` options to sub commands
        if(command === 'help'){
            options.options = this.options;
        }

        commander && commander.run(options, callback);
    },

    // @returns {Object|false}
    get_commander: function (command) {

        // cache commander to improve performance
        var commander = this.__commander[command];

        if(!commander){
            var commander_file = this._get_commander_file(command);

            if(!commander_file){
                this._emit('commandNotFound', {
                    command: command,
                    name: this.options.name
                });

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
    },

    _callback_handler: function(command) {
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
                    parsed: {
                        // ctx
                        // -> ctx help --command * --no-detail
                        command: command_for_help || '*',

                        // if there's only root command, an `entrance` option will be added
                        entrance: argv.length === 2
                        // detai: false 
                    }
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
                    parser.parse(argv, {
                        rules: require(opt_file).options,
                        offset: this.offset 
                    }) :

                    // if no opt_rule matches 
                    {
                        parsed: {}
                    }
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
            DEFAULT_EVENTS[type].apply(this, Array.prototype.slice.call(arguments, 1) );
        }else{
            // this.emit('commandNotFound', command)
            this.emit.apply(this, arguments);
        }
    },

    // @param {string} command name of the command
    // @returns
    //      {false} if commander not found
    //      {path} path of the commander file
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