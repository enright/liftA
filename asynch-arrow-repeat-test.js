/*
MIT License

Copyright (c) 2017 Bill Enright

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

"use strict";


let P = () => {
  let c = {
    counter: 0,
    canceller: {}
  };
  function add(f) {
    let key = (c.counter += 1).toString(); //uuid?
    c.canceller[key] = f;
    return key;
  }
  function advance(key) {
    delete c.canceller[key];
  }
  function cancel(key) {
    let canceller = c.canceller[key];
    if (canceller) {
      canceller();
      delete c.canceller[key];
    }
  }
  function cancelAll() {
    Object.keys(c.canceller).forEach((key) => {
      let canceller = c.canceller[key];
      if (canceller) {
      canceller();
      delete c.canceller[key];
      }
    });
  }
  return {
    add: add,
    advance: advance,
    cancel: cancel,
    cancelAll: cancelAll
  };
};

// augment Array with access to first and second of tuple
if (!Array.prototype.first) {
  Array.prototype.first = function () { return this[0]; };
}
if (!Array.prototype.second) {
  Array.prototype.second = function () { return this[1]; };
}

// simple lift
let liftA = (f) => (x, cont, p) => {
  return cont(f(x), p);
};

// asynchronous lift
let liftAsyncA = (f) => (x, cont, p) => {
  let cancelId,
    clear = setTimeout(() => {
    	let result = f(x);
      p.advance(cancelId);
      return cont(result, p);
    }, 0);
  cancelId = p.add(() => clearTimeout(clear));
};

// first f, then g, f and g are arrows
let thenA = (f, g) => (x, cont, p) => {
  return f(x, (x) => {
    return g(x, cont, p);
  }, p);
};

// product assumes a pair
let productA = (f, g) => (x, cont, p) => {
  return f(x.first(), (first) => {
     return g(x.second(), (second) => {
       return cont([first, second], p);
     }, p);
  }, p);
};

let returnA = (x, cont, p) => cont(x, p);

// fan out each arrow gets x
let fanA = (f, g) => thenA(liftA((x) => [x, x]), productA(f, g));

// apply f to only the first of a pair
let firstA = (f) => productA(f, returnA);

// apply g to only the second of a pair
let secondA = (g) => productA(returnA, g);

function Repeat(x) {
  if (this instanceof Repeat) {
    this.x = x;
  } else {
    return new Repeat(x);
  }
}

function Done(x) {
  if (this instanceof Done) {
    this.x = x;
  } else {
    return new Done(x);
  }
}

function repeatA(f) {
  function repeater(x, cont, p) {
    if (x instanceof Repeat) {
        // the repeater will, when Repeating,
        // run f, continuing with the repeater
        return f(x.x, (x) => repeater(x, cont, p), p);
    } else if (x instanceof Done) {
        return cont(x.x, p);
    } else {
        throw new TypeError("Repeat or Done?");
    }
  }
  // return an arrow that runs f, continuing with the repeater
  // which may repeat f, or continue if done
  return thenA(f, repeater);
}

function Left(x) {
  if (this instanceof Left) {
    this.x = x;
  } else {
    return new Left(x);
  }
}

function Right(x) {
  if (this instanceof Right) {
    this.x = x;
  } else {
    return new Right(x);
  }
}

let leftOrRightA = (lorA, leftA, rightA) => (x, cont, p) => {
  return lorA(x, (x) => {
    if (x instanceof Left) {
      return leftA(x.x, cont, p);
    } else if (x instanceof Right) {
      return rightA(x.x, cont, p);
    } else {
      throw new TypeError("Left or Right?");
    }
  }, p);
};

// first to complete cancels the other
// and continues with the result
// use only with asynchronous f and g
let orA = (f, g) => (x, cont, p) => {
    // create a new canceller for arrows run
    let myP = P();
    // add a canceller to p that cancels anything in the new canceller
    let cancelId = p.add(() => myP.cancelAll());
    // first arrow to continue delivers x
    let orContinue = (x) => {
      // cancel the other arrow
      myP.cancelAll();
      // advance p, which removes the canceller in p
      p.advance(cancelId);
      // continue with original p
      return cont(x, p);
    };
    // run f and g with our own canceller
    f(x, orContinue, myP);
    g(x, orContinue, myP);
};

// Augment Function with fluent arrow syntax
if (!Function.prototype.liftA) {
  Function.prototype.liftA = function () { return liftA(this); };
}
if (!Function.prototype.liftAsyncA) {
  Function.prototype.liftAsyncA = function () { return liftAsyncA(this); };
}
if (!Function.prototype.thenA) {
  Function.prototype.thenA = function (g) { return thenA(this, g); };
}
if (!Function.prototype.runA) {
  Function.prototype.runA = function (x, p) { return this(x, () => {}, p); };
}
if (!Function.prototype.firstA) {
  Function.prototype.firstA = function () { return firstA(this); };
}
if (!Function.prototype.secondA) {
  Function.prototype.secondA = function () { return secondA(this); };
}
if (!Function.prototype.fanA) {
  Function.prototype.fanA = function (g) { return fanA(this, g); };
}
if (!Function.prototype.productA) {
  Function.prototype.productA = function (g) { return productA(this, g); };
}
if (!Function.prototype.repeatA) {
  Function.prototype.repeatA = function () { return repeatA(this); };
}
if (!Function.prototype.leftOrRightA) {
  Function.prototype.leftOrRightA = function (f, g) { return leftOrRightA(this, f, g); };
}

function add1(x) {
  return x + 1;
}

function logX(x) {
  console.log('logX', x);
  return x;
}

function doneCheck(x) {
  return x.first() >= 100000 ? Done(x) : Repeat(x);
}

function leftIfOdd(x) {
  if (x%2 === 0) {
    return Right(x);
  } else {
    return Left(x);
  }
}

// // we can use a fluent syntax which is more readable
// let runnable2 =
//   add1.liftAsyncA()
//   .thenA(leftIfOdd.liftAsyncA())
//   .leftOrRightA(returnA, logX.liftAsyncA())
//   .firstA()
//   .thenA(doneCheck.liftAsyncA())
//   .repeatA();

//runnable(5, (x) => console.log('done', x));
let p = P();
//runnable2([0, 'yikes'], (x) => console.log('done', x), p);

// sync and async code can co-exist with this paradigm
// but of course the sync code monopolizes the javascript thread
// so use with caution
let runnable3 =
  add1.liftA()
  .thenA(leftIfOdd.liftA())
  .leftOrRightA(returnA, logX.liftA())
  .firstA()
  .thenA(doneCheck.liftA())
  .repeatA();

//runnable(5, (x) => console.log('done', x));
runnable3([0, 'yikes'], (x) => console.log('done', x), p);
