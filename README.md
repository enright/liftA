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
https://en.wikibooks.org/wiki/Haskell/Understanding_arrows orArrow()
executes only one of its arrow arguments (the first to complete - the
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
