'use strict';

var comfort = require('../');
var expect = require('chai').expect;

var node_path = require('path');

var create = require('./fixtures/create');

function parse (argv, callback) {
    return create().parse(argv.split(' '), callback);
}


function cli (argv) {
    var c = create();
    c.cli(argv.split(' '));
    return c;
}


describe("util methods", function(){
    it(".parse(argv, callback)", function(done){
        parse('node xxx blah -f --nw --retry 12', function(err, result, details){
            done();

            expect(err).not.to.equal(null);
            expect(result.command).to.equal('blah');

            var opt = result.opt;

            expect(opt.force).to.equal(true);

            // the error is blame to --retry
            expect(details.retry.error).not.to.equal(null);
        });
    });
});


describe("cli methods", function(){
    it(".cli(argv)", function(done){
        cli('node xxx blah -f --nw --retry 12').on('complete', function(e){
            done();

            expect(e.error).not.to.equal(null);
            expect(e.command).to.equal('blah');
            expect(e.name).to.equal('comforttest');
        });
    });

    it("support plugin", function(done){
        var test_path = node_path.resolve('test', 'fixtures', 'plugin');

        test_path += ':';

        var origin_PATH = process.env.PATH;

        if ( ! ~ origin_PATH.indexOf(test_path) ) {
            process.env.PATH = test_path + process.env.PATH;
        }

        var c = create().on('complete', function(e){
            done();
            process.env.PATH = origin_PATH;

            console.log(String(e.error), typeof e.error, e.error.code, e.error.message, e.error.data);

            // exit code is not ok
            expect(e.error).to.equal(2);

        }).on('plugin', function(e){
            expect(e.command).to.equal('abc');
        });

        c.cli('node xxx abc -f --nw --retry 12'.split(' '));
    });
});


describe("legacy node 0.6 & 0.8", function(){
    it("no error", function(done){
        cli('node xxx blah -f --nw --retry 12');
        done();
    });
});