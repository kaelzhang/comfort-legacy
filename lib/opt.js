'use strict';

var nopt = require('nopt');

var opt = module.exports = {};



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

    opt.santitize(parsed, parsed_rules.santitizers);

    return parsed;
};

opt.parse_rules = function(rules) {
    var known_opts = {};
    var short_hands = {};
    var default_values = {};

    var opts = Object.keys(rules.list);

    opts.forEach(function(key) {
        var option = rules.list[key];

        known_opts[key] = option.type;

        if(option.short){
            short_hands[option.short] = option.short_pattern || ('--' + key);
        }

        // options.value might be unreal
        if('value' in option){
            default_values[key] = option.value;
        }
    });

    return {
        known: known_opts,
        short: short_hands,
        santitizers: default_values,
        offset: rules.offset,
        opts: opts
    };
};


opt.parse_argv = function(argv, rules) {
    return nopt(rules.known, rules.short, argv, rules.offset);
};


opt.santitize = function(args, santitizers) {
    santitizers = santitizers || {};

    var key;
    var santitizer;

    for(key in santitizers){
        santitizer = santitizers[key];

        if(santitizer instanceof Function){
            args[key] = santitizer(args[key], args);
        
        }else if( !(key in args) ){
            args[key] = santitizer;
        }
    }

    return args;
};

