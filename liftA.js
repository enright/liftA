/*
MIT License

Copyright (c) 2017-2018 Bill Enright

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
(function () {
  "use strict"; // enables proper tail calls (PTC) in ES6

  // augment Array with access to first and second of tuple
  if (!Array.prototype.first) {
    Object.defineProperty(Array.prototype, 'first', {
      get: function () {
        return this[0];
      }
    });
  }

  if (!Array.prototype.second) {
    Object.defineProperty(Array.prototype, 'second', {
      get: function () {
        return this[1];
      }
    });
  }

  let P = function () {
    let counter = 0;
    let cancellers = {};

    function add(f) {
      let key = (counter += 1).toString(); //uuid?
      cancellers[key] = f;
      return key;
    }

    function advance(key) {
      delete cancellers[key];
    }

    function cancel(key) {
      let canceller = cancellers[key];
      if (canceller) {
        canceller();
        delete cancellers[key];
      }
    }

    function cancelAll() {
      Object.keys(cancellers).forEach((key) => {
        let canceller = cancellers[key];
        if (canceller) {
          canceller();
          delete cancellers[key];
        }
      });
    }

    return Object.freeze({
      add,
      advance,
      cancel,
      cancelAll
    });
  };

  // cancellable asynchronous lift
  // f is a 'normal' function taking x
  // make it behave asynchronously with setTimeout 0
  let liftAsyncA = (f) => (x, cont, p) => {
    let cancelId;
    let clear = setTimeout(() => {
      let result = f(x);
      p.advance(cancelId);
      return cont(result, p);
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
    let fCompleted = false;
    let gCompleted = false;
    let fx;
    let gx;

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
    return g(x, orContinue, myP);
  };

  // a more durable either that will still "work"
  // if f or g may behave synchronously
  let eitherSyncA = (f, g) => (x, cont, p) => {
    let isdone = false;
    let doneX;
    let mustContinue = false;
    let myP = P();
    // add a canceller to p that cancels anything in the new canceller
    let cancelId = p.add(() => myP.cancelAll());
    // when f or g completes, we run orContinue
    // which marks us as done, sets X, cancels the opposing arrow
    // and continues with the result and the original p
    let orContinue = (x) => {
      isdone = true;
      doneX = x;
      myP.cancelAll();
      p.advance(cancelId);
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
    let cancelId;
    let id = setTimeout(() => {
      p.advance(cancelId);
      return cont(x, p);
    }, ms);
    cancelId = p.add(() => {
      clearTimeout(id);
    });
  };

  // simply deliver the current x
  let returnA = (x, cont, p) => {
    return cont(x, p);
  };

  // deliver a constant instead of x
  let constA = (c) => (x, cont, p) => {
    return cont(c, p);
  };

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
    return cont(Repeat(x), p);
  };

  let justDoneA = (x, cont, p) => {
    return cont(Done(x), p);
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
    return cont([!x.first, x.second], p);
  };

  let falseErrorA = (x, cont, p) => {
    let contX = x;
    if (x.first === false) {
      contX = Error(false);
      contX.x = x;
    }
    return cont(contX, p);
  };

  module.exports = Object.freeze({
    liftAsyncA,
    liftA,
    thenA,
    productA,
    eitherA,
    eitherSyncA,
    fanA,
    delayA,
    returnA,
    constA,
    firstA,
    secondA,
    Repeat,
    Done,
    repeatA,
    justRepeatA,
    justDoneA,
    Left,
    Right,
    leftOrRightA,
    falseA,
    trueA,
    notA,
    falseErrorA,
    P
  });

}());