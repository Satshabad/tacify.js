var assert = require('assert');


var spliceArrays = require("../tacify").privateFunctions.spliceArrays;
var replaceCall = require("../tacify").privateFunctions.replaceCall;
var findDeepestCall = require("../tacify").privateFunctions.findDeepestCall;
var replaceDeepestCall = require("../tacify").privateFunctions.replaceDeepestCall;
var findDepthOfDeepestCall = require("../tacify").privateFunctions.findDepthOfDeepestCall;
var tacifyStatement = require("../tacify").privateFunctions.tacifyStatement;
var tacifyWhile = require("../tacify").privateFunctions.tacifyWhile;
var tacifyFor = require("../tacify").privateFunctions.tacifyFor;
var convertIfElseToIf = require("../tacify").privateFunctions.convertIfElseToIf;
var isNodeTypeOf = require("../tacify").privateFunctions.isNodeTypeOf;
var numberOfCalls = require("../tacify").privateFunctions.numberOfCalls;
var tacify = require("../tacify").tacify;
var parser = require('../parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;

var heredoc = require('heredoc')

var isTacified = function (node) {
  for (var i = 0, l = node.length; i < l; i ++) {
    var statement = node[i];

    if (isNodeTypeOf(node[i], 'stat')){

      return numberOfCalls(node[i]) <= 1;

    }

    if(isNodeTypeOf(node[i], 'var')){
      if (node[i][1].length > 1){
        return false;
      }

      if (node[i][1].length == 1){
        return numberOfCalls(node[i]) <= 1;
      }
    }
      
    if (isNodeTypeOf(node[i], 'if')){

      if (numberOfCalls(node[i][1]) <= 1){
        return false;
      }
      
      // and if-else is not in tac form
      if (isNodeTypeOf(node[i][3], 'if')){
        return false;
      }

      return isTacified(node[i][2]) && isTacified(node[i][3])

    } 


    if (isNodeTypeOf(node[i], 'for')){

      if (numberOfCalls(node[i][1]) <= 1){
        return false;
      }

      if (numberOfCalls(node[i][2]) <= 1){
        return false;
      }

      if (numberOfCalls(node[i][3]) <= 1){
        return false;
      }

      return isTacified(node[i][4]) 
    }

    if (isNodeTypeOf(node[i], 'while')){

      if (numberOfCalls(node[i][1]) <= 1){
        return false;
      }

      return isTacified(node[i][2]) 
    }
    
  }
  
};


suite("isTacifyed (test of a test helper)", function () {

  test('should verify that ifs are tacified', function () {

    var input = parse(heredoc(function () {/*
       var __t0 = foo();
       if (__t0 || bar()) {
          x = 3;
        } 
    */}));
    assert.ok(isTacified(input))


  });

  test('should verify that fors are tacified', function () {

    var input = parse(heredoc(function () {/*
        var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar();
        for(var i = 0; __t0 < 1; i = __t2){
          x = 2;
          var __t0 = foo(); 
          var __t1 = baz(); 
          var __t2 = __t1.bar();
        }
    */}));
    assert.ok(isTacified(input))


  });

  test('should verify that whiles are tacified', function () {

    var input = parse(heredoc(function () {/*
      var __t0 = foo(); 
      while(__t0 < 1){
        bar(); 
        var __t0 = foo(); 
        }
    */}));
    assert.ok(isTacified(input))


  });

 test('should verify that if-else are NOT tacified', function () {

    var input = parse(heredoc(function () {/*

    if (foo()){
    } else if (bar()){
    }
    */}));
    assert.ok(!isTacified(input))
  });

  test('should verify that nested calls are NOT tacified', function () {

    var input = parse(heredoc(function () {/*
      x = foo(bar())
    */}));
    assert.ok(!isTacified(input))
  });

  test('should verify that multiple vars are NOT tacified', function () {

    var input = parse(heredoc(function () {/*
      var x=3, y = 4;
    */}));
    assert.ok(!isTacified(input))
  });

 test('should verify that single stats are tacified', function () {

    var input = parse(heredoc(function () {/*
      var x=3;
    */}));
    assert.ok(isTacified(input))
  });



});

suite("Helpers", function () {

  test('replaceCall should replace call at specified level with new node', function () {

    assert.deepEqual(replaceCall(parseSingleStat("foo().bar.baz();"), ["name", "__t0"], 4),
                     parseSingleStat("__t0.bar.baz();"));

  });

  test('replaceCall should handle single call cases', function () {

      assert.deepEqual(replaceCall(parseSingleStat("foo();")[1] ,["name", "__t0"], 0), 
                   parseSingleStat("__t0")[1]);

  });

  test('findDepthOfDeepestCall should return depth of deepest call node', function () {

    assert.deepEqual(findDepthOfDeepestCall(parseSingleStat("foo().bar.baz();")), 4);

  });

  test('findDeepestCall should return the deepest call node', function () {

    assert.deepEqual(findDeepestCall(parseSingleStat("foo().bar.baz();")),
                     parseSingleStat("foo()")[1]);

  });

  test('findDeepestCall should handle single call cases', function () {

      assert.deepEqual(findDeepestCall(parseSingleStat("foo();")), 
                   parseSingleStat("foo();")[1]);

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

  test("spliceArrays should put all the elements of an array into another array", function () {
    assert.deepEqual(spliceArrays([1,2,6,7,8], [3,4,5], 2), [1,2,3,4,5,6,7,8]); 
  });

  test("spliceArrays should do nothing when given empty array ", function () {
    assert.deepEqual(spliceArrays([1,2,6,7,8], [], 2), [1,2,6,7,8]); 
  });
  
});

suite("tacifyStatement", function () {

  test("should tacify dependent calls", function () {
    assert.deepEqual(tacifyStatement(parseSingleStat("x = obj.bar().baz();")), 
                     parse("var __t0 = obj.bar(); x = __t0.baz();"));
  });


  test("should not tacify nodes with no calls", function () {
    assert.deepEqual(tacifyStatement(parseSingleStat("x = obj.bar.baz();")), 
                     parse("x = obj.bar.baz();"));
  });

  test("should tacify nested calls", function () {
    assert.deepEqual(tacifyStatement(parseSingleStat("foo(baz(), x, bar())")), 
             parse("var __t0 = baz(); var __t1 = bar(); foo(__t0, x, __t1);"));
  }); 

  test("should tacify object literal calls in order", function () {
    assert.deepEqual(tacifyStatement(parseSingleStat("var x = { foo: bar(), bin: baz() };")), 
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

suite("tacifyIf", function () {

  test("should tacify ifs with more than 1 call in cond expression",function () {
    var input = parse(heredoc(function () {/*

      if (foo() || bar()) {
        x = 3;
      } 
      
   */ }));

    var expected = parse(heredoc(function () {/*
       var __t0 = foo();
       if (__t0 || bar()) {
          x = 3;
        } 
    */}));
    assert.deepEqual(tacify(input), expected)

 });

});
suite("convertIfElseToIf", function () {

 test("should convert if else chain to nested ifs",function () {
 
    var input = parseSingleStat(heredoc(function () {/*

      if (foo()) {
        x = 3;
        } else if (bar()) {
          x = 4;
        } else {
          x = 5;
      }
      
   */ }));

    var expected = parseSingleStat(heredoc(function () {/*

      if (!foo()) {
        if (!bar()){
          x = 5;
          } else {
            x = 4;
          }
        } else {
          x = 3;
      }
      
    */}));

    assert.deepEqual(convertIfElseToIf(input), expected)
  });
  
  test("should convert if else chain to nested ifs, even when no trailing else",function () {

    var input = parseSingleStat(heredoc(function () {/*

      if (foo()) {
        x = 3;
        } else if (bar()) {
          x = 4;
        }      
   */ }));

    var expected = parseSingleStat(heredoc(function () {/*

      if (!foo()) {
        if (!bar()){
          } else {
            x = 4;
          }
        } else {
          x = 3;
      }
      
    */}));

    assert.deepEqual(convertIfElseToIf(input), expected)
  });



});

suite("tacify", function () {
  test("tacify should work with a for nested in a while", function () {

   var input = parse(heredoc(function () {/*
                      while(foo()){
                        for(var i = 1; i < foo(); i = {x: bar()}){
                        }
                      }
                      */}));

  var expected = parse(heredoc(function () {/*
                      var __t0 = foo();
                      while(__t0){
                        var __t0 = foo();
                        var __t1 = bar();
                        for(var i = 1; i < __t0; i = {x: __t1}){
                          var __t0 = foo();
                          var __t1 = bar();
                        }
                        var __t0 = foo();
                      }
    */})); 


    assert.deepEqual(tacify(input), expected);

  });

  test("tacify should work with multiple statements ", function () {

   var input = parse(heredoc(function () {/*
	                      w = 3;
                        x = bar().baz();
                        var y = bar().baz();
                      */}));

  var expected = parse(heredoc(function () {/*
                        w = 3;
                        var __t0 = bar(); 
                        x = __t0.baz();
                        var __t0 = bar();
                        var y = __t0.baz();
 */ })); 


  assert.deepEqual(tacify(input), expected);

  });


  test("tacify should work with a while nested in a for", function () {

   var input = parse(heredoc(function () {/*
                        for(var i = 1; i < foo(); i = {x: bar()}){
                          while(foo()){
                          }
                        }
                      */}));

  var expected = parse(heredoc(function () {/*
                      var __t0 = foo();
                      var __t1 = bar();
                      for(var i = 1; i < __t0; i = {x: __t1}){
                        var __t0 = foo();
                        while(__t0){
                          var __t0 = foo();
                        }
                        var __t0 = foo();
                        var __t1 = bar();
                      }

    */})); 


    assert.deepEqual(tacify(input), expected);

  });
});
