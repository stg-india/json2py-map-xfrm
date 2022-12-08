///// ADD YOUR FUNCTIONS HERE ///////////
const functions = {
  $ADD: (...args) =>
    args.reduce((prev, next) => Number(prev) + Number(next), 0),
  $MULTIPLY: (...args) => args.reduce((prev, next) => prev * next, 1),
  $SUBTRACT: (...args) => args[0] - args[1],
  $DIVIDE: (...args) => args[0] / args[1],
  $JOIN: (...args) => args.join(""),
  $AVERAGE: (...args) => args.reduce((a, b) => a + b, 0) / args.length,
  $MAX: (...args) => Math.max(...args),
  $MIN: (...args) => Math.min(...args),
  $IF: (condition, thenClause, elseClause) => {
    if (condition) return thenClause
    else return elseClause;
  }
};
///////////////////

module.exports = functions;