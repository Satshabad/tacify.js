var jaspectcore = require("./core");
var parse = require("burrito");

var privateFunctions = jaspectcore("").privateFunctions;
  
exports.testTacify = function(test){
  test.expect(3);
  
  
	var input = parse("x = obj.bar().baz();");
  var output = parse("var t1 = obj.bar();\
									    x = t1.baz();");
    
  test.equal(output, privateFunctions.tacify(input));
  
  
  
  input = parse("x = obj.bar.baz();");
  output = parse("x = obj.bar.baz();");
  
  test.equal(output, privateFunctions.tacify(input));
  
  
  
  input = parse("x = foo().bar.baz();");
  output = parse("var t1 = foo();\
  								x = t1.bar.baz();");
  
  test.equal(output, privateFunctions.tacify(input));
  
  
  input = parse("x = foo().bar.baz();");
  output = parse("var t1 = foo();\
  								x = t1.bar.baz();");
  
  test.equal(output, privateFunctions.tacify(input));
  
  
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









