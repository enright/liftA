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

let p = (function () {
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
}());

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
    return cancelId;
  };

// simple lift
// f is a synchronous function taking x
let liftA = (f) => (x, cont, p) => {
    cont(f(x), p);
  };

// cancellable then
// f and g are arrows
let thenA = (f, g) => (x, cont, p) => {
    let c1, c2, cancelId;
    c1 = f(x, (x) => {
      c1 = undefined;
      c2 = g(x, (x) => {
        p.advance(cancelId);
        cont(x, p);
      }, p);
    }, p);
    cancelId = p.add(() => {
      if (c1) { p.cancel(c1); }
      if (c2) { p.cancel(c2); }
    });
    return cancelId;
  };

// run f over x[0] and g over x[1] and continue with [f(x[0]), g(x[1])]
let productA = (f, g) => (x, cont, p) => {
    let pair = [undefined, undefined],
      pairSet = [false, false],
      c1, c2, cancelId;
    // run arrows. continue when both are done
    c1 = f(x.first(), (x) => {
      pair[0] = x;
      pairSet[0] = true;
      if (pairSet[1]) {
        if (cancelId) {
          p.advance(cancelId);
        }
        cont(pair, p);
      }
    }, p);
    c2 = g(x.second(), (x) => {
      pair[1] = x;
      pairSet[1] = true;
      if (pairSet[0]) {
        if (cancelId) {
          p.advance(cancelId);
        }
        cont(pair, p);
      }
    }, p);
    if (!(pairSet[0] && pairSet[1])) {
      cancelId = p.add(() => {
        p.cancel(c1);
        p.cancel(c2);
      });
    }
    return cancelId;
  };

let orA = (f, g) => (x, cont, p) => {
    let done = false,
      c1, c2, cancelId;
    // run arrows. continue when one is done
    // do not continue with the other
    c1 = f(x, (x) => {
      if (!done) {
        done = true;
        p.advance(cancelId);
        p.advance(c1);
        p.cancel(c2);
        cont(x, p);
      }
    }, p);
    c2 = g(x, (x) => {
      if (!done) {
        done = true;
        p.advance(cancelId);
        p.advance(c2);
        p.cancel(c1);
        cont(x, p);
      }
    }, p);
    cancelId = p.add(() => {
      p.cancel(c1);
      p.cancel(c2);
    });
    return cancelId;
  };

// create an arrow to transform x into [x, x] then product of arrows f and g
let fanA = (f, g) => thenA(liftA((x) => [x, x]), productA(f, g));

let firstA = (f) => productA(f, (x, cont, p) => cont(x, p));

let secondA = (g) => productA((x, cont, p) => cont(x, p), g);

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
    let first = x.first(),
      second = x.second();
    if (second instanceof Repeat) {
        // the repeater will, when Repeating,
        // run f, continuing with the repeater
        f([first, second.x], (x) => repeater(x, cont, p), p);
    } else if (second instanceof Done) {
        cont([first, second.x], p);
    } else {
        throw new TypeError("Repeat or Done?");
    }
  }
  // run f, continuing with the repeater
  return thenA(f, repeater);
}

let returnA = liftA((x) => x);

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

let justRepeatA = (x, cont, p) => {
  cont([undefined, ArrRepeat(x)]);
};

let justDoneA = (x, cont, p) => {
  cont([undefined, ArrDone(x)]);
};

let constA = (value) => (x, cont, p) => {
  cont(value, p);
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

function Error (error, x) {
  if (this instanceof Error) {
    this.error = error;
    this.x = x;
  } else {
    return new Error(error, x);
  }
}

let leftOrRightA = (lorA, leftA, rightA) => (x, cont, p) => {
  let c1, c2, cancelId;
  let leftOrRight = (lor, p) => {
    if (lor instanceof Left) {
      c2 = leftA(lor.x, cont, p);
    } else if (lor instanceof Right){
      c2 = rightA(lor.x, cont, p);
    } else {
      throw new TypeError("Left or Right?");
    }
  };
  c1 = lorA(x, leftOrRight, p);
  cancelId = p.add(() => {
    p.cancel(c1);
    if (c2) {
      p.cancel(c2);
    }
  });
  return cancelId;
};

module.exports = () => {

	// augment Array with access to first and second of tuple
	if (!Array.prototype.first) {
	  Array.prototype.first = function () { return this[0]; };
	}
	if (!Array.prototype.second) {
	  Array.prototype.second = function () { return this[1]; };
	}

	// Augment Function with fluent arrow syntax
	if (!Function.prototype.liftAsyncA) {
		Function.prototype.liftAsyncA = function () { return liftAsyncA(this); };
	};
	if (!Function.prototype.liftA) {
		Function.prototype.liftA = function () { return liftA(this); };
	};
	if (!Function.prototype.thenA) {
		Function.prototype.thenA = function (g) { return thenA(this, g); };
	};
	if (!Function.prototype.runA) {
		Function.prototype.runA = function (x) { return this(x, () => {}, p); };
	};
	if (!Function.prototype.firstA) {
		Function.prototype.firstA = function () { return firstA(this); };
	};
	if (!Function.prototype.secondA) {
		Function.prototype.secondA = function () { return secondA(this); };
	};
	if (!Function.prototype.fanA) {
		Function.prototype.fanA = function (g) { return fanA(this, g); };
	};
	if (!Function.prototype.productA) {
		Function.prototype.productA = function (g) { return productA(this, g); };
	};
	if (!Function.prototype.orA) {
		Function.prototype.orA = function (g) { return orA(this, g); };
	};
	if (!Function.prototype.repeatA) {
	Function.prototype.repeatA = function () { return repeatA(this); };
	};
	if (!Function.prototype.bindA) {
		Function.prototype.bindA = function (g) { return bindA(this, g); };
	};
	if (!Function.prototype.joinA) {
		Function.prototype.joinA = function (g) { return joinA(this, g); };
	};

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
    Error: Error,
    leftOrRightA: leftOrRightA,
		p: p
	};

};
