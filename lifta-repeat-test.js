let aea = require('./liftA')();

function testIncr(x) {
  console.log('x:', x);
  return [x.first() + 1, x.first() >= 10000 ? aea.Done(x.second()) : aea.Repeat(x.second())];
}

let repeatTestSynchA = aea.repeatA(testIncr.liftAsyncA());
repeatTestSynchA.runA([0, 5]);

setTimeout(() => aea.p.cancelAll(), 4000);
