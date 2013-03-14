var uglify = require('uglify-js');
var parser = uglify.parser;
var parseTopLevel = exports.parseTopLevel = function (expr) {
    if (typeof expr !== 'string') throw 'expression should be a string';
    
    try {
        var ast = parser.parse.apply(null, arguments);
    }
    catch (err) {
        if (err.message === undefined
        || err.line === undefined
        || err.col === undefined
        || err.pos === undefined
        ) { throw err }
        
        var e = new SyntaxError(
            err.message
            + '\n  at line ' + err.line + ':' + err.col + ' in expression:\n\n'
            + '  ' + expr.split(/\r?\n/)[err.line]
        );
        
        e.original = err;
        e.line = err.line;
        e.col = err.col;
        e.pos = err.pos;
        throw e;
    }
    return ast;
};

exports.parse = function(expr){
  return parseTopLevel(expr)[1]
}

exports.parseSingleStat = function(expr){
  return parseTopLevel(expr)[1][0]
}

exports.deparse = function (ast) {
  if (ast[0] !== 'toplevel'){
    if (typeof ast[0] === 'string'){
      ast = ['toplevel', [ast]]
    }else{
      ast = ['toplevel', ast]
    }
  }
  return uglify.uglify.gen_code(ast, { beautify : true });
};

