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

      if (isNodeTypeOf(tree[i], 'switch')) {
        var newNode = convertSwitchToIfs(tree[i]);
        tree.splice(i, 1, newNode); //remove old node, and add new one
        inner(tree[i]);
      }

      if (isNodeTypeOf(tree[i], 'for')) {
        inner(tree[i][4]);
        var newNodes = tacifyFor(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length -1;
      }

      if(isNodeTypeOf(tree[i], 'if')){
        if (isNodeTypeOf(tree[i][3], 'if')){
          tree[i] = convertIfElseToIf(tree[i]);
        }
        var newNodes = tacifyStatement(tree[i]);
        tree.splice(i, 1); //remove old node
        spliceArrays(tree, newNodes, i);
        i += newNodes.length -1;
        inner(tree[i][2])
        inner(tree[i][3])

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

var convertSwitchToIfs = function (node) {
  
  var newNode = []

  var target = node[1];
  var cases = node[2];

  var code = 'for(var ___inc=0;___inc<1;___inc++){var ___matchFound = false;\nvar ___target= '+deparse(target)+';\n';

  for (var i = 0, l = cases.length; i < l; i ++) {
    var value = cases[i][0];
    var block = cases[i][1];

    if(cases[i][0] === null){
      
      var caseCode = deparse(block)+'\n'
    } else{
      var caseCode = 'if(___matchFound || ___target ==='+deparse(value)
                    +'){___matchFound = true;\n'+ deparse(block)+'}\n'
    }
    
    code = code + caseCode;
  }
    code += '\n}'

    return parseSingleStat(code);
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

  var paths = collectPaths(conditional, ['call'])

  for (var i = 0, l = paths.length; i < l; i ++) {
    var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var extractedNode = getNodeAtPath(conditional, paths[i]);
    conditional = setNodeAtPathTo(conditional, paths[i], newVar);
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
    
  var declarationStatements = [];
  var conditionalStatements = [];
  var incrementalStatements = [];
  var tempVarId = 0;
  var conditionals = [node[1], node[2], node[3]];

  var paths = collectPaths(conditionals[0], ['call'])

  for (var i = 0, l = paths.length; i < l; i ++) {
    var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var extractedNode = getNodeAtPath(conditionals[0], paths[i]);
    conditionals[0] = setNodeAtPathTo(conditionals[0], paths[i], newVar);
    declarationStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(extractedNode) + ";"));
    tempVarId++;
  }

  paths = collectPaths(conditionals[1], ['call'])

  for (var i = 0, l = paths.length; i < l; i ++) {
    var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var extractedNode = getNodeAtPath(conditionals[1], paths[i]);
    conditionals[1] = setNodeAtPathTo(conditionals[1], paths[i], newVar);
    conditionalStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(extractedNode) + ";"));
    tempVarId++;

  }

  paths = collectPaths(conditionals[2], ['call'])

  for (var i = 0, l = paths.length; i < l; i ++) {
    var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
    var extractedNode = getNodeAtPath(conditionals[2], paths[i]);
    conditionals[2] =  setNodeAtPathTo(conditionals[2], paths[i], newVar);
    incrementalStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(extractedNode) + ";"));
    tempVarId++;

  }
 

  node[1] = conditionals[0];
  node[2] = conditionals[1];
  node[3] = conditionals[2];


  var block = node[4][1]

  for (var i = 0; i < conditionalStatements.length; i++) {
    block.push(conditionalStatements[i]);
  }

  for (var i = 0; i < incrementalStatements.length; i++) {
    block.push(incrementalStatements[i]);
  }

  var newCode = []

  for (var i = 0; i < declarationStatements.length; i++) {
    newCode.push(declarationStatements[i]);
  } 

  for (var i = 0; i < conditionalStatements.length; i++) {
    newCode.push(conditionalStatements[i]);
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

    var paths = collectPaths(node, ['call']);

    for (var i = 0, l = paths.length; i < l; i ++) {
      var newVar = parseSingleStat("__t"+tempVarId.toString())[1];
      var extractedNode = getNodeAtPath(node, paths[i]);
      node = setNodeAtPathTo(node, paths[i], newVar);
      varStatements.push(parseSingleStat("var "+ deparse(newVar) + " = " + deparse(extractedNode) + ";"));

      tempVarId++;
    }

   
    varStatements.push(node);
    return varStatements;


}

var nodeType = function(node){
  
  return node[0]

}

var collectPaths = function(tree, nodeTypes){

  var paths = [];

  var inner = function(node, depth, path, position){
  
    if (typeof node === 'string'){
      return;
    }

    if (node === null || node === undefined || node.length === 0){
      return;
    }
  
    if(nodeTypes.indexOf(nodeType(node)) > -1){
      paths.push({ depth: depth, path:path.slice(0), position:position}) 
    }

    for (var i = 0; i < node.length; i++){
      path.push(i)
      inner(node[i], depth+1, path, position);
      path.pop()
    }
  }

  inner(tree, 0, [], 0);

  paths.sort(function (v1, v2) {
    // sort by reverse path
    if(v1.depth > v2.depth) return -1;
    if(v1.depth < v2.depth) return 1;
    if (v1.depth == v2.depth){
      // sort by left to right secondarily
      if(v1.position < v2.position) return -1;
      if(v1.position > v2.position) return 1;
      return 0;
    }
  });

  return paths.map(function (obj) {
    return obj.path; 
  });
 
}

var getNodeAtPath = function (node, path) {

  if (path.length == 0){
    return node
  }

  var tempNode = node;
  for (var i = 0, l = path.length; i < l-1; i ++) {
    tempNode = tempNode[path[i]];
  }
  return tempNode[path.slice(-1)[0]];
  
};

// this function modifies the input, but also returns it in case it's given a path of []
var setNodeAtPathTo = function (node, path, newNode) {
  
  if (path.length == 0){
    return newNode;
  }

  var tempNode = node;
  for (var i = 0, l = path.length; i < l-1; i ++) {
    tempNode = tempNode[path[i]];
  }
  tempNode[path.slice(-1)[0]] = newNode;
  return node;
  
};

var numberOfNodes = function(tree, nodeType){

  var callCount = 0;

  var inner = function(tree){
  
    if (tree === null || tree === undefined){
      return;
    }
  
    if (typeof tree === 'string'){
      if (tree == nodeType){
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

exports.privateFunctions = { tacifyStatement : tacifyStatement, tacifyFor: tacifyFor, 
                             tacifyWhile: tacifyWhile, spliceArrays: spliceArrays, convertIfElseToIf: convertIfElseToIf, isNodeTypeOf: isNodeTypeOf, convertSwitchToIfs: convertSwitchToIfs, collectPaths:collectPaths, setNodeAtPathTo:setNodeAtPathTo, getNodeAtPath: getNodeAtPath, numberOfNodes: numberOfNodes};
