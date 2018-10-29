![lifta image](https://s3-us-west-1.amazonaws.com/bill-enright-personal/Asset+5.svg)

There are a number of packages/repos related to liftA. This repository provides the high-order functions (combinators) that allow for asynchronous arrow creation and composition. A fluent syntax is available that extends Function.prototype to include properties and functions that provide what I believe is better clarity when constructing asynchronous arrows. For the fluent syntax, please see lifta-syntax.

The Point of No Return

This is the liƒtA JavaScript library by Bill Enright. It is an implementation of
"asynchronous arrows."" It is a library of functions for
high-order functional programming of asynchronous and event-driven work
in JavaScript. Recently I have heard Douglas Crockford refer to this as "eventual programming." I like the way that sounds. This work was inspired by the "Arrowlets" library by
Khoo Yit Phang. It attempts to offer a simplified view of asynchronous arrows so that
you may build on it without being confined by the original style. This
library has fewer features in order to be less opinionated.

With the advent of ES6 implementations that support proper tail calls
(such as the xs engine, iOS and WebKit browser - sadly v8 engine above 7 is still not ES6 compliant)
there is no longer a need to use a
trampoline and thunking to achieve continuations, and this greatly
simplifies the implementation of asynchronous arrows in
JavaScript. Also, the expressiveness of "fat arrow" function syntax in ES6
makes the code defining asynchronous arrows much more readable. For example:

```javascript
// first f, then g, f and g are arrows
let thenA = (f, g) => (x, cont, p) => {
  return f(x, (x) => {
    return g(x, cont, p);
  }, p);
};
```
Asynchronous arrows can be constructed from a variety of included functions, such as
liftA(), thenA(), firstA(), secondA(), productA()
and fanA(). For a visual description of these see arr, >>>,
first, second, *** and &&& here:
https://en.wikibooks.org/wiki/Haskell/Understanding_arrows

eitherA() executes only one of its arguments (the first to complete - the
other is cancelled). repeatA() allows for looping. leftOrRightA() supports conditionals.

This library augments Array.prototype with a "first" and "second" property to
support simple semantics for handling tuples. Generally, we assume that
the 'x' - the first parameter when calling an asynchronous arrow - is a pair.
firstA() and secondA() construct asynchronous arrows that operate on one of
the pair, and pass the value of the other of the pair through.

A simple mechanism - provided by "P" - for cancelling asynchronous arrows 'in flight' is provided.

To Be Continued...
