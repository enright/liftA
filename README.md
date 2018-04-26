The Point of No Return

This is the liƒtA JavaScript library by Bill Enright. It is an implementation of
'asynchronous arrows.' It is a library of function arrows for
high-order functional programming of asynchronous and event-driven work
in JavaScript. This work was inspired by the "Arrowlets" library by
Khoo Yit Phang. It attempts to offer a simplified view of arrows so that
you may build on it without being confined by the original style. This
library has fewer features in order to be less opinionated.

With the advent of ES6 implementations that support proper tail calls
(such as the xs engine, iOS and WebKit browser - sadly not v8 engine above 7)
there is no longer a need to use a
trampoline and thunking to achieve continuations, and this greatly
simplifies the implementation of asynchronous event arrows in
JavaScript. Also, the expressiveness of 'arrow function' syntax in ES6
makes the code defining arrows much more readable. For example:

// first f, then g, f and g are arrows
let thenA = (f, g) => (x, cont, p) => {
  return f(x, (x) => {
    return g(x, cont, p);
  }, p);
};

Arrows can be contructed from a variety of included functions, such as
liftA(), thenA(), firstA(), secondA(), productA()
and fanA(). For a visual description of these arrows see arr, >>>,
first, second, *** and &&& here:
https://en.wikibooks.org/wiki/Haskell/Understanding_arrows

orA() executes only one of its arrow arguments (the first to complete - the
other is cancelled). repeatA() allows for looping. leftOrRightA() supports conditionals.

This library augments Array with a first() and second() function to
support simple semantics for handling tuples. Generally, we assume that
the 'x' - the first parameter when calling a function arrow - is a pair.
firstA() and secondA() construct arrows that operate on one of
the pair, and pass the value of the other of the pair through.

This library also augments Function with a number of useful functions
for building more complex arrows with a fluent syntax. For example:

let batchUserQueryA = createBatchUserQuery.liftA()
  .thenA(doca.batchGetA.firstA())
  .thenA(arwu.promoteIfErrorA);

A simple mechanism for cancelling arrows 'in flight' is provided.

To Be Continued...
