'use strict';

var help = exports;

help.run = function(options, callback) {
  var command = options.command;

  if (!command || command.indexOf('-') === 0) {
    return this.display_all(options, callback);
  }

  if (
    !~options.commands.indexOf(command) &&
    !~options.builtins.indexOf(command)
  ) {
    this.print([
      '"{{command}}" is not a "{{name}}" command.',
      'Maybe you could try `{{name}} {{command}} -h`'
    ], {
      name: options.name,
      command: command
    });

    return callback(null);
  }

  if (command === 'version') {
    this.print('Use `{{name}} -v` instead.', {
      name: options.name
    });
    return callback(null);
  }

  this.detail_command_help(options, callback);
};


var fs = require('fs');
var node_path = require('path');
var node_url = require('url');

var REGEX_REPLACE_EXTENSION = /\.js$/;


function toArray(subject) {
  return Array.isArray(subject) ? subject : [subject];
};


help.display_all = function(options, callback) {
  this.print([
    options.info ? '\n' + options.info + '\n' : '',
    '{{bold Usage}}: {{name}} <command>',
    '',
    'where <command> is one of',
    '    ' + options.commands.join(', '),
    '',
    '{{name}} --help            show {{name}} help',
    '{{name}} <command> -h      quick help on <command>',
    '{{name}} help <command>    help on <command> in detail',
    '{{name}} -v                print {{name}}\'s version',
    ''
  ], {
    name: options.name
  });

  callback(null);
};


// show help in detail
help.detail_command_help = function(options, callback) {
  var command = options.command;
  var root = ~options.builtins.indexOf(command)
    ? options.builtin_root
    : options.normal_root;

  var opt;
  try {
    opt = get_opt(command, root);
  } catch(e) {
    this.print('No help info for "{{ctx}} {{command}}"', data);
    return callback(null);
  }
  
  var FOUR_SPACES = '    ';

  this.print('{{bold name}} {{bold command}}{{info}}\n', {
    name: options.name,
    command: command,
    info: this.logger.template(opt.info ? ': ' + opt.info : '', {
      name: options.name
    })
  });

  if (opt.usage) {
    this.print('{{bold Usage:}}');
    this.print(opt.usage, {
      name: options.name
    }, {
      prefix: FOUR_SPACES
    });
  }

  var options_info = this.parse_options_info(opt);
  if (options_info.length) {
    this.print('{{bold Options:}}');
    this.print(options_info, {
      name: options.name

    }, {
      prefix: FOUR_SPACES
    });
  }
};


help.print = function(lines, data, config) {
  lines = toArray(lines);

  config = config || {};

  var self = this;

  lines.forEach(function(line) {
    config.prefix && process.stdout.write(config.prefix);
    self.logger.info(self.logger.template(line, data));
  });
};


function get_opt(command, root) {
  return require(node_path.join(root, command));
}


function create_spaces(amount) {
  var ret = '';
  var space = ' ';

  if (amount < 0) {
    amount = 0;
  }

  while (amount--) {
    ret += space;
  }

  return ret;
}

// -> 
// [
//     ['-a --abc', 'description']
// ]
help.parse_options_info = function(opt) {
  var list = opt.options || {};
  // length of '{{underline }}'
  var STYLE_LENGTH = 14;


  var lines =
    Object.keys(list)
    .map(function(name) {
      var option = list[name];
      var prefix;
      var unit = '';

      if (option.enumerable === false) {
        return false;
      }

      // The gap between
      var offset = 0;
      var style_length = 0;

      if (option.type === node_path || option.type === 'path') {
        unit = ' <{{underline path}}>';
        style_length = STYLE_LENGTH;
        offset += style_length;
        prefix = '--' + name + unit;

      } else if (option.type === node_url || option.type === 'url') {
        unit = ' <{{underline url}}>';
        style_length = STYLE_LENGTH;
        offset += style_length;
        prefix = '--' + name + unit;

      } else if (option.type === Boolean || option.type === 'boolean') {
        prefix = '--' + name + ', --no-' + name;

      } else {
        unit = ' <' + name + '>';
        prefix = '--' + name + unit;
      }

      if (option.short) {
        prefix += ', -' + option.short + (!option.short_pattern || option.short_pattern.length < 2 ?
          (offset += style_length, unit) :
          ''
        );
      }

      if (option.short_pattern) {
        prefix += '(' + toArray(option.short_pattern).join(' ') + ')';
      }

      var info = option.info || '';

      // default value is a defined literal
      if ('default' in option) {
        info += ' Default to `' + option.
        default +'`';
      }

      var arr = [prefix, info];
      arr.offset = offset;

      return arr;
    })
    .filter(Boolean);

  // sort desc by length of prefix
  var sorted = lines.sort(function(a, b) {
    return -((a[0].length - a.offset) - (b[0].length - b.offset));
  });

  if (lines.length) {
    var max_prefix_length = sorted[0][0].length - sorted[0].offset;

    return lines.map(function(line) {
      // calculate table gap
      return line.join(create_spaces(4 + max_prefix_length - (line[0].length - line.offset)));
    });

  } else {
    return [];
  }
};
