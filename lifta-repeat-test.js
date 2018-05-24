let aea = require('./liftA')();


function add1(x) {
  return x + 1;
}

function logX(x) {
  console.log('logX', x);
  return x;
}

function doneCheck(x) {
  return x.first >= 100000 ? aea.Done(x) : aea.Repeat(x);
}

function leftIfOdd(x) {
  if (x % 2 === 0) {
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
  .first
  .thenA(doneCheck.liftAsyncA())
  .repeat;

//runnable(5, (x) => console.log('done', x));
let p2 = aea.P();
runnable2([0, 'yikes'], (x) => console.log('done', x), p2);

// sync and async code can co-exist with this paradigm
// but of course the sync code monopolizes the javascript thread
// so use with caution

let p3 = aea.P();

let liftedAdd1 = add1.A;
console.log('add1: ', add1);
console.log('lifted add1: ', liftedAdd1);
liftedAdd1(2, (x) => console.log('liftedAdd1 result:', x));

let runnable3 =
  liftedAdd1
  .thenA(leftIfOdd.A)
  .leftOrRightA(aea.returnA, logX.A)
  .first
  .thenA(doneCheck.A)
  .repeat;

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