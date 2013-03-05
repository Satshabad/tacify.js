var jaspectcore = require("./core");
var parse = require("./burrito");

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


