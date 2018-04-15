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

// augment Array with access to first and second of tuple
if (!Array.prototype.first) {
  Array.prototype.first = function () {
    return this[0];
  };
}
if (!Array.prototype.second) {
  Array.prototype.second = function () {
    return this[1];
  };
}

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

// product assumes a pair
let productA = (f, g) => (x, cont) => {
  return f(x.first(), (first) => {
    return g(x.second(), (second) => {
      return cont([first, second]);
    });
  });
};

// fan out each arrow gets x
let fanA = (f, g) => thenA(liftA((x) => [x, x]), productA(f, g));

// apply f to only the first of a pair
let firstA = (f) => productA(f, (x, cont) => cont(x));

// apply g to only the second of a pair
let secondA = (g) => productA((x, cont) => cont(x), g);

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
  function repeater(x, cont) {
    if (x instanceof Repeat) {
      // the repeater will, when Repeating,
      // run f, continuing with the repeater
      return f(x.x, (x) => repeater(x, cont));
    } else if (x instanceof Done) {
      return cont(x.x);
    } else {
      throw new TypeError({
        message: "Repeat or Done?",
        x: x
      });
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

let leftOrRightA = (lorA, leftA, rightA) => (x, cont) => {
  return lorA(x, (x) => {
    if (x instanceof Left) {
      return leftA(x.x, cont);
    } else if (x instanceof Right) {
      return rightA(x.x, cont);
    } else {
      throw new TypeError("Left or Right?");
    }
  });
};

// Augment Function with fluent arrow syntax
if (!Function.prototype.liftA) {
  Function.prototype.liftA = function () {
    return liftA(this);
  };
}
if (!Function.prototype.thenA) {
  Function.prototype.thenA = function (g) {
    return thenA(this, g);
  };
}
if (!Function.prototype.runA) {
  Function.prototype.runA = function (x) {
    return this(x, () => {});
  };
}
if (!Function.prototype.firstA) {
  Function.prototype.firstA = function () {
    return firstA(this);
  };
}
if (!Function.prototype.secondA) {
  Function.prototype.secondA = function () {
    return secondA(this);
  };
}
if (!Function.prototype.fanA) {
  Function.prototype.fanA = function (g) {
    return fanA(this, g);
  };
}
if (!Function.prototype.productA) {
  Function.prototype.productA = function (g) {
    return productA(this, g);
  };
}
if (!Function.prototype.repeatA) {
  Function.prototype.repeatA = function () {
    return repeatA(this);
  };
}
if (!Function.prototype.leftOrRightA) {
  Function.prototype.leftOrRightA = function (f, g) {
    return leftOrRightA(this, f, g);
  };
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

// note the use of 'firstA'
let runnable2 = repeatA(thenA(firstA(thenA(liftA(add1), liftA(logX))), liftA(doneCheck)));

// we pass the 'hello' context 'around' add1 and logX
// this is merely an example to show that other data can flow along through the arrow
runnable2([5, 'hello'], (x) => console.log('done', x));

function leftIfOdd(x) {
  if (x % 2 === 0) {
    return Right(x);
  } else {
    return Left(x);
  }
}

// a utility arrow that simply delivers x to the continuation
// in other words...it doesn't really do anything!
let returnA = (x, cont) => cont(x);

// we can use a fluent syntax which is more readable
let runnable3 =
  add1.liftA()
  .thenA(leftIfOdd.liftA())
  .leftOrRightA(returnA, logX.liftA())
  .firstA()
  .thenA(doneCheck.liftA())
  .repeatA();

//runnable(5, (x) => console.log('done', x));
runnable3([99992, 'yikes'], (x) => console.log('done', x));