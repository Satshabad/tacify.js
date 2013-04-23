var parser = require('./parser');
var parse = parser.parse;
var parseSingleStat = parser.parseSingleStat;
var deparse = parser.deparse;

var tacify = exports.tacify = function(node){
 
  var inner = function(tree){
    if (typeof tree === 'string' || tree == null){
      return;
    } 

    for (var i = 0; i < tree.length; i ++){

      if (isNodeTypeOf(tree[i], 'var') || isNodeTypeOf(tree[i], 'stat')) {
        var newNodes = tacifyStatement(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length -1;
      }

      if (isNodeTypeOf(tree[i], 'while')) {
        inner(tree[i][2]);
        var newNodes = tacifyWhile(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length -1;
      }

      if (isNodeTypeOf(tree[i], 'for')) {
        inner(tree[i][4]);
        var newNodes = tacifyFor(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length -1;
      }

      inner(tree[i]);
    }


  }
  inner(node);
  return node;

}

var spliceArrays = function (originalArray, toBeInserted, index) {

        for (var j = 0; j < toBeInserted.length; j++){
          originalArray.splice(index, 0, toBeInserted[j]);
          index++;
        }

        return originalArray;
};

var isNodeTypeOf = function(ast, type){
  if (typeof ast === 'string' || ast == null){
        return false;
      }
  
  if (ast.length == 0){
      return false;
  }

  return ast[0] == type;
}

var tacifyIf = function (node) {
  
};

var convertIfElseToIf = function (node) {


 var inner =  function(node) {

    if (node[3] === undefined){
      node[1] = ["unary-prefix","!", node[1]];
      node[3] = node[2];
      node[2] = ['block', []];
      return;
    }

    if (isNodeTypeOf(node[3], 'block')) {

      node[1] = ["unary-prefix","!", node[1]];
      var temp = node[3];
      node[3] = node[2];
      node[2] = temp;
      return;
    }

    if (isNodeTypeOf(node[3], 'if')){

      node[1] = ["unary-prefix","!", node[1]];
      var nextif = node[3];
      node[3] = node[2];
      node[2] = ['block', [nextif]];
      inner(node[2][1][0]);

    }

  };

  inner(node);
  return node;

};

var tacifyWhile = function (node) {

  if (node.length == 0){
    return node;
  }
    
  var tempStatements = [];
  var tempVarId = 0;
  var conditional = node[1];

  while(numberOfCalls(conditional) > 0){
    var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var call = findDeepestCall(conditional);
    conditional = replaceDeepestCall(conditional, newVar);

    tempStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(call) + ";"));

    tempVarId++;
  }
  
  node[1] = conditional;
  var block = node[2][1]

  for (var i = 0; i < tempStatements.length; i++) {
    block.push(tempStatements[i]);
  }

  var newCode = []

  for (var i = 0; i < tempStatements.length; i++) {
    newCode.push(tempStatements[i]);
  } 

  newCode.push(node);
  return newCode;
  
};

var tacifyFor = function (node) {

  if (node.length == 0){
    return node;
  }
    
  var tempStatements = [];
  var tempVarId = 0;
  var conditionals = [node[1], node[2], node[3]];

  for (var i = 0; i < conditionals.length; i++) {
    while(numberOfCalls(conditionals[i]) > 0){
      var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
      var call = findDeepestCall(conditionals[i]);
      conditionals[i] = replaceDeepestCall(conditionals[i], newVar);

      tempStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(call) + ";"));

      tempVarId++;
    }
  }

  node[1] = conditionals[0];
  node[2] = conditionals[1];
  node[3] = conditionals[2];

  var block = node[4][1]

  for (var i = 0; i < tempStatements.length; i++) {
    block.push(tempStatements[i]);
  }

  var newCode = []

  for (var i = 0; i < tempStatements.length; i++) {
    newCode.push(tempStatements[i]);
  } 

  newCode.push(node);
  return newCode;
  
};



var tacifyStatement = function(node){
    if (node.length == 0){
      return node;
    }

    var varStatements = [];
    var tempVarId = 0;

    while(numberOfCalls(node) > 1){
        var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
        var call = findDeepestCall(node);
        node = replaceDeepestCall(node, newVar);
        varStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(call) + ";"));
        tempVarId++;
    }
    
    varStatements.push(node);
    return varStatements;


}


var numberOfCalls = function(tree){

  var callCount = 0;

  var inner = function(tree){
  
    if (tree === null){
      return;
    }
  
    if (typeof tree === 'string'){
      if (tree == "call"){
          callCount = callCount+1;
      }
      return;
    }

    for (var i = 0; i < tree.length; i++){
      inner(tree[i]);
    }
  }

  inner(tree);
  return callCount;
  
}

var replaceDeepestCall = function(tree, newVar){
  return replaceCall(tree, newVar, findDepthOfDeepestCall(tree))
}

var findDeepestCall = function(node){
  var deepestCallDepth = findDepthOfDeepestCall(node)

  var call = undefined;

  var findDeepestCallHelper = function (tree, depth) {

    if (typeof tree === 'string' || tree === null){
      return false;
    }
    
    for (var i = 0; i < tree.length; i++){
      if(isNodeTypeOf(tree[i], "call") && depth+1 === deepestCallDepth){
        call = tree[i];
        return true;
      }

      if (findDeepestCallHelper(tree[i], depth + 1)){
        break;
      }

    }
  
  };

  findDeepestCallHelper([node], -1);
  return call;
}

var findDepthOfDeepestCall = function(tree){

  var findDepthOfDeepestCall = function (tree, depth, deepest) {

     if (tree === null){
       return deepest;
     }

     if (typeof tree === 'string'){
       if (tree == "call"){
         if (depth > deepest){
            deepest = depth-1;
         }
       }
       return deepest;
     }

     var calldepths = []
     for (var i = 0; i < tree.length; i++){
      calldepths.push(findDepthOfDeepestCall(tree[i], depth + 1, deepest));
     }
     return Math.max.apply(null, calldepths);

  };

  return findDepthOfDeepestCall(tree, 0, -1);

}


var replaceCall = function(node, newVar, depthOfCall){

  var replaceCall = function(tree, depth){

    if (typeof tree === 'string' || tree === null){
      return false;
    }
    
    for (var i = 0; i < tree.length; i++){
      if(isNodeTypeOf(tree[i], "call") && depth+1 === depthOfCall){
        tree[i] = newVar;
        return true;
      }

     if(replaceCall(tree[i], depth+1)){
       break;
     }

    }

  }
  node = [node];
  replaceCall(node, -1);
  return node[0];
}


exports.privateFunctions = { tacifyStatement : tacifyStatement, tacifyFor: tacifyFor, 
                             tacifyWhile: tacifyWhile, replaceDeepestCall: replaceDeepestCall,
                             findDepthOfDeepestCall: findDepthOfDeepestCall, findDeepestCall: findDeepestCall,
                             replaceCall: replaceCall, spliceArrays: spliceArrays, convertIfElseToIf: convertIfElseToIf};
