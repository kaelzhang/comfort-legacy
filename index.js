'use strict';

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli();
module.exports = comfort;
comfort.Comfort = Comfort;

function comfort(options) {
  options || (options = {});
  return new Comfort(options);
}


var node_path = require('path');
var EE = require('events').EventEmitter;
var util = require('util');
var spawn = require('child_process').spawn;
var fs = require('fs');
var expand = require('fs-expand');

var clean = require('clean');

var BUILTIN_COMMAND_ROOT = node_path.join(__dirname, 'lib', 'built-in', 'command');
var BUILTIN_OPTION_ROOT = node_path.join(__dirname, 'lib', 'built-in', 'option');


function Comfort(options) {
  this.options = options;
  this.context = options.context || {};
  this.commands = options.commands;
  options.offset = 'offset' in options ? options.offset : 3;

  this.__commander = {};
}

util.inherits(Comfort, EE);


// 'abc.js' -> 'abc'
// 'abc.js.js' -> 'abc'
var REGEX_REPLACE_EXTENSION = /\..+$/;

// Get all commands
Comfort.prototype._get_commands = function(callback) {
  if (this.commands) {
    return callback(null, this.commands);
  }

  var self = this;
  expand('*.js', {
      cwd: this.options.command_root
  }, function (err, files) {
    if (err) {
      return callback(err);
    }

    var commands = files.map(function(command) {
      return command.replace(REGEX_REPLACE_EXTENSION, '');
    });
    // Cache it
    self.commands = commands;
    callback(null, commands);
  });
};


Comfort.prototype.parse = function(argv, callback) {
  var self = this;
  this._get_commands(function (err) {
    if (err) {
      return callback(err);
    }

    self._parse(argv, callback);
  });
};


var BUILTIN_COMMANDS = [
  'help',
  'version'
];

// parse a specified argument vector
// @param {Array} argv process.argv or something like that
// @param {function(err, result, details)} callback 
// @param {boolean} strict if strict, 
Comfort.prototype._parse = function(argv, callback, strict) {
  // argv ->
  // ['node', __dirname, '<command>', ...]
  var command = argv[2];
  var is_entry = !command;

  var is_command =
    command
    && command.indexOf('-') !== 0;

  var is_normal = is_command && this._is_normal(command);
  var is_builtin = is_command && this._is_builtin(command);

  // Plugins
  ////////////////////////////////////////////////////////////////////////////////////
  // cortex <plugin> --version
  // cortex <plugin> -v
  // Plugin command needs special treatment.
  if (is_command && !is_normal && !is_builtin) {
    if (strict) {
      var name = this.options.name;
      return callback({
        code: 'COMMAND_NOT_FOUND',
        message: name + ': "' + command + '" is not a "' + name + '" command. See "' + name + ' --help".',
        data: {
          name: name,
          command: command
        }
      });
    }

    return callback(null, {
      argv: argv,
      command: command,

      // 'normal', 'builtin', 'plugin'
      type: 'plugin'
    });
  }

  // Version
  ////////////////////////////////////////////////////////////////////////////////////
  if (
    command === 'version' || 
    ~argv.indexOf('-v') ||
    ~argv.indexOf('--version')
  ) {
    command = 'version';
    return callback(null, {
      argv: argv,
      command: command,
      type: this._is_normal(command)
        ? 'normal'
        : 'builtin';
    });
  }

  // Help -h, --help
  ////////////////////////////////////////////////////////////////////////////////////
  var index_h = argv.indexOf('-h');
  var index_help = argv.indexOf('--help');  

  // 'help' command need special treatment
  if (
    // cortex -h
    ~index_h ||
    // cortex --help
    ~index_help ||
    // root command will be help command
    is_entry ||
    // cortex --wrong-argument
    !is_command
  ) {
    // 1      2       3
    // cortex install -h
    // cortex install --help 
    // -> cortex help
    var command_for_help = index_h !== 2 && index_help !== 2 && argv[2];
    command = 'help';

    return callback(null, {
      argv: argv,
      command: command,
      type: 
      options: {
        command: command_for_help,

        // if there's only root command, an `entrance` option will be added
        entry: is_entry_command
      }
    });
  }

  // Normal & Builtin
  ////////////////////////////////////////////////////////////////////////////////////
  this._parse_argv(command, argv, callback);
};


Comfort.prototype._is_builtin = function(command) {
  return ~BUILTIN_COMMANDS.indexOf(command);
};


Comfort.prototype._is_normal = function(command) {
  return ~this.commands.indexOf(command);
};


// Parse the argv of a normal or builtin command
Comfort.prototype._parse_argv = function(command, argv, callback) {
  var is_normal = this._is_normal(command);
  var option_root = is_normal
    ? this.option_root
    : BUILTIN_OPTION_ROOT;

  var type = is_normal 
    ? 'normal' 
    : 'builtin';

  this._get_option_rule(command, option_root, function (err, rule) {
    if (err) {
      return callback(err);
    }

    if (!rule) {
      return callback(null, {
        argv: argv,
        command: command,
        type: type,
        options: {}
      });
    }

    // parse argv
    clean({
      schema: rule.options,
      shorthands: rule.shorthands,
      offset: this.options.offset,
      context: this.context

    }).parseArgv(argv, function(err, results, details) {
      callback(err, {
        command: command,
        options: results,
        argv: argv,
        type: type
      });
    });
  });
};


Comfort.prototype._get_option_rule = function(command, root, callback) {
  var file = node_path.join(root, command + '.js');
  fs.exists(file, function (exists) {
    if (!exists) {
      return callback(null, null);
    }

    var rule;
    try {
      rule = require(file);
    } catch(e) {
      return callback({
        code: 'FAIL_READ_OPTION',
        message: 'Fails to read option file "' + file + '": ' + e.stack,
        data: {
          command: command,
          file: file,
          error: e
        }
      });
    }

    callback(null, rule);
  });
};


Comfort.prototype.run = function(argv, callback) {
  this.parse(argv, function (err) {
    if (err) {
      return callback(err);
    }

    
  });
};


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
// - handle errors with node-favored async way

// ****

// # Events:
// ## plugin
// {
//     name: {string},
//     command: {string} plugin name,
//     args: {Array}  
// }

// ## complete
// {
//     name   : {string}
//     command: {string} command name
//     err    : {mixed}
//     data   : []
// }

// run cli
Comfort.prototype.cli = function(argv) {
  var self = this;

  argv = argv || process.argv;

  this.parse(argv, function(err, result, details) {
    var command = result.command;
    var opt = result.opt;

    if (err) {
      return self._emit_complete(command, [err]);
    }

    self.run(command, opt, function(err) {
      if (err && err.code === 'E_COMMAND_NOT_FOUND') {
        return self._run_plugin(command, argv.slice(self.options.offset), function() {
          self._emit_complete(command, arguments)
        });
      }

      self._emit_complete(command, arguments);
    });
  });
};


Comfort.prototype._emit_complete = function(command, args) {
  args = Array.prototype.slice.call(args);
  var error = args.shift();

  this._emit('complete', {
    name: this.options.name,
    command: command,
    error: error,
    data: args
  });
};


// Try to run the given command from the `PATH`
Comfort.prototype._run_plugin = function(command, args, callback) {
  var name = this.options.name;
  var bin = name + '-' + command;
  var paths = process.env.PATH.split(':');
  var found;

  paths.some(function(path) {
    var bin_path = node_path.resolve(path, bin);

    if (exists(bin_path) && isFile(bin_path)) {
      found = bin_path;
      return true;
    }
  });

  if (!found) {
    return this._command_not_found(command, callback);
  }

  this._emit('plugin', {
    name: name,
    command: command,
    args: args
  });

  var plugin = spawn(found, args, {
    stdio: 'inherit',
    // `options.customFds` is now DEPRECATED.
    // just for backward compatibility.
    customFds: [0, 1, 2]
  });

  // for node <= 0.6, 'close' event often could not be triggered
  plugin.on('exit', function(code) {
    callback(code);
  });
};


Comfort.prototype._command_not_found = function(command, callback) {
  var name = this.options.name;
  callback({
    code: 'E_COMMAND_NOT_FOUND',
    message: name + ': "' + command + '" is not a "' + name + '" command. See "' + name + ' --help".',
    data: {
      name: name,
      command: command
    }
  });
};


// ＠public
// Run a command with callbacks.
// This method might be called manually.
Comfort.prototype.run = function(command, options, callback) {
  var commander = this.get_commander(command);
  var name = this.options.name;

  // explode `comfort` options to sub commands
  if (command === 'help') {
    options.options = this.options;
  }

  if (!commander) {
    this._command_not_found(command, callback);

  } else {
    this._run_commander(commander, options, callback);
  }
};


// Run a given commander
Comfort.prototype._run_commander = function(commander, options, callback) {
  commander.run(options, callback);
};





// check if a sub commander 
Comfort.prototype.command_exists = function(command) {
  return !!this._get_commander_file(command);
};


// @returns {Object|false}
Comfort.prototype.get_commander = function(command) {
  // cache commander to improve performance
  var commander = this.__commander[command];

  if (!commander) {
    var commander_file = this._get_commander_file(command);

    if (!commander_file) {
      return false;
    }

    var commander_proto = require(commander_file);

    if (this.options.prevent_extensions) {
      Object.preventExtensions(commander_proto);
    }

    // There might be more than one comfort instances,
    // so `Object.create` a new commander object to prevent reference pollution.
    commander = this.__commander[command] = Object.create(commander_proto);

    commander.context = this.context;
    commander.logger = this.logger;
  }

  return commander;
};


// ._emit('COMMAND_NOT_FOUND', command)
Comfort.prototype._emit = function(type, data) {
  if (!type) {
    return;
  }

  // if there is no custom event listeners
  if (this.listeners(type).length === 0) {
    DEFAULT_EVENTS[type].apply(this, Array.prototype.slice.call(arguments, 1));
  } else {
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
    this._get_file(builtin_command_root, command)
  );
};


Comfort.prototype._get_file = function(root, name) {
  var file = node_path.join(root, name + '.js');

  return exists(file) && file;
};

// var DEFAULT_EVENTS = {
//   complete: function(e) {
//     var err = e.error;

//     if (err) {
//       if (err instanceof Error) {
//         // loggie will deal with `Error` instances
//         this.logger.error(err);

//         // error code
//       } else if (typeof err === 'number') {
//         this.logger.error('Not ok, exit code: ' + err);

//       } else {
//         this.logger.error(err.message || err);
//       }

//     } else if (e.command !== 'help') {
//       this.logger.info('{{green OK!}}');
//     }
//   }
// };