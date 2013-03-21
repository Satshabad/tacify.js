var tacifyFunctions = require("../tacify").privateFunctions;
var parser = require('../parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;


  
exports.testNested = function(test){
  test.expect(4);
  
	var input = parse("x = obj.bar().baz();");
  var output = parse("var __t0 = obj.bar();\
									    x = __t0.baz();");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  

  input = parse("foo(baz(), x, bar())");
  output = parse("var __t0 = bar();\
                  var __t1 = baz();\
                  foo(__t1, x, __t0);");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  

  input = parse("x = obj.bar.baz();");
  output = parse("x = obj.bar.baz();");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));


  input = parse("var x = { foo: bar(), bin: baz() };");
  output = parse("var __t0 = baz();\
                  var x = { foo : bar(), bin: __t0 };");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  test.done();


};

exports.testWhile = function(test){

  test.expect(1);
  
	var input = parseSingleStat("while(foo() < 1){bar();}");
  var output = parse("var __t0 = foo(); while(__t0 < 1){bar(); var __t0 = foo(); }");
  var e = deparse(output);
  var o = deparse(tacifyFunctions.tacifyWhile(input));
  test.equal(e, o);
  

  test.done();


}

exports.testFor = function(test){

  test.expect(2);
  
	var input = parseSingleStat("for(var i = bar();foo() < 1; i = baz()){x = 2;}");
  var output = parse("var __t0 = bar(); var __t1 = foo(); var __t2 = baz(); \
                      for(var i = __t0; __t1 < 1; i = __t2){ \
                        x = 2; var __t0 = bar(); var __t1 = foo(); var __t2 = baz()}");
  var e = deparse(output);
  var o = deparse(tacifyFunctions.tacifyFor(input));
  test.equal(e, o);
  
  var input = parseSingleStat("for(var i = 0; foo() < 1; i = baz().bar()){x = 2;}");
  var output = parse("var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); \
                      for(var i = 0; __t0 < 1; i = __t2){ \
                        x = 2; var __t0 = foo(); var __t1 = baz(); var __t2 = __t1.bar(); }");
  var e = deparse(output);
  var o = deparse(tacifyFunctions.tacifyFor(input));
  test.equal(e, o);
  

  test.done();


}
