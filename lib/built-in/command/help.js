'use strict';

var help = module.exports = {};

help.run = function (options, callback) {
    var command = options.command;

    if(command === '*'){
        this.display_all(options.options);

    }else{
        var exists = fs.exists( options.options.option_root, command + '.js' );

        if(exists){
            options.detail ? 
                this.detail_command_help(command, options.options) : 
                this.quick_command_help(command, options.options);
        }else{
            this.no_command_info(command, options.options);
        } 
    }

    callback && callback();
};

var fs = require('fs-sync');
var node_path = require('path');
var node_url = require('url');

var REGEX_REPLACE_EXTENSION = /\.js$/;


function toArray(subject){
    return Array.isArray(subject) ? subject : [subject];
};


help.display_all = function (options) {
    this.print([
        options.info ? '\n' + options.info + '\n': '',
        '{{bold Usage}}: {{name}} <command>',
        '',
        'where <command> is one of',
        '    ' + this.get_command_list(options).join(', '),
        '',
        '{{name}} --help            show {{name}} help',
        '{{name}} <command> -h      quick help on <command>',
        '{{name}} help <command>    help on <command> in detail',
        '{{name}} -v                print {{name}}\'s version',
        ''
    ], {
        name: options.name
    });
};


help.quick_command_help = function (command, options){
    var opt = get_opt(command, options);

    var data = {
        name: options.name,
        command: command
    };

    this.print(opt.usage, data);

    this.print('View help info in detail, see: "{{name}} help {{command}}"', data);
};


// show help in detail
help.detail_command_help = function (command, options){
    var opt = get_opt(command, options);
    var FOUR_SPACES = '    ';

    this.print('{{bold name}} {{bold command}}{{info}}\n', {
        name: options.name,
        command: command,
        info: this.logger.template(opt.info ? ': ' + opt.info : '', {
            name: options.name
        })
    });

    this.print('{{bold Usage:}}');
    this.print(opt.usage, {
        name: options.name
    }, {
        prefix: FOUR_SPACES
    });

    var options_info = this.parse_options_info(opt);
    if(options_info.length){
        this.print('{{bold Options:}}');
        this.print(options_info, {
            name: options.name

        }, {
            prefix: FOUR_SPACES
        });
    }
};


help.no_command_info = function (command, options){
    var command_exists = fs.exists( options.command_root, command + '.js' );
    var data = {
        name: options.name,
        command: command
    };

    if(command_exists){
        this.print('No help info for "{{ctx}} {{command}}"', data);
    }else{
        this.print('{{name}}: "{{command}}" is not a {{name}} command. See "{{name}} --help".', data);
    }
}


help.print = function (lines, data, config) {
    lines = toArray(lines);

    config = config || {};

    var self = this;

    lines.forEach(function(line) {
        config.prefix && process.stdout.write(config.prefix);
        self.logger.info( self.logger.template(line, data) );
    });
};


help.get_command_list = function (options){
    return fs.expand('*.js', {
        cwd: options.command_root
    
    }).map(function(command) {
        return command.replace(REGEX_REPLACE_EXTENSION, '');
    });
}


function get_opt(command, options){
    return require( node_path.join(options.option_root, command) );
}


function create_spaces(amount){
    var ret = '';
    var space = ' ';

    if(amount < 0){
        amount = 0;
    }

    while(amount --){
        ret += space;
    }

    return ret;
}

// -> 
// [
//     ['-a --abc', 'description']
// ]
help.parse_options_info = function (opt){
    var list = opt.options || {};
    // length of '{{underline }}'
    var STYLE_LENGTH = 14;
    

    var lines = Object.keys(list).map(function(name) {
        var option = list[name];
        var prefix;
        var unit = '';

        // The gap between
        var offset = 0;
        var style_length = 0;

        if(option.type === node_path || option.type === 'path'){
            unit = ' <{{underline path}}>';
            style_length = STYLE_LENGTH;
            offset += style_length;
            prefix = '--' + name + unit;
        
        }else if(option.type === node_url || option.type === 'url'){
            unit = ' <{{underline url}}>';
            style_length = STYLE_LENGTH;
            offset += style_length;
            prefix = '--' + name + unit;
        
        }else if(option.type === Boolean || option.type === 'boolean'){
            prefix = '--' + name + ', --no-' + name;
        
        }else{
            unit = ' <' + name + '>';
            prefix = '--' + name + unit;
        }

        if(option.short){
            prefix += ', -' + option.short + (
                    !option.short_pattern || option.short_pattern.length < 2 ?
                        (offset += style_length, unit) : 
                        '' 
                );
        }

        if(option.short_pattern){
            prefix += '(' + toArray(option.short_pattern).join(' ') + ')';
        }

        var info = option.info || '';

        // default value is a defined literal
        if( 'default' in option ){
            info += ' Default to `' + option.default + '`';
        }

        var arr = [prefix, info];
        arr.offset = offset;

        return arr;
    });

    // sort desc by length of prefix
    var sorted = lines.sort(function(a, b) {
        return - ( (a[0].length - a.offset) - (b[0].length - b.offset) );
    });

    if(lines.length){
        var max_prefix_length = sorted[0][0].length - sorted[0].offset;

        return lines.map(function(line) {
            // calculate table gap
            return line.join( create_spaces(4 + max_prefix_length - (line[0].length - line.offset) ) );
        });

    }else{
        return [];
    }
}

