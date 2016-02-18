'use strict'

// ### design
//  commander({
//      commands: './lib/command',
//      options: './opt/',
//      name: 'cortex'
//  }).cli()
module.exports = comfort
comfort.errorHandler = require('./lib/error-handler')

function comfort(options) {
  options || (options = {})
  return new Comfort(options)
}


var node_path = require('path')
var EE = require('events').EventEmitter
var util = require('util')
var spawn = require('spawns')
var fs = require('fs')
var expand = require('fs-expand')
var async = require('async')
var clean = require('clean')
var mix = require('mix2')

var BUILTIN_COMMAND_ROOT = node_path.join(__dirname, 'lib', 'built-in', 'command')
var BUILTIN_OPTION_ROOT = node_path.join(__dirname, 'lib', 'built-in', 'option')


function Comfort(options) {
  this.options = options

  this.commands = options.commands
  options.offset = 'offset' in options ? options.offset : 3

  this._context = {
    commander: this
  }
  this._commander_proto = {}
}

util.inherits(Comfort, EE)


Comfort.prototype.context = function (context) {
  mix(this._context, context)
  return this
}


// comfort().setup(async_setup_method).cli()
Comfort.prototype.setup = function(setup) {
  if (this.pending) {
    return this
  }

  if (typeof setup === 'function') {
    this.pending = true
    var done = function () {
      this.pending = false
      this.emit('setup')
    }.bind(this)

    setup.call(this, done)
  }

  return this
}


// 'abc.js' -> 'abc'
// 'abc.js.js' -> 'abc'
var REGEX_REPLACE_EXTENSION = /\..+$/

// Get all commands
Comfort.prototype._get_commands = function(callback) {
  if (this.commands) {
    return callback(null, this.commands)
  }

  var self = this
  expand('*.js', {
      cwd: this.options.command_root
  }, function (err, files) {
    if (err) {
      return callback(err)
    }

    var commands = files.map(function(command) {
      return command.replace(REGEX_REPLACE_EXTENSION, '')
    })
    // Cache it
    self.commands = commands
    callback(null, commands)
  })
}


Comfort.prototype.parse = function(argv, callback) {
  var self = this
  this._get_commands(function (err) {
    if (err) {
      return callback(err)
    }

    self._parse(argv, callback)
  })
}


var BUILTIN_COMMANDS = [
  'help',
  'version'
]

// parse a specified argument vector
// @param {Array} argv process.argv or something like that
// @param {function(err, result, details)} callback
// @param {boolean} strict if strict,
Comfort.prototype._parse = function(argv, callback, strict) {
  // argv ->
  // ['node', __dirname, '<command>', ...]
  var command = argv[2]
  var is_entry = !command

  var is_command = this._is_command(command)
  var is_normal = is_command && this._is_normal(command)
  var is_builtin = is_command && this._is_builtin(command)

  // Plugins
  ////////////////////////////////////////////////////////////////////////////////////
  // cortex <plugin> --version
  // cortex <plugin> -v
  // Plugin command needs special treatment.
  if (is_command && !is_normal && !is_builtin) {
    if (strict) {
      return this._command_not_found(command, callback)
    }

    return callback(null, {
      argv: argv,
      command: command,

      // 'normal', 'builtin', 'plugin'
      type: 'plugin'
    })
  }

  // Version
  ////////////////////////////////////////////////////////////////////////////////////
  if (
    command === 'version' ||
    ~argv.indexOf('-v') ||
    ~argv.indexOf('--version')
  ) {
    command = 'version'
    return callback(null, {
      argv: argv,
      command: command,
      options: {
        root: this.options.root
      },
      type: this._is_builtin(command)
        ? 'builtin'
        : 'normal'
    })
  }

  // Help -h, --help
  ////////////////////////////////////////////////////////////////////////////////////
  var index_h = argv.indexOf('-h')
  var index_help = argv.indexOf('--help')

  var help_extra_options = {
    commands      : this.commands,
    builtins      : BUILTIN_COMMANDS,
    name          : this.options.name,
    normal_root   : this.options.option_root,
    builtin_root  : BUILTIN_OPTION_ROOT
  }

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
    var command_for_help =
      index_h !== 2 &&
      index_help !== 2 &&
      argv[2]

    // Wrong usage
    // cortex --abc -h
    if (!this._is_command(command_for_help)) {
      command_for_help = null
    }

    command = 'help'

    if (is_entry) {
      this.emit('entry')
    }

    return callback(null, {
      argv: argv,
      command: command,
      type: this._is_builtin(command)
        ? 'builtin'
        : 'normal',
      options: mix({
        command: command_for_help,
        // if there's only root command, an `entrance` option will be added
        entry: is_entry
      }, help_extra_options)
    })
  }

  // Normal & Builtin
  ////////////////////////////////////////////////////////////////////////////////////
  this._parse_argv(command, argv, function (err, result) {
    if (err) {
      return callback(err)
    }

    if (command === 'help') {
      mix(result.options, help_extra_options)
    }

    callback(null, result)
  })
}


Comfort.prototype._is_command = function(command) {
  return command && command.indexOf('-') !== 0
}


Comfort.prototype._is_builtin = function(command) {
  return ~BUILTIN_COMMANDS.indexOf(command)
}


Comfort.prototype._is_normal = function(command) {
  return ~this.commands.indexOf(command)
}


Comfort.prototype._command_not_found = function(command, callback) {
  var name = this.options.name
  callback({
    code: 'COMMAND_NOT_FOUND',
    message: name + ': "' + command + '" is not a "' + name + '" command. See "' + name + ' --help".',
    data: {
      name: name,
      command: command
    }
  })
}


// Parse the argv of a normal or builtin command
Comfort.prototype._parse_argv = function(command, argv, callback) {
  // builtin command is less
  var is_builtin = this._is_builtin(command)
  var option_root = is_builtin
    ? BUILTIN_OPTION_ROOT
    : this.options.option_root

  var type = is_builtin
    ? 'builtin'
    : 'normal'

  var self = this
  this._get_option_rule(command, option_root, function (err, rule) {
    if (err) {
      return callback(err)
    }

    if (!rule) {
      return callback(null, {
        argv: argv,
        command: command,
        type: type,
        options: {}
      })
    }

    // parse argv
    clean({
      schema: rule.options,
      shorthands: rule.shorthands,
      offset: self.options.offset

    }).parse(argv, function(err, results, details) {
      callback(err, {
        command: command,
        options: results,
        argv: argv,
        type: type
      })
    })
  })
}


Comfort.prototype._get_option_rule = function(command, root, callback) {
  var file = node_path.join(root, command + '.js')
  fs.exists(file, function (exists) {
    if (!exists) {
      return callback(null, null)
    }

    var rule
    try {
      rule = require(file)
    } catch(e) {
      return callback({
        code: 'FAIL_READ_OPTION',
        message: 'Fails to read option file "' + file + '": ' + e.stack,
        data: {
          command: command,
          file: file,
          error: e
        }
      })
    }

    callback(null, rule)
  })
}


Comfort.prototype._get_command_proto = function(command, root, callback) {
  var file = node_path.join(root, command + '.js')
  var self = this
  fs.exists(file, function (exists) {
    if (!exists) {
      return self._command_not_found(command, callback)
    }

    var proto
    try {
      proto = require(file)
    } catch(e) {
      return callback({
        code: 'FAIL_READ_COMMAND',
        message: 'Fails to read command file "' + file + '": ' + e.stack,
        data: {
          command: command,
          file: file,
          error: e
        }
      })
    }

    callback(null, proto)
  })
}


// Run from argv
Comfort.prototype.run = function(argv, callback) {
  var self = this
  this.parse(argv, function (err, result) {
    if (err) {
      return callback(err)
    }

    var command = result.command

    if (result.type === 'plugin') {
      return self._plugin(command, result.argv.slice(3), callback)
    }

    self.commander(command, function (err, commander) {
      if (err) {
        return callback(err)
      }

      commander.run(result.options, callback)
    })
  })
}


// Try to run the given command from the `PATH`
Comfort.prototype._plugin = function(command, args, callback) {
  this.emit('plugin', {
    name: name,
    command: command,
    args: args
  })

  var name = this.options.name
  var bin = name + '-' + command
  var paths = process.env.PATH.split(':').map(function (path) {
    return node_path.resolve(path, bin)
  })

  var self = this
  this._try_files(paths, function (found) {
    if (!found) {
      return self._command_not_found(command, callback)
    }

    var plugin = spawn(found, args, {
      stdio: 'inherit',
      // `options.customFds` is now DEPRECATED.
      // just for backward compatibility.
      customFds: [0, 1, 2]
    })

    // for node <= 0.6, 'close' event often could not be triggered
    plugin.on('exit', function(code) {
      callback(code)
    })
  })
}


Comfort.prototype._try_files = function(files, callback) {
  async.eachSeries(files, function (file, done) {
    fs.exists(file, function (exists) {
      if (!exists) {
        return done(null)
      }

      fs.stat(file, function (err, stat) {
        if (!err && stat.isFile()) {
          return done(file)
        }

        done(null)
      })
    })
  }, callback)
}


// @returns {Object|false}
Comfort.prototype.commander = function(command, callback) {
  function create_commander(_proto) {
    var proto = {}
    mix(proto, EE.prototype)
    mix(proto, _proto)

    var commander = {}
    commander.__proto__ = proto

    // Equivalent to `constructor.call(this)`
    mix(commander, self._context)

    // There might be more than one comfort instances,
    // so `Object.create` a new commander object to prevent reference pollution.
    // Equivalent to prototype inheritance
    callback(null, commander)
  }

  // cache commander to improve performance
  var proto = this._commander_proto[command]
  if (proto) {
    return create_commander(proto)
  }

  var is_builtin = this._is_builtin(command)
  var command_root = is_builtin
    ? BUILTIN_COMMAND_ROOT
    : this.options.command_root

  var self = this
  this._get_command_proto(command, command_root, function (err, proto) {
    if (err) {
      return callback(err)
    }

    self._commander_proto[command] = proto
    create_commander(proto)
  })
}


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
Comfort.prototype._cli = function(argv) {
  argv = argv || process.argv

  var self = this
  this.run(argv, function (err) {
    if (err) {
      return self.emit('error', err)
    }

    self.emit('finish')
  })
}


Comfort.prototype.cli = function(argv) {
  if (this.pending) {
    this.on('setup', function () {
      this._cli(argv)
    }.bind(this))
  } else {
    this._cli(argv)
  }
}
