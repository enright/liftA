"use strict";

// simple lift
let liftA = (f) => (x, cont) => {
  return cont(f(x));
};

// first f, then g, f and g are arrows
let thenA = (f, g) => (x, cont) => {
  return f(x, (x) => {
    return g(x, cont);
  });
};

function add1(x) {
  return x + 1;
}

function mult2(x) {
  return x * 2;
}

let add1Mult2A = thenA(liftA(add1), liftA(mult2));

// run it
add1Mult2A(5, x => console.log('and the answer is:', x));

// but what if the adder was an asynch operation?
function add1A(x, cont) {
  setTimeout(() => cont(x + 1), 4000);
}

// let's recompose the arrow with an asynchronous adder
add1Mult2A = thenA(add1A, liftA(mult2));
// run it
add1Mult2A(5, x => console.log('and the answer four seconds later is:', x));

// funny thing is, we can run it many times...all at once
add1Mult2A(6, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(7, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(8, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(9, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(10, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(11, x => console.log('and the answer four seconds later is:', x));
add1Mult2A(12, x => console.log('and the answer four seconds later is:', x));