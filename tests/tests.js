var assert = require('assert');


var replaceCall = require("../tacify").privateFunctions.replaceCall;
var findDeepestCall = require("../tacify").privateFunctions.findDeepestCall;
var replaceDeepestCall = require("../tacify").privateFunctions.replaceDeepestCall;
var findDepthOfDeepestCall = require("../tacify").privateFunctions.findDepthOfDeepestCall;
var tacifyNested = require("../tacify").privateFunctions.tacifyNested;
var tacifyWhile = require("../tacify").privateFunctions.tacifyWhile;
var tacifyFor = require("../tacify").privateFunctions.tacifyFor;
var tacify = require("../tacify").tacify;
var parser = require('../parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;

var heredoc = require('heredoc')

suite("Helpers", function () {

  test('replaceCall should replace call at specified level with new node', function () {

    assert.deepEqual(replaceCall(parseSingleStat("foo().bar.baz();"), ["name", "__t0"], 4),
                     parseSingleStat("__t0.bar.baz();"));

  });

  test('findDepthOfDeepestCall should return depth of deepest call node', function () {

    assert.deepEqual(findDepthOfDeepestCall(parseSingleStat("foo().bar.baz();")), 4);

  });

  test('findDeepestCall should return the deepest call node', function () {

    assert.deepEqual(findDeepestCall(parseSingleStat("foo().bar.baz();")),
                     parseSingleStat("foo()")[1]);

  });

  suite("replaceDeepestCall", function () {

    test('should replace the deepest call node with the given one', function () {

      assert.deepEqual(replaceDeepestCall(parseSingleStat("foo().bar.baz();") ,["name", "__t0"]), 
                   parseSingleStat("__t0.bar.baz()"));

    });

    test('should handle single call cases', function () {

      assert.deepEqual(replaceDeepestCall(parseSingleStat("foo();") ,["name", "__t0"]), 
                   parseSingleStat("__t0"));

    });


    test('should handle proper order of arguments', function () {

      assert.deepEqual(replaceDeepestCall(parseSingleStat("foo(baz(), x, bar())"),["name", "__t0"]), 
                   parseSingleStat("foo(__t0, x, bar())"));

    });
   
  });

  
});

suite("tacifyNested", function () {

  test("should tacify dependent calls", function () {
    assert.deepEqual(tacifyNested(parse("x = obj.bar().baz();")), 
                     parse("var __t0 = obj.bar(); x = __t0.baz();"));
  });


  test("should not tacify nodes with no calls", function () {
    assert.deepEqual(tacifyNested(parse("x = obj.bar.baz();")), 
                     parse("x = obj.bar.baz();"));
  });

  test("should tacify nested calls", function () {
    assert.deepEqual(tacifyNested(parse("foo(baz(), x, bar())")), 
             parse("var __t0 = baz(); var __t1 = bar(); foo(__t0, x, __t1);"));
  }); 

  test("should tacify object literal calls in order", function () {
    assert.deepEqual(tacifyNested(parse("var x = { foo: bar(), bin: baz() };")), 
             parse("var __t0 = bar(); var x = { foo : __t0 , bin: baz() };"));


  }); 

});


suite("tacifyWhile", function () {

  test("should tacify conditional but not block", function () {

    assert.deepEqual(tacifyWhile(parseSingleStat("while(foo() < 1){bar();}")), 
                     parse("var __t0 = foo(); while(__t0 < 1){bar(); var __t0 = foo(); }"));
  });

});



suite("tacifyFor", function () {

  test("should tacify conditionals",  function () {
    assert.deepEqual(tacifyFor(parseSingleStat("for(var i = bar();foo() < 1; i = baz()){x = 2;}")), 
                    parse("var __t0 = bar(); var __t1 = foo(); var __t2 = baz(); \
                      for(var i = __t0; __t1 < 1; i = __t2){ \
                        x = 2; var __t0 = bar(); var __t1 = foo(); var __t2 = baz()}"));
  });

  test("should tacify nested calls in conditionals", function () {
    assert.deepEqual(tacifyFor(parseSingleStat("for(var i = 0; foo() < 1; i = baz().bar()){x = 2;}")), 
                    parse("var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); \
                      for(var i = 0; __t0 < 1; i = __t2){ \
                        x = 2; var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); }"));
  });

});

suite("tacify", function () {
  test("tacify should work with nested loops", function () {

   var input = parse(heredoc(function () {/*
	                    w = 3;
                      while(foo()){
                        x = bar().baz();
                        var y = bar().baz();
                        for(var i = 1; i < foo(); i = {x: bar()}){
                          z = 3;
                        }
                      }
                      */}));

  var expected = parse(heredoc(function () {/*
                      w = 3;
                      var __t0 = foo();
                      while(__t0){
                        var __t0 = bar(); 
                        x = __t0.baz();
                        var __t0 = foo();
                        var __t1 = bar();
                        for(var i = 1; i < __t0; i = {x: __t1}){
                          z = 3;
                          var __t0 = foo();
                          var __t1 = bar();
                        }
                        var __t0 = foo();
                      }
 */ }));  

  assert.deepEqual(tacify(input), expected);

  });
});
