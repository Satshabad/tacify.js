var tacifyFunctions = require("../tacify").privateFunctions;
var parser = require('../parser');
var parse = parser.parse;
var deparse = parser.deparse;


  
exports.testTacify = function(test){
  test.expect(6);
  
	var input = parse("x = obj.bar().baz();");
  var output = parse("var __t0 = obj.bar();\
									    x = __t0.baz();");
  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  
  
  
  input = parse("x = obj.bar.baz();");
  output = parse("x = obj.bar.baz();");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  
  
  input = parse("foo(baz(), x, bar())");
  output = parse("var __t0 = bar();\
                  var __t1 = baz();\
                  foo(__t1, x, __t0);");

  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));

  input = parse("var x = bar(baz(), foo(x, y), moo());");
  output = parse("var __t0 = moo();\
                  var __t1 = foo(x,y);\
                  var __t2 = baz();\
                  var x = bar(__t2, __t1, __t0);");
  
  test.equal(deparse(output), deparse(tacifyFunctions.tacifyNested(input)));
  test.done();


};

