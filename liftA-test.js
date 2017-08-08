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

let add1Arr = aea.liftArrow(add1);
let add2Arr = aea.liftArrow(add2);
let add5Arr = aea.liftArrow(add5);

let add1Thenadd2 = aea.thenArrow(add1Arr, add2Arr);
let add1Thenadd2Thenadd5 = aea.thenArrow(add1Thenadd2, add5Arr)

let add2Thenadd5 = aea.thenArrow(add2Arr, add5Arr);
let add1Thenadd2Thenadd5v2 = aea.thenArrow(add1Arr, add2Thenadd5)

add1Thenadd2Thenadd5([1, 2], (x) => console.log('and the result is: ', x), aea.p)

console.log(add1.liftA());
console.log(add1.liftA().thenA(add2.liftA()));
console.log(add1.liftA().thenA(add2.liftA()).thenA(add5.liftA()));
console.log(add1.liftA().thenA(add2.liftA()).thenA(add5.liftA()).runA([1,2]));


add1.liftA()
  .thenA(add2.liftA())
  .thenA(add5.liftA())
  .runA([1,2]);

add1Thenadd2Thenadd5v2([6, 7], (x) => console.log('and the result is: ', x), aea.p)

add1.liftA()
  .thenA(add2.liftA().thenA(add5.liftA()))
  .runA([6,7]);
//
let testProductArrow = aea.productArrow(add1Arr, add5Arr);
testProductArrow([[1,5],[2,6]], (x) => console.log('test product: ', x), aea.p);
add1.liftA().productA(add5.liftA()).runA([[1,5],[2,6]]);
//
let fan1And5 = aea.fanArrow(add1Arr, add5Arr);
let testFanArrow = aea.fanArrow(fan1And5, add2Arr);
testFanArrow([6, 2], (x) => console.log('test fan: ', x), aea.p);
add1.liftA().fanA(add5.liftA()).fanA(add2.liftA()).runA([6, 2])
//
let testFirstArrow = aea.firstArrow(aea.liftArrow((x) => x * 2))
testFirstArrow([2, "dave"], (x) => console.log('testFirstArrow: ', x), aea.p)// types for looping
//
let testSecondArrow = aea.secondArrow(aea.liftArrow((x) => x * 3))
testSecondArrow(["suzie creamcheese", 3], (x) => console.log('testSecondArrow: ', x), aea.p)// types for looping
//
function repeatAdd1Arrow(x, cont, p) {
  setImmediate(() => {
    let first = x.first();
    if (first === 1000000) {
      cont([first, aea.ArrDone], p);
    } else {
      cont([first, aea.ArrRepeat], p);
    }
  });
}
//
let frst = aea.firstArrow(aea.liftArrow((x) => x + 1))
let repeatTest = aea.repeatArrow(aea.thenArrow(frst, repeatAdd1Arrow));
repeatTest.runA([0, aea.ArrRepeat]);

let testDelay = aea.thenArrow((x, cont, p) => { console.log('start delay 2000'); cont(x, p); }, aea.thenArrow(aea.delayArrow(2000), (x, cont, p) => {console.log('end delay 2000');}));
testDelay([1,2], () => {}, aea.p);
let testCancelDelay = aea.thenArrow((x, cont, p) => { console.log('start delay 3000'); cont(x, p); }, aea.thenArrow(aea.delayArrow(3000), (x, cont, p) => {console.log('end delay 3000');}));
cancelId = testCancelDelay([1,2], () => {}, aea.p);
aea.p.cancel(cancelId);


let stuff = aea
	.secondArrow(
		((x) => x + 2).liftA()
	)
	.thenA(
		((x) => { x.first()('cool it is ', x.second()); return x; }).liftA()
	);
stuff.runA([console.log, 0], stuff);