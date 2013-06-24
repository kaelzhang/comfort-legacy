'use strict';

var nopt = require('nopt');
var opt = module.exports = {};

//  0       1           2          3
// ['node', __filename, <command>, [options] ]
opt.PARSE_ARGV_OFFSET = 3;

// cwd: {
//     short: 'c',
//    // '-c' is equivalent to '--cwd <default-short-value>' 
//     short_pattern: ['--cwd', '<default-short-value>'],

//    // @type {mixed|function()} default value or generator
//    // - {function()}
//     value: process.cwd(),
//     type: node_path
// }
opt.parse = function(argv, rules) {
    var parsed_rules = opt.parse_rules(rules);

    var parsed = opt.parse_argv(argv, parsed_rules);

    opt.apply_default(parsed, parsed_rules.defaults);

    return parsed;
};

opt.parse_rules = function(rules) {
    var opt_types = {};
    var short_hands = {};
    var default_values = {};

    var opts = Object.keys(rules.list);

    opts.forEach(function(key) {
        var option = rules.list[key];

        opt_types[key] = option.type;

        if(option.short){
            short_hands[option.short] = option.short_pattern || ('--' + key);
        }

        // options.value might be unreal
        if('value' in option){
            default_values[key] = option.value;
        }
    });

    return {
        types: opt_types,
        short: short_hands,
        defaults: default_values,
        options: opts
    };
};


opt.parse_argv = function(argv, rules, offset) {
    return nopt(rules.types, rules.short, argv, offset || opt.PARSE_ARGV_OFFSET);
};


opt.apply_default = function(args, defaults) {
    defaults = defaults || {};

    var key;
    var santitizer;

    for(key in defaults){
        santitizer = defaults[key];

        if(santitizer instanceof Function){
            args[key] = santitizer(args[key], args);
        
        }else if( !(key in args) ){
            args[key] = santitizer;
        }
    }

    return args;
};


// {
//     String: {
//         type: String,

//         // function(data, key, value)
//         validate: validateString
//     }
// }
opt.TYPES = nopt.typeDefs;

opt.clean = function(data, types, type_defs) {
    nopt.clean(data, types, type_defs || opt.TYPES);

    return data;
};

