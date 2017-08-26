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
liftArrow(), thenArrow(), firstArrow(), secondArrow(), productArrow()
and fanArrow(). For a visual description of these arrows see arr, >>>,
first, second, *** and &&& here:
https://en.wikibooks.org/wiki/Haskell/Understanding_arrows

orArrow() executes only one of its arrow arguments (the first to complete - the
other is cancelled). repeatArrow() allows for looping. bindArrow() and
joinArrow() allow you to keep previous results in the data flowing
through the arrows. They are similar to thenArrow(), but they combine
output variations in a pair.

This library augments Array with a first() and second() function to
support simple semantics for handling tuples. Generally, we assume that
the 'x' - the first parameter when calling a function arrow - is a pair.
firstArrow() and secondArrow() construct arrows that operate on one of
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

// f is a 'normal' function taking x
let liftArrow = (f) => (x, cont, p) => {
    let cancelId,
      clear = setImmediate(() => {
      	let result = f(x);
        p.advance(cancelId)
        cont(result, p);
      });
    cancelId = p.add(() => clearImmediate(clear));
    return cancelId;
  };

// f and g are arrows
let thenArrow = (f, g) => (x, cont, p) => {
    let c1, c2, cancelId;
    c1 = f(x, (x) => {
      c1 = undefined;
      c2 = g(x, (x) => {
        p.advance(cancelId);
        cont(x, p);
      }, p);
    }, p);
    cancelId = p.add(() => {
      c1 && p.cancel(c1);
      c2 && p.cancel(c2);
    });
    return cancelId;
  };

// run f over x[0] and g over x[1] and continue with [f(x[0]), g(x[1])]
let productArrow = (f, g) => (x, cont, p) => {
    let pair = [undefined, undefined],
      c1, c2, cancelId;
    // run arrows. continue when both are done
    c1 = f(x.first(), (x) => {
      pair[0] = x;
      if (pair[1] !== undefined) {
        p.advance(cancelId);
        cont(pair, p);
      }
    }, p);
    c2 = g(x.second(), (x) => {
      pair[1] = x;
      if (pair[0] !== undefined) {
        p.advance(cancelId);
        cont(pair, p);
      }
    }, p);
    cancelId = p.add(() => {
      p.cancel(c1);
      p.cancel(c2);
    });
    return cancelId;
  };

let orArrow = (f, g) => (x, cont, p) => {
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
    });
    c2 = g(x, (x) => {
      if (!done) {
        done = true;
        p.advance(cancelId);
        p.advance(c2);
        p.cancel(c1);
        cont(x, p);
      }
    });
    cancelId = p.add(() => {
      p.cancel(c1);
      p.cancel(c2);
    });
    return cancelId;
  };

// create an arrow to transform x into [x, x] then product of arrows f and g
let fanArrow = (f, g) => thenArrow(liftArrow((x) => [x, x]), productArrow(f, g));

let firstArrow = (f) => productArrow(f, (x, cont, p) => cont(x, p));

let secondArrow = (g) => productArrow((x, cont, p) => cont(x, p), g);

function ArrRepeat() { }
function ArrDone() { }

function repeatArrow(f) {
  function repeater(x, cont, p) {
    let second = x.second();
    if (second === ArrRepeat) {
        // the repeater will, when Repeating,
        // run f, continuing with the repeater
        f(x, (x) => repeater(x, cont, p), p);
    } else if (second === ArrDone) {
        cont(x, p);
    } else {
        throw new TypeError("Repeat or Done?");
    }
  }
  // run f, continuing with the repeater
  return thenArrow(f, repeater);
}

let returnArrow = liftArrow((x) => x);

// bind :: AsyncA a b -> AsyncA (a, b) c -> AsyncA a c
let bindArrow = (f, g) => returnArrow.fanA(f).thenA(g);

// join :: AsyncA a b -> AsyncA b c -> AsyncA a (Tuple [b, c])
let joinArrow = (f, g) => f.thenA(returnArrow.fanA(g));

let delayArrow = (ms) => (x, cont, p) => {
	let id = setTimeout(() => {
		p.advance(id);
		cont(x, p);
	}, ms);
	let cancelId = p.add(() => {
		clearTimeout(id);
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
	if (!Function.prototype.liftA) {
		Function.prototype.liftA = function () { return liftArrow(this); };
	};
	if (!Function.prototype.thenA) {
		Function.prototype.thenA = function (g) { return thenArrow(this, g); };
	};
	if (!Function.prototype.runA) {
		Function.prototype.runA = function (x) { return this(x, (x) => console.log ('x: ', x), p); };
	};
	if (!Function.prototype.firstA) {
		Function.prototype.firstA = function () { return firstArrow(this); };
	};
	if (!Function.prototype.secondA) {
		Function.prototype.secondA = function () { return secondArrow(this); };
	};
	if (!Function.prototype.fanA) {
		Function.prototype.fanA = function (g) { return fanArrow(this, g); };
	};
	if (!Function.prototype.productA) {
		Function.prototype.productA = function (g) { return productArrow(this, g); };
	};
	if (!Function.prototype.orA) {
		Function.prototype.orA = function (g) { return orArrow(this, g); };
	};
	if (!Function.prototype.repeatA) {
	Function.prototype.repeatA = function () { return repeatArrow(this); };
	};
	if (!Function.prototype.bindA) {
		Function.prototype.bindA = function (g) { return bindArrow(this, g); };
	};
	if (!Function.prototype.joinA) {
		Function.prototype.joinA = function (g) { return joinArrow(this, g); };
	};

	return {
		liftArrow: liftArrow,
		returnArrow: returnArrow,
		thenArrow: thenArrow,
		productArrow: productArrow,
		orArrow: orArrow,
		fanArrow: fanArrow,
		firstArrow: firstArrow,
		secondArrow: secondArrow,
		bindArrow: bindArrow,
		joinArrow: joinArrow,
		repeatArrow: repeatArrow,
		delayArrow: delayArrow,
		ArrRepeat: ArrRepeat,
		ArrDone: ArrDone,
		p: p
	};

}
