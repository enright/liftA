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

  f(x.first, contf, p);
  return g(x.second, contg, p);
};

// first to complete cancels the other
// and continues with the result
let eitherA = (f, g) => (x, cont, p) => {
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

// a more durable either that will still "work"
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

// create an arrow to transform x into [x, x] then product of arrows f and g
// the fanned arrows should be returning new objects or values
let fanA = (f, g) => thenA(liftA((x) => [x, x]), productA(f, g));

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

// simply deliver the current x
let returnA = (x, cont, p) => cont(x, p);

// deliver a constant instead of x
let constA = (c) => (x, cont, p) => cont(c, p);

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

function promoteError(x) {
  let first = x.first;
  if (first instanceof Error) {
    first.x = [first.x, x.second];
    return first;
  } else {
    return x;
  }
}

let fanAndReducePairA = (f, g, r) => {
  return f.a.fan(g.a).then(r.a);
};

let falseA = (g) => {
  return (x, cont, p) => {
    if (!x.first) {
      return g(x, cont, p);
    } else {
      return cont(x, p);
    }
  };
};

let trueA = (g) => {
  return (x, cont, p) => {
    if (x.first) {
      return g(x, cont, p);
    } else {
      return cont(x, p);
    }
  };
};

let notA = (x, cont, p) => {
  cont([!x.first, x.second], p);
};

let falseErrorA = (x, cont, p) => {
  cont(x.first === false ? Error(x) : x, p);
};

function reduceOr(x) {
  return [x.first.first || x.second.first, x.first.second];
}

function reduceAnd(x) {
  return [x.first.first && x.second.first, x.first.second];
}

module.exports = () => {
  let p = P();

  // augment Array with access to first and second of tuple
  Object.defineProperty(Array.prototype, 'first', {
    get: function () {
      return this[0];
    }
  });

  Object.defineProperty(Array.prototype, 'second', {
    get: function () {
      return this[1];
    }
  });

  Object.defineProperty(Function.prototype, 'a', {
    get: function () {
      if (!this._a) {
        // if this is a function of three parameters
        // then presume it's an arrow already
        if (this.length === 3) {
          this._a = this;
        } else if (this.length > 1) {
          // ^ note this means functions of 1 or 0 formal params can be lifted
          return Error('incorrect number of parameters');
        } else {
          let that = this;
          let arrow = (x, cont, p) => {
            cont(that(x), p);
          }; // set 'A' to an arrow
          arrow._a = arrow; // an arrow self-references
          this._a = arrow;
        }
      }
      return this._a;
    }
  });

  if (!Function.prototype.then) {
    Function.prototype.then = function (g) {
      return thenA(this.a, g.a);
    };
  }

  if (!Function.prototype.run) {
    Function.prototype.run = function (x) {
      let p = P();
      this.a(x, () => {}, p);
      return p;
    };
  }

  // a first property for syntatic convenience
  Object.defineProperty(Function.prototype, 'first', {
    get: function () {
      return firstA(this.a);
    }
  });

  // a second property for syntatic convenience
  Object.defineProperty(Function.prototype, 'second', {
    get: function () {
      return secondA(this.a);
    }
  });

  if (!Function.prototype.fan) {
    Function.prototype.fan = function (g) {
      return fanA(this.a, g.a);
    };
  }

  if (!Function.prototype.product) {
    Function.prototype.product = function (g) {
      return productA(this.a, g.a);
    };
  }

  if (!Function.prototype.either) {
    Function.prototype.either = function (g) {
      return eitherA(this, g);
    };
  }

  // a repeat property for syntactic convenience
  Object.defineProperty(Function.prototype, 'repeat', {
    get: function () {
      return repeatA(this.a);
    }
  });

  if (!Function.prototype.lor) {
    Function.prototype.lor = function (f, g) {
      return leftOrRightA(this.a, f.a, g.a);
    };
  }

  Object.defineProperty(Function.prototype, 'falseError', {
    get: function () {
      return this.a.then(falseErrorA);
    }
  });


  Object.defineProperty(Function.prototype, 'promoteError', {
    get: function () {
      return this.a.then(promoteError.a);
    }
  });

  Object.defineProperty(Function.prototype, 'leftError', {
    get: function () {
      if (!this._leftError) {
        let f = this.a;
        this._leftError = (x, cont, p) => {
          return f(x, (x, p) => {
            return cont((x instanceof Error) ? Left(x) : Right(x), p);
          }, p);
        };
      }
      return this._leftError;
    }
  });

  Object.defineProperty(Function.prototype, 'barrier', {
    get: function () {
      if (!this._barrier) {
        let f = this.a;
        this._barrier = (x, cont, p) => {
          if (x instanceof Error) {
            return cont(x, p);
          } else {
            return f(x, cont, p);
          }
        };
      }
      return this._barrier;
    }
  });

  if (!Function.prototype.or) {
    Function.prototype.or = function (g) {
      return fanAndReducePairA(this, g, reduceOr);
    };
  }

  if (!Function.prototype.and) {
    Function.prototype.and = function (g) {
      return fanAndReducePairA(this, g, reduceAnd);
    };
  }

  // allow not to be set
  Object.defineProperty(Function.prototype, 'not', {
    get: function () {
      if (this._not === undefined) {
        return this.a.then(notA);
      } else {
        return this._not;
      }
    },
    set: (v) => this._not = v
  });

  if (!Function.prototype.false) {
    Function.prototype.false = function (g) {
      return this.a.then(falseA(g.a));
    };
  }

  if (!Function.prototype.true) {
    Function.prototype.true = function (g) {
      return this.a.then(trueA(g.a));
    };
  }

  return {
    liftAsyncA: liftAsyncA,
    liftA: liftA,
    thenA: thenA,
    productA: productA,
    eitherA: eitherA,
    orSynchA: orASynch,
    fanA: fanA,
    delayA: delayA,
    returnA: returnA,
    constA: constA,
    firstA: firstA,
    secondA: secondA,
    Repeat: Repeat,
    Done: Done,
    repeatA: repeatA,
    justRepeatA: justRepeatA,
    justDoneA: justDoneA,
    Left: Left,
    Right: Right,
    leftOrRightA: leftOrRightA,
    promoteErrorA: promoteError.a,
    falseA: falseA,
    trueA: trueA,
    notA: notA,
    falseErrorA: falseErrorA,
    P: P,
    p: p
  };

};