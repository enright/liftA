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
/*
The Point of No Return

This is the liftA.js library by Bill Enright. It is an implementation of
'asynchronous event arrows' It is a library of function arrows for
high-order functional programming of asynchronous and event-driven work
in JavaScript. This work is an adaptation of the "Arrowlets" library by
Khoo Yit Phang. It attempts to offer a simplified view of arrows so that
you may build on it without being confined by the original style. This
library has fewer features in order to be less opinionated.

With the advent of ES6 implementations that support tail call
optimization (such as the V8 engine) there is no longer a need to use a
trampoline and thunking to achieve continuations, and this greatly
simplifies the implementation of asynchronous event arrows in
JavaScript. Also, the expressiveness of 'arrow function' syntax in ES6
makes the code defining arrows much more readable.

Arrows can be contructed from a variety of included functions, such as
liftA(), thenA(), firstA(), secondA(), productA()
and fanA(). For a visual description of these arrows see arr, >>>,
first, second, *** and &&& here:
https://en.wikibooks.org/wiki/Haskell/Understanding_arrows

orA() executes only one of its arrow arguments (the first to complete - the
other is cancelled). repeatA() allows for looping. bindA() and
joinA() allow you to keep previous results in the data flowing
through the arrows. They are similar to thenA(), but they combine
output variations in a pair.

This library augments Array with a first() and second() function to
support simple semantics for handling tuples. Generally, we assume that
the 'x' - the first parameter when calling a function arrow - is a pair.
firstA() and secondA() construct arrows that operate on one of
the pair, and pass the value of the other of the pair through.

This library also augments Function with a number of useful functions
for building more complex arrows with a fluent syntax. Hence the name of
this library: liftA

A rudimentary mechanism for cancelling arrows is provided.

To Be Continued...
*/
"use strict"; // enables proper tail calls (PTC)

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

// cancellable asynchronous lift
// f is a 'normal' function taking x
// make it behave asynchronously with setTimeout 0
let liftAsyncA = (f) => (x, cont, p) => {
  let cancelId,
    clear = setTimeout(() => {
      let result = f(x);
      p.advance(cancelId);
      cont(result, p);
    }, 0);
  cancelId = p.add(() => clearTimeout(clear));
};

// simple lift
// f is a synchronous function taking x
let liftA = (f) => (x, cont, p) => {
  return cont(f(x), p);
};

// first f, then g, f and g are arrows
let thenA = (f, g) => (x, cont, p) => {
  return f(x, (x) => {
    return g(x, cont, p);
  }, p);
};

// run f over x[0] and g over x[1] and continue with [f(x[0]), g(x[1])]
// product assumes a pair
let productA = (f, g) => (x, cont, p) => {
  let myP = P();
  let cancelId = p.add(() => myP.cancelAll());
  let fCompleted = false,
    gCompleted = false,
    fx, gx;

  let continueIfFinished = () => {
    if (fCompleted && gCompleted) {
      p.advance(cancelId);
      return cont([fx, gx], p);
    }
  };

  let contf = (x) => {
    fCompleted = true;
    fx = x;
    return continueIfFinished();
  };

  let contg = (x) => {
    gCompleted = true;
    gx = x;
    return continueIfFinished();
  };

  f(x.first(), contf, p);
  return g(x.second(), contg, p);
};

// first to complete cancels the other
// and continues with the result
let orA = (f, g) => (x, cont, p) => {
  // create a new canceller for arrows run
  let myP = P();
  // add a canceller to p that cancels anything in the new canceller
  let cancelId = p.add(() => myP.cancelAll());
  let completed = false;
  // first arrow to continue delivers x
  let orContinue = (x) => {
    if (!completed) {
      completed = true;
      // cancel the other arrow
      myP.cancelAll();
      // advance p, which removes the canceller in p
      p.advance(cancelId);
      // continue with original p
      return cont(x, p);
    }
  };
  // run f and g with our own canceller
  f(x, orContinue, myP);
  return g(x, orContinue, myP);
};

// a more durable or that will still "work"
// if f or g may behave synchronously
let orASynch = (f, g) => (x, cont, p) => {
  let isdone = false;
  let doneX;
  let mustContinue = false;
  let myP = P();
  // when f or g completes, we run orContinue
  // which marks us as done, sets X, cancels the opposing arrow
  // and continues with the result and the original p
  let orContinue = (x) => {
    isdone = true;
    doneX = x;
    myP.cancelAll();
    // cope with a possibly synchronous f or g
    // mustcontinue will be false if we ran right through f or g
    if (mustContinue) {
      return cont(doneX, p);
    }
  };
  f(x, orContinue, myP);
  // don't run g if f was synchronous
  if (!isdone) {
    g(x, orContinue, myP);
  }
  // if f or g was synchronous, then this will end with tail call
  if (isdone) {
    return cont(doneX, p);
  }
  // otherwise we are async and don't need to worry about tails
  // just set up the orContinue continuation to continue
  mustContinue = true;
  return;
};

// simply deliver the current x
let returnA = (x, cont, p) => cont(x, p);

// deliver a constant instead of x
let constA = (c) => (x, cont, p) => cont(c, p);

// create an arrow to transform x into [x, x] then product of arrows f and g
let fanA = (f, g) => thenA(liftA((x) => [x, x]), productA(f, g));

let firstA = (f) => productA(f, returnA);

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

let justRepeatA = (x, cont, p) => {
  cont(Repeat(x), p);
};

let justDoneA = (x, cont, p) => {
  cont(Done(x), p);
};

// bind :: AsyncA a b -> AsyncA (a, b) c -> AsyncA a c
let bindA = (f, g) => returnA.fanA(f).thenA(g);

// join :: AsyncA a b -> AsyncA b c -> AsyncA a (Tuple [b, c])
let joinA = (f, g) => f.thenA(returnA.fanA(g));

let delayA = (ms) => (x, cont, p) => {
  let id = setTimeout(() => {
    p.advance(id);
    cont(x, p);
  }, ms);
  let cancelId = p.add(() => {
    clearTimeout(id);
  });
  return cancelId;
};

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

module.exports = () => {
  let p = P();

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

  // Augment Function with fluent arrow syntax
  if (!Function.prototype.liftAsyncA) {
    Function.prototype.liftAsyncA = function () {
      return liftAsyncA(this);
    };
  }

  if (!Function.prototype.liftA) {
    Function.prototype.liftA = function () {
      return liftA(this);
    };
  }

  // a property that provides a lifted version of a function
  // for syntactic convenience
  // only lift a function once
  Object.defineProperty(Function.prototype, 'A', {
    get: function () { // can't use arrow syntax, need correct 'this'
      if (this.liftedA) {
        return this.liftedA;
      } else {
        this.liftedA = liftA(this);
        return this.liftedA;
      }
    }
  });

  if (!Function.prototype.thenA) {
    Function.prototype.thenA = function (g) {
      return thenA(this, g);
    };
  }

  if (!Function.prototype.runA) {
    Function.prototype.runA = function (x) {
      return this(x, () => {}, p);
    };
  }

  if (!Function.prototype.firstA) {
    Function.prototype.firstA = function () {
      return firstA(this);
    };
  }

  // a first property for syntatic convenience
  Object.defineProperty(Function.prototype, 'first', {
    get: function () {
      return firstA(this);
    }
  });

  if (!Function.prototype.secondA) {
    Function.prototype.secondA = function () {
      return secondA(this);
    };
  }

  // a second property for syntatic convenience
  Object.defineProperty(Function.prototype, 'second', {
    get: function () {
      return secondA(this);
    }
  });

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

  if (!Function.prototype.orA) {
    Function.prototype.orA = function (g) {
      return orA(this, g);
    };
  }

  if (!Function.prototype.repeatA) {
    Function.prototype.repeatA = function () {
      return repeatA(this);
    };
  }

  // a repeat property for syntactic convenience
  Object.defineProperty(Function.prototype, 'repeat', {
    get: function () {
      return repeatA(this);
    }
  });

  if (!Function.prototype.leftOrRightA) {
    Function.prototype.leftOrRightA = function (f, g) {
      return leftOrRightA(this, f, g);
    };
  }

  if (!Function.prototype.bindA) {
    Function.prototype.bindA = function (g) {
      return bindA(this, g);
    };
  }

  if (!Function.prototype.joinA) {
    Function.prototype.joinA = function (g) {
      return joinA(this, g);
    };
  }

  Object.defineProperty(Function.prototype, 'leftOnError', {
    get: function () {
      if (!this.leftError) {
        let f = this;
        this.leftError = (x, cont, p) => {
          return f(x, (x, p) => {
            return cont((x instanceof Error) ? Left(x) : Right(x), p);
          }, p);
        };
      }
      return this.leftError;
    }
  });

  Object.defineProperty(Function.prototype, 'errorBarrier', {
    get: function () {
      if (!this.barrier) {
        let f = this;
        this.barrier = (x, cont, p) => {
          if (x instanceof Error) {
            return cont(x, p);
          } else {
            return f(x, cont, p);
          }
        };
      }
      return this.barrier;
    }
  });

  return {
    liftAsyncA: liftAsyncA,
    liftA: liftA,
    returnA: returnA,
    thenA: thenA,
    productA: productA,
    orA: orA,
    fanA: fanA,
    firstA: firstA,
    secondA: secondA,
    bindA: bindA,
    joinA: joinA,
    repeatA: repeatA,
    delayA: delayA,
    Repeat: Repeat,
    Done: Done,
    justRepeatA: justRepeatA,
    justDoneA: justDoneA,
    constA: constA,
    Left: Left,
    Right: Right,
    leftOrRightA: leftOrRightA,
    P: P,
    p: p
  };

};