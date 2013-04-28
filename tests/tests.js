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
var convertSwitchToIfs = require("../tacify").privateFunctions.convertSwitchToIfs;
var tacify = require("../tacify").tacify;
var parser = require('../parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;

var heredoc = require('heredoc');
var vm = require('vm');

var isEquivalentCodeWithContext = function (beforeCode, afterCode, context) {


  // here we deal with the ugliness that prevents functions defined in the context from using the context
  var functionDefs = []

  for (var prop in context){
    if (typeof context[prop] === "function"){
      functionDefs.push('var ' + prop + '=' + context[prop].toString())
      delete context[prop]
    }
  }

  for (var i = 0, l = functionDefs.length; i < l; i ++) {
    beforeCode = functionDefs[i] +  '\n' + beforeCode;
    afterCode = functionDefs[i] + '\n' + afterCode;
  }


  var beforeContext = vm.createContext(context);
  var afterContext = vm.createContext(context);
  vm.runInContext(beforeCode, beforeContext);
  vm.runInContext(afterCode, afterContext);


  return isAllFromFirstObjInSecond(beforeContext, afterContext);
 
};

var isAllFromFirstObjInSecond = function(first, second){
  for (var prop in first){

    if (!(prop in second)){
      return false;
    } else if (typeof second[prop] === 'function' && typeof first[prop] === 'function'){
      if (second[prop].toString() !== first[prop].toString()){
        return false;
      }
    } else if (typeof second[prop] === 'object' && typeof first[prop] === 'object'){
      // ick, verifying that all from before is in after all the way down? no way 
        if(!isAllFromFirstObjInSecond(first[prop], second[prop])){
          return false;
        }
    } else if (second[prop] !== first[prop]){
      return false; 
    }
  }
  return true;
}

suite("isEquivalentCodeWithContext (test of a test helper)", function () {

  test('should verify that the same code is equivalent', function () {

    assert.ok(isEquivalentCodeWithContext('x=2', 'x=2', {}));

  });

  test('should verify that the diff code is diff', function () {

    assert.ok(!isEquivalentCodeWithContext('x=3', 'x=2', {}));

  });


});



var isTacified = function (node) {
  var isTacified = true;

  var inner = function (node) {

    if (node === undefined || node === null || 
         typeof node === "number" || typeof node === "boolean" || 
         typeof node === "string"){
      return;
    }

    if (isNodeTypeOf(node, 'stat')){

      if (numberOfCalls(node) > 1){
        isTacified = false;
      }

    }

    if(isNodeTypeOf(node, 'var')){

      if (numberOfCalls(node) > 1){
        isTacified = false;
      }
    }
      
    if (isNodeTypeOf(node, 'if')){

      if (numberOfCalls(node[1]) > 1){
        isTacified = false;
      }
      
      // and if-else is not in tac form
      if (isNodeTypeOf(node[3], 'if')){
        isTacified = false;
      }


      inner(node[2]);
      inner(node[3]);

    } 

    if (isNodeTypeOf(node, 'for')){

      if (numberOfCalls(node[1]) > 0){
        isTacified = false;
      }

      if (numberOfCalls(node[2]) > 0){
        isTacified = false;
      }

      if (numberOfCalls(node[3]) > 0){
        isTacified = false;
      }

      inner(node[4]) 
    }

    if (isNodeTypeOf(node, 'while')){

      if (numberOfCalls(node[1]) > 0){
        isTacified = false;
      }

      inner(node[2]) 
    }

    for (var i = 0, l = node.length; i < l; i ++) {
     inner(node[i])
    }

  }  

  inner(node);
  return isTacified;
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

  test('should verify that bad ifs are not tacified', function () {

    var input = parse(heredoc(function () {/*
       var __t0 = foo();
       if (__t0 || bar(baz())) {
          x = 3;
        } 
    */}));
    assert.ok(!isTacified(input))


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

  test('should verify that bad fors are not tacified', function () {

    var input = parse(heredoc(function () {/*
        var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar();
        for(var i = 0; baz() < 1; i = bar()){
          x = 2;
          var __t0 = foo(); 
          var __t1 = baz(); 
          var __t2 = __t1.bar();
        }
    */}));
    assert.ok(!isTacified(input))


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

  test('should verify that bad whiles are not tacified', function () {

    var input = parse(heredoc(function () {/*
      var __t0 = foo(); 
      while(bar(baz) < 1){
        bar(); 
        var __t0 = foo(); 
        }
    */}));
    assert.ok(!isTacified(input))


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

 test('should verify that single stats are tacified', function () {

      var input = parse(heredoc(function () {/*
      var x=3;
    */}));
    assert.ok(isTacified(input))
  });

});

suite("Helpers", function () {

  test('numberOfCalls should count the number of calls in a node', function () {

    assert.equal(numberOfCalls(parseSingleStat("foo().bar.baz();")), 2);

  });


  test('numberOfCalls should return 0 when there are no calls', function () {

    assert.equal(numberOfCalls(parseSingleStat("x = 4")), 0);

  });

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
    var context = { obj : { bar : function(){ return { baz: function(){}}}}};
    var input = "x = obj.bar().baz();";
    var result = tacifyStatement(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });

  test("should not tacify nodes with no calls", function () {
    var context = { obj : { bar : function(){ return { baz: function(){}}}}};
    var input = "x = obj.bar().baz();";
    var result = tacifyStatement(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });

  test("should tacify nested calls", function () {

    var context = { x : 4, bar : function(){}, foo:function(a,b,c){}, baz:function(){}};
    var input = "foo(baz(), x, bar())";
    var result = tacifyStatement(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  }); 

  test("should tacify object literal calls in order", function () {

    var context = { bar : function(){}, baz:function(){}};
    var input = "var x = { foo: bar(), bin: baz() };";
    var result = tacifyStatement(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));


  }); 

});



suite("tacifyFor", function () {

  test("should only call assign before loop",  function () {


    var context = { x :0, bar : function(){x = x+1; return x}, foo:function(){} }
    var input = "for(var i = bar(); i < 2; i++ ){}";
    var result = tacifyFor(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });


  test("should only call increment after loop",  function () {


    var context = { x :0, bar : function(){x = x+1;} }
    var input = "for(var i = 2; i < 2; bar() ){}";
    var result = tacifyFor(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });

  test("should keep first two calls in order",  function () {


    var context = { x :0, bar : function(){return x}, foo: function(){ x = x + 3; return 3}}
    var input = "for(var i = bar(); i < foo(); i++){ x = 46}";
    var result = tacifyFor(parseSingleStat(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });

});

suite("tacifyIf", function () {

  test("should tacify ifs with more than 1 call in cond expression",function () {


    var context = {bar : function(){return true}, foo: function(){ return false}}
    var input = heredoc(function () {/*

      if (foo() || bar()) {
        x = 3;
      } 
      
   */ });
    var result = tacify(parse(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

 });

});

suite("tacifySequence", function () {

  test("should tacify multiple vars in sequence",function () {
    
    var context = {bar : function(){return 3}, foo: function(){ return 4}}
    var input = "x = foo(), bar() ";
    var result = tacify(parse(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

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




suite("Switch Statements", function () {


  test("tacify should work on switch statements",function () {
    
    var context = {bar : function(){return 2}, foo: function(){ return 2}, baz: function(x){return x}}
    var input = heredoc(function () {/*
      switch(foo()){
        case 1:
          foo()
        case baz(bar()):
          bar()
        case 3:
          baz()
      }
          
   */ })
    var result = tacify(parse(input));
    assert.ok(isTacified(result));
    assert.ok(isEquivalentCodeWithContext(input, deparse(result), context));

  });

  test("convertSwitchToIfs should convert switch to string of ifs",function () {
    var input = parseSingleStat(heredoc(function () {/*
      switch(x){
        case 1:
          foo()
        case 2:
          bar()
          break;
        case 3:
          baz()
        default:
          bing()
      }
          
   */ }));

    var expected = parseSingleStat(heredoc(function () {/*

      for(var ___inc = 0; ___inc < 1; ___inc++){
        var ___matchFound = false;
        var ___target = x;
        if(___matchFound || ___target === 1){
          ___matchFound = true
          foo()
        }

        if(___matchFound || ___target === 2){
          ___matchFound = true
          bar()
          break;
        }

        if(___matchFound || ___target === 3){
          ___matchFound = true
          baz()
        }

        bing()

      }
    */}));

    assert.deepEqual(convertSwitchToIfs(input), expected)
  });


});
