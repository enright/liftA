let aea = require('./liftA')();


function add1(x) {
  return x + 1;
}

function logX(x) {
  console.log('logX', x);
  return x;
}

function doneCheck(x) {
  return x.first() >= 100000 ? aea.Done(x) : aea.Repeat(x);
}

function leftIfOdd(x) {
  if (x%2 === 0) {
    return aea.Right(x);
  } else {
    return aea.Left(x);
  }
}

// we can use a fluent syntax which is more readable
let runnable2 =
  add1.liftAsyncA()
  .thenA(leftIfOdd.liftAsyncA())
  .leftOrRightA(aea.returnA, logX.liftAsyncA())
  .firstA()
  .thenA(doneCheck.liftAsyncA())
  .repeatA();

//runnable(5, (x) => console.log('done', x));
let p2 = aea.P();
runnable2([0, 'yikes'], (x) => console.log('done', x), p2);

// sync and async code can co-exist with this paradigm
// but of course the sync code monopolizes the javascript thread
// so use with caution

let p3 = aea.P();

let runnable3 =
  add1.liftA()
  .thenA(leftIfOdd.liftA())
  .leftOrRightA(aea.returnA, logX.liftA())
  .firstA()
  .thenA(doneCheck.liftA())
  .repeatA();

//runnable(5, (x) => console.log('done', x));
runnable3([0, 'yikes'], (x) => console.log('done', x), p3);

// let p4 = aea.P();
//
// let runnable4 =
//   add1.liftA()
//   .thenA(leftIfOdd.liftA())
//   .leftOrRightA(logX.liftA(), aea.returnA)
//   .secondA()
//   .thenA(doneCheck.liftA())
//   .repeatA();
//
// //runnable(5, (x) => console.log('done', x));
// runnable3([0, 'yikes'], (x) => console.log('done', x), p4);

setTimeout(() => p2.cancelAll(), 4000);
