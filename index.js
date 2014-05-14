'use strict';

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli();
module.exports = comfort;

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
      return this._command_not_found(command, callback);
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
      options: {
        root: this.options.root
      },
      type: this._is_builtin(command)
        ? 'builtin'
        : 'normal'
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
      type: this._is_builtin(command)
        ? 'builtin'
        : 'normal',
      options: {
        command: command_for_help,

        // if there's only root command, an `entrance` option will be added
        entry: is_entry
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


Comfort.prototype._command_not_found = function(command, callback) {
  var name = this.options.name;
  callback({
    code: 'COMMAND_NOT_FOUND',
    message: name + ': "' + command + '" is not a "' + name + '" command. See "' + name + ' --help".',
    data: {
      name: name,
      command: command
    }
  });
};


// Parse the argv of a normal or builtin command
Comfort.prototype._parse_argv = function(command, argv, callback) {
  // builtin command is less
  var is_builtin = this._is_builtin(command);
  var option_root = is_builtin
    ? BUILTIN_OPTION_ROOT
    : this.option_root;

  var type = is_builtin 
    ? 'builtin'
    : 'normal';

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


Comfort.prototype._get_command = function(command, root, callback) {
  var file = node_path.join(root, command + '.js');
  fs.exists(file, function (exists) {
    if (!exists) {
      return this._command_not_found(command, callback);
    }

    var proto;
    try {
      proto = require(file);
    } catch(e) {
      return callback({
        code: 'FAIL_READ_COMMAND',
        message: 'Fails to read command file "' + file + '": ' + e.stack,
        data: {
          command: command,
          file: file,
          error: e
        }
      });
    }

    callback(null, proto);
  });
};


Comfort.prototype.run = function(argv, callback) {
  var self = this;
  this.parse(argv, function (err, result) {
    if (err) {
      return callback(err);
    }

    var command = result.command;

    if (result.type === 'plugin') {
      return self.plugin(command, result.argv.slice(3), callback);
    }

    self.commander(result.command, function (err, commander) {
      if (err) {
        return callback(err);
      }

      commander.run(result.options, callback);
    });
  });
};


// Try to run the given command from the `PATH`
Comfort.prototype.plugin = function(command, args, callback) {
  this.emit('plugin', {
    name: name,
    command: command,
    args: args
  });

  var name = this.options.name;
  var bin = name + '-' + command;
  var paths = process.env.PATH.split(':').map(function (path) {
    return node_path.resolve(path, bin);
  });

  this._try_files(paths, function (found) {
    if (!found) {
      return this._command_not_found(command, callback);
    }

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
  });
};


Comfort.prototype._try_files = function(files, callback) {
  async.eachSeries(files, function (file, done) {
    fs.exists(file, function (exists) {
      if (!exists) {
        return done(null);
      }

      fs.stat(file, function (err, stat) {
        if (!err && stat.isFile()) {
          return done(file);
        }

        done(null);
      });
    });
  }, callback);
};


function mix (receiver, supplier, override){
  var key;

  if(arguments.length === 2){
    override = true;
  }

  for(key in supplier){
    if(override || !(key in receiver)){
        receiver[key] = supplier[key]
    }
  }

  return receiver;
}


// @returns {Object|false}
Comfort.prototype.commander = function(command, callback) {
  // cache commander to improve performance
  var commander = this.__commander[command];
  if (commander) {
    return callback(null, commander);
  }

  var is_builtin = this._is_builtin(command);
  var command_root = is_builtin
    ? BUILTIN_COMMAND_ROOT
    : this.options.command_root;

  var self = this;
  this._get_command(command, command_root, function (err, proto) {
    if (err) {
      return callback(err);
    }

    // There might be more than one comfort instances,
    // so `Object.create` a new commander object to prevent reference pollution.
    var commander = self.__commander[command] = Object.create(proto);
    mix(commander, self.context);

    callback(null, commander);
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

  this.run(argv, function (err) {
    if (err) {
      self.emit('error', err);
    }
    
    self.emit('finish');
  });
};
