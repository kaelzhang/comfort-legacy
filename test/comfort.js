'use strict';

var comfort = require('../');
var expect = require('chai').expect;

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

            expect(e.err).not.to.equal(null);
            expect(e.command).to.equal('blah');
            expect(e.name).to.equal('abc');
        });
    });
});