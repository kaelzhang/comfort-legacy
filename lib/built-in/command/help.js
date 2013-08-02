'use strict';

module.exports = help;

function help(options, callback) {
    var command = options.command;

    if(command === '*'){
        all_help(options.options);

    }else{
        var exists = fs.exists( options.options.option_root, command + '.js' );

        if(exists){
            options.detail ? 
                detail_command_help(command, options.options) : 
                quick_command_help(command, options.options);
        }else{
            no_command_info(command, options.options);
        } 
    }

    callback && callback();
};

var fs = require('fs-sync');
var node_path = require('path');
var node_url = require('url');
var typo = require('typo');

var REGEX_REPLACE_EXTENSION = /\.js$/;

function toArray(subject){
    return Array.isArray(subject) ? subject : [subject];
};

function print(lines, data, config){
    lines = toArray(lines);

    config = config || {};

    lines.forEach(function(line) {
        config.prefix && process.stdout.write(config.prefix);
        typo.log(line, data);
    });
}

function get_command_list(options){
    return fs.expand('*.js', {
        cwd: options.command_root
    
    }).map(function(command) {
        return command.replace(REGEX_REPLACE_EXTENSION, '');
    });
}

function get_opt(command, options){
    return require( node_path.join(options.option_root, command) );
}

function all_help(options){
    print([
        options.info ? '\n' + options.info + '\n': '',
        '{{bold Usage}}: {{name}} <command>',
        '',
        'where <command> is one of',
        '    ' + get_command_list(options).join(', '),
        '',
        '{{name}} --help            show {{name}} help',
        '{{name}} <command> -h      quick help on <command>',
        '{{name}} help <command>    help on <command> in detail',
        ''
    ], {
        name: options.name
    });
}

function quick_command_help(command, options){
    var opt = get_opt(command, options);

    var data = {
        name: options.name,
        command: command
    };

    print(opt.usage, data);

    print('View help info in detail, see: "{{name}} help {{command}}"', data);
}


function no_command_info(command, options){
    var command_exists = fs.exists( options.command_root, command + '.js' );
    var data = {
        name: options.name,
        command: command
    };

    if(command_exists){
        print('No help info for "{{ctx}} {{command}}"', data);
    }else{
        print('{{name}}: "{{command}}" is not a {{name}} command. See "{{name}} --help".', data);
    }
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
function parser_options_info(opt){
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

        if(option.type === node_path){
            unit = ' <{{underline path}}>';
            style_length = STYLE_LENGTH;
            offset += style_length;
            prefix = '--' + name + unit;
        
        }else if(option.type === node_url){
            unit = ' <{{underline url}}>';
            style_length = STYLE_LENGTH;
            offset += style_length;
            prefix = '--' + name + unit;
        
        }else if(option.type === Boolean){
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
        if( ('value' in option) && !(option.value instanceof Function) ){
            info += ' Default to `' + option.value + '`';
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

// show help in detail
function detail_command_help(command, options){
    var opt = get_opt(command, options);
    var FOUR_SPACES = '    ';

    print('{{bold name}} {{bold command}}{{info}}\n', {
        name: options.name,
        command: command,
        info: typo.template(opt.info ? ': ' + opt.info : '', {
            name: options.name
        })
    });

    print('{{bold Usage:}}');
    print(opt.usage, {
        name: options.name
    }, {
        prefix: FOUR_SPACES
    });

    var options_info = parser_options_info(opt);
    if(options_info.length){
        print('{{bold Options:}}');
        print(options_info, {
            name: options.name

        }, {
            prefix: FOUR_SPACES
        });
    }
}