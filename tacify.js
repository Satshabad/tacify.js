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
        for (var j = 0; j < newNodes.length; j++){
          tree.splice(i, 0, newNodes[j]);
          i++;
        }
      }
      inner(tree[i]);
    }


  }
  inner(node);
  return node;

}


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
    newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var call = replaceDeepestCall(conditional, newVar);

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

var tacifyNested = function(node){
    if (node.length == 0){
      return node;
    }

    newCode = [];
    tempVarId = 0;

    while(numberOfCalls(node) > 1){
        newVar = parseSingleStat("__t"+tempVarId.toString())[1];
        call = replaceDeepestCall(node, newVar);
        newCode.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(call) + ";"));
        tempVarId++;
    }

    for (var i = 0; i < node.length; i++){
      newCode.push(node[i]);
    }
    return newCode;
}


var numberOfCalls = function(tree){

  callCount = 0;

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

  var ast = tree;
  var call = undefined;
  var deepestCall = -1;


  var findDepth = function(tree, depth){

    if (tree === null){
      return;
    }
  
    if (typeof tree === 'string'){
      if (tree == "call"){
          if (depth > deepestCall){
              deepestCall = depth;
          }
      }
      return;
    }

    for (var i = 0; i < tree.length; i++){
      findDepth(tree[i], depth++);
    }
  }

  var replaceCall = function(tree, depth){

    if (tree === null){
      return;
    }
  
    if (typeof tree === 'string'){
      return;
    }

    for (var i = 0; i < tree.length; i++){
      if(isNodeTypeOf(tree[i], "call") && depth === deepestCall){
        call = tree[i];
        tree[i] = newVar;
      }
      replaceCall(tree[i], depth++);
    }
  }
  

  findDepth(tree, 0);
  replaceCall(tree, 0);
  return call;
}


exports.privateFunctions = { tacifyNested : tacifyNested, tacifyWhile: tacifyWhile};
