let aea = require('./liftA')();

function add1(x) {
  return [x.first() + 1, x.second() - 1];
}

function add2(x) {
  return [x.first() + 2, x.second() - 2];
}

function add5(x) {
  return [x.first() + 5, x.second() - 5];
}

let add1Arr = aea.liftAsyncA(add1);
let add2Arr = aea.liftAsyncA(add2);
let add5Arr = aea.liftAsyncA(add5);

let add1Thenadd2 = aea.thenA(add1Arr, add2Arr);
let add1Thenadd2Thenadd5 = aea.thenA(add1Thenadd2, add5Arr)

let add2Thenadd5 = aea.thenA(add2Arr, add5Arr);
let add1Thenadd2Thenadd5v2 = aea.thenA(add1Arr, add2Thenadd5)

add1Thenadd2Thenadd5([1, 2], (x) => console.log('and the result is: ', x), aea.p)

console.log(add1.liftAsyncA().thenA(add2.liftAsyncA()).thenA(add5.liftAsyncA()).runA([1,2]));


add1.liftAsyncA()
  .thenA(add2.liftAsyncA())
  .thenA(add5.liftAsyncA())
  .runA([1,2]);

add1Thenadd2Thenadd5v2([6, 7], (x) => console.log('and the result is: ', x), aea.p)

add1.liftAsyncA()
  .thenA(add2.liftAsyncA().thenA(add5.liftAsyncA()))
  .runA([6,7]);
//
let testProductArrow = aea.productA(add1Arr, add5Arr);
testProductArrow([[1,5],[2,6]], (x) => console.log('test product: ', x), aea.p);
add1.liftAsyncA().productA(add5.liftAsyncA()).runA([[1,5],[2,6]]);
//
let fan1And5 = aea.fanA(add1Arr, add5Arr);
let testFanArrow = aea.fanA(fan1And5, add2Arr);
testFanArrow([6, 2], (x) => console.log('test fan: ', x), aea.p);
add1.liftAsyncA().fanA(add5.liftAsyncA()).fanA(add2.liftAsyncA()).runA([6, 2])
//
let testFirstArrow = aea.firstA(aea.liftAsyncA((x) => x * 2))
testFirstArrow([2, "dave"], (x) => console.log('testFirstArrow: ', x), aea.p)// types for looping
//
let testSecondArrow = aea.secondA(aea.liftAsyncA((x) => x * 3))
testSecondArrow(["suzie creamcheese", 3], (x) => console.log('testSecondArrow: ', x), aea.p)// types for looping
//
// function repeatAdd1Arrow(x, cont, p) {
//   setTimeout(() => {
//     let first = x.first();
//     if (first === 1000) {
//       cont([first, aea.Done(first)], p);
//     } else {
//       cont([first, aea.Repeat(first)], p);
//     }
//   }, 0);
// }
//
// let's create a new progress
myaea = require('./liftA')();
let frst = myaea.firstA(myaea.liftAsyncA((x) => x + 1)).thenA(myaea.justRepeatA);
let repeatTest = frst.repeatA();
console.log('run repeat test');
repeatTest([0, myaea.Repeat()], () => console.log('lsdjfldskjflksdjf'), myaea.p);
console.log('stop the repeater');
myaea.p.cancelAll();

function repeatAdd1ArrowSynch(x, cont, p) {
  let first = x.first();
  let doneOrRepeat;
  if (first === 10000) {
    doneOrRepeat = aea.Done(first);
  } else {
    console.log(first)
    doneOrRepeat = aea.Repeat(first);
  }
  cont([first, doneOrRepeat], p);
}
//
// let frstSynchA = aea.liftA((x) => {
//   x.first(x.first() + 1);
//   console.log(x.first());
//   return [x.first(), x.first() > 10000 ? aea.Done() : aea.Repeat()];
// });
//
// let repeatTestSynchA = aea.repeatA(frstSynchA);
// repeatTestSynchA.runA([0, aea.Repeat()]);

let testDelay = aea.thenA((x, cont, p) => { console.log('start delay 2000'); cont(x, p); }, aea.thenA(aea.delayA(2000), (x, cont, p) => {console.log('end delay 2000');}));
testDelay([1,2], () => {}, aea.p);
let testCancelDelay = aea.thenA((x, cont, p) => { console.log('start delay 3000'); cont(x, p); }, aea.thenA(aea.delayA(3000), (x, cont, p) => {console.log('end delay 3000');}));
cancelId = testCancelDelay([1,2], () => {}, aea.p);
aea.p.cancel(cancelId);


let stuff = aea
	.secondA(
		((x) => x + 2).liftAsyncA()
	)
	.thenA(
		((x) => { x.first()('cool it is ', x.second()); return x; }).liftAsyncA()
	);
stuff.runA([console.log, 0], stuff);
