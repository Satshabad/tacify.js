var jaspectcore = require("./core");
var burrito = require('burrito');
var parse = burrito.parse;
var deparse = burrito.deparse;

var privateFunctions = jaspectcore("").privateFunctions;
  
exports.testTacify = function(test){
  test.expect(6);
  
	var input = parse("x = obj.bar().baz();");
  var output = parse("var __t0 = obj.bar();\
									    x = __t0.baz();");

  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));
  
  
  
  input = parse("x = obj.bar.baz();");
  output = parse("x = obj.bar.baz();");

  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));
  
  
  
  input = parse("x = foo().bar.baz();");
  output = parse("var __t0 = foo();\
  								x = __t0.bar.baz();");
  
  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));
  
  
  input = parse("x = foo().bar.baz();");
  output = parse("var __t0 = foo();\
  								x = __t0.bar.baz();");

  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));
  

  input = parse("foo(baz(), x, bar())");
  output = parse("var __t0 = bar();\
                  var __t1 = baz();\
                  foo(__t1, x, __t0);");

  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));

  input = parse("var x = bar(baz(), foo(x, y), moo());");
  output = parse("var __t0 = moo();\
                  var __t1 = foo(x,y);\
                  var __t2 = baz();\
                  var x = bar(__t2, __t1, __t0);");
  
  test.equal(deparse(output), deparse(privateFunctions.tacifyNested(input)));
  test.done();


};


exports.testInsertBefore = function(test){
  test.expect(1);
  
  var input1 = parse("callback();");
	var input2 = parse("var x = obj.bar();");
  var output = parse("callback();\
  										var x = obj.bar();");
    
  test.equal(output, privateFunctions.insertBefore(input1, input2));
  
  test.done();
};


exports.testInsertAfter = function(test){
  test.expect(1);
  
  var input1 = parse("callback();");
	var input2 = parse("var x = obj.bar();");
  var output = parse("var x = obj.bar();\
                      callback();");
    
  test.equal(output, privateFunctions.insertAfter(input1, input2));
  
  test.done();
};









