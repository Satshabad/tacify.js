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
        var newNodes = tacifyNested(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length;
      }

      if (isNodeTypeOf(tree[i], 'while')) {
        inner(tree[i][2]);
        var newNodes = tacifyWhile(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length;
      }

      if (isNodeTypeOf(tree[i], 'for')) {
        inner(tree[i][4]);
        var newNodes = tacifyFor(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length;
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



var tacifyNested = function(node){
    if (node.length == 0){
      return node;
    }

    var newCode = [];
    var tempVarId = 0;

    while(numberOfCalls(node) > 1){
        var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
        var call = findDeepestCall(node);
        node = replaceDeepestCall(node, newVar);
        newCode.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(call) + ";"));
        tempVarId++;
    }

    for (var i = 0; i < node.length; i++){
      newCode.push(node[i]);
    }
    return newCode;
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

var findDeepestCall = function(tree){
  var deepestCallDepth = findDepthOfDeepestCall(tree)

  var call = undefined;

  var findDeepestCall = function (tree, depth) {

    if (typeof tree === 'string' || tree === null){
      return false;
    }
    
    for (var i = 0; i < tree.length; i++){
      if(isNodeTypeOf(tree[i], "call") && depth+1 === deepestCallDepth){
        call = tree[i];
        return true;
      }

      if (findDeepestCall(tree[i], depth + 1)){
        break;
      }

    }
  
    return;

  };
  findDeepestCall(tree, 0);
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
  
  replaceCall([node], -1);
  return node;
}


exports.privateFunctions = { tacifyNested : tacifyNested, tacifyFor: tacifyFor, 
                             tacifyWhile: tacifyWhile, replaceDeepestCall: replaceDeepestCall,
                             findDepthOfDeepestCall: findDepthOfDeepestCall, findDeepestCall: findDeepestCall,
                             replaceCall: replaceCall};
