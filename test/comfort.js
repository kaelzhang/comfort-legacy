'use strict';

var comfort = require('../');
var expect = require('chai').expect;

var node_path = require('path');

var create = require('./fixtures/create');

function parse(argv, callback) {
  return create().parse(argv.split(' '), callback);
}


function cli(argv) {
  var c = create();
  c.cli(argv.split(' '));
  return c;
}


describe("util methods", function() {
  it(".parse(argv, callback)", function(done) {
    parse('node xxx blah -f --nw --retry 12', function(err, result) {
      done();

      expect(err).not.to.equal(null);
    });
  });
});


describe("cli methods", function() {
  it(".cli(argv)", function(done) {
    cli('node xxx blah -f --nw --retry 12').on('finish', function() {
      // fail
      expect(true).to.equal(false);
      done();
    }).on('error', function() {
      done();
    });
  });

  it("support plugin", function(done) {
    var test_path = node_path.resolve('test', 'fixtures', 'plugin');

    test_path += ':';

    var origin_PATH = process.env.PATH;

    if (!~origin_PATH.indexOf(test_path)) {
      process.env.PATH = test_path + process.env.PATH;
    }

    if (~process.env.PATH.indexOf(test_path)) {
      var c = create()
        .on('finish', function(e) {
          done();
          process.env.PATH = origin_PATH;

          // should not be fired
          expect(false).to.equal(true);

        }).on('plugin', function(e) {
          expect(e.command).to.equal('abc');

        }).on('error', function(e) {
          process.env.PATH = origin_PATH;
          expect(e).to.equal(2);
          done();
        });

      c.cli('node xxx abc -f --nw --retry 12'.split(' '));

    } else {
      console.log('`process.env.PATH` could not be modified, skip checking');
      done();
    }
  });
});


describe("prevent pollution for a certain command", function() {
  it("independent instances", function(done) {
    var one = create().on('finish', function(e) {
      var two = create().on('finish', function(e) {
        done();
      });

      two.cli('node xxx polute -f --nw --retry 12'.split(' '));
    });

    one.cli('node xxx polute -f --nw --retry 12'.split(' '));
  });
});


describe("legacy node 0.6 & 0.8", function() {
  it("no error", function(done) {
    cli('node xxx blah -f --nw --retry 12').on('error', function (err) {
      expect(err).not.to.equal(null);
      done();
    });
  });
});


describe("with setup", function(){
  it("should delay running", function(done){
    var flag = false;
    function setup (done) {
      setTimeout(function () {
        flag = true;
        done();
      }, 50);
    }

    var one = create().on('finish', function(e) {
      expect(flag).to.equal(true);
      done();
    });

    one.setup(setup).cli('node xxx polute -f --nw --retry 12'.split(' '));
    expect(flag).to.equal(false);
  });
});


describe(".commander()", function(){
  it("run command", function(done){
    var c = create();
    c.commander('blah', function (err, commander) {
      expect(err).to.equal(null);
      commander.run({}, function(err, options){
        expect(err).to.equal(null);
        expect(options.blah).to.equal(true);
        done();
      });
    });
  });

  it("command event", function(done){
    var c = create();
    c.commander('blah', function (err, commander) {
      expect(err).to.equal(null);
      commander.on('event', function (options) {
        expect(options.blah).to.equal(true);
        done();
      });
      commander.run({}, function(){});
    });
  });
});
