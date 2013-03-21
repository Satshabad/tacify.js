var tacifyFunctions = require("../tacify").privateFunctions;
var tacify = require("../tacify").tacify;
var parser = require('../parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;

var heredoc = require('heredoc')


exports.testHelpers = function(test){

  test.expect(6);

	var input = parseSingleStat("foo().bar.baz();");
  var expected = parse("__t0.bar.baz();");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.replaceCall(input, ["name", "__t0"], 4));
  test.equal(e, o);
  
	var input = parseSingleStat("foo().bar.baz();");
  var expected = 4;
  var o = tacifyFunctions.findDepthOfDeepestCall(input);
  test.equal(expected, o);

	var input = parseSingleStat("foo().bar.baz();");
  var expected = parseSingleStat("foo()")[1];
  var o = deparse(tacifyFunctions.findDeepestCall(input));
  var e = deparse(expected);
  test.equal(e, o);

	var input = parseSingleStat("foo();");
  var expected = parseSingleStat("__t0");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.replaceDeepestCall(input,["name", "__t0"]));
  test.equal(e, o);

 	var input = parseSingleStat("foo().bar.baz();");
  var expected = parseSingleStat("__t0.bar.baz()");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.replaceDeepestCall(input,["name", "__t0"]));
  test.equal(e, o); 

 	var input = parseSingleStat("foo(baz(), x, bar())");
  var expected = parseSingleStat("foo(__t0, x, bar())");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.replaceDeepestCall(input,["name", "__t0"]));
  test.equal(e, o); 


  test.done();

}




exports.testNested = function(test){
  test.expect(4);
  
	var input = parse("x = obj.bar().baz();");
  var expected = parse("var __t0 = obj.bar();\
									    x = __t0.baz();");

  test.equal(deparse(expected), deparse(tacifyFunctions.tacifyNested(input)));
  

  input = parse("foo(baz(), x, bar())");
  expected = parse("var __t0 = baz();\
                  var __t1 = bar();\
                  foo(__t0, x, __t1);");

  test.equal(deparse(expected), deparse(tacifyFunctions.tacifyNested(input)));
  

  input = parse("x = obj.bar.baz();");
  expected = parse("x = obj.bar.baz();");

  test.equal(deparse(expected), deparse(tacifyFunctions.tacifyNested(input)));


  input = parse("var x = { foo: bar(), bin: baz() };");
  expected = parse("var __t0 = bar();\
                  var x = { foo : __t0 , bin: baz() };");

  test.equal(deparse(expected), deparse(tacifyFunctions.tacifyNested(input)));
  test.done();


};

exports.testWhile = function(test){

  test.expect(1);
  
	var input = parseSingleStat("while(foo() < 1){bar();}");
  var expected = parse("var __t0 = foo(); while(__t0 < 1){bar(); var __t0 = foo(); }");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.tacifyWhile(input));
  test.equal(e, o);
  

  test.done();


}

exports.testFor = function(test){

  test.expect(2);
  
	var input = parseSingleStat("for(var i = bar();foo() < 1; i = baz()){x = 2;}");
  var expected = parse("var __t0 = bar(); var __t1 = foo(); var __t2 = baz(); \
                      for(var i = __t0; __t1 < 1; i = __t2){ \
                        x = 2; var __t0 = bar(); var __t1 = foo(); var __t2 = baz()}");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.tacifyFor(input));
  test.equal(e, o);
  
  var input = parseSingleStat("for(var i = 0; foo() < 1; i = baz().bar()){x = 2;}");
  var expected = parse("var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); \
                      for(var i = 0; __t0 < 1; i = __t2){ \
                        x = 2; var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); }");
  var e = deparse(expected);
  var o = deparse(tacifyFunctions.tacifyFor(input));
  test.equal(e, o);
  

  test.done();


}


// exports.testTacify = 
 x = function(test){

  test.expect(1);
  
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
  var e = deparse(expected);
  var o = deparse(tacify(input));
  test.equal(e, o);
  

  test.done();


}




