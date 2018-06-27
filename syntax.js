let produce = require('immer')['default'];

// // requires is a function taking req and res, but not next
// // fail takes req, res and next, but is optional
// // fail must be last or it is ignored
// function MiddleWare(requires, fail) {
//   let mw = function (req, res, next) {
//     if (requires(req, res))
//       next();
//     else {
//       if (fail) {
//         fail(req, res, next);
//       }
//     }
//   };
//   mw.requires = requires;
//   mw.or = function (or) {
//     let that = this;
//     return MiddleWare(function (req, res) {
//       return that.requires(req, res) || or.requires(req, res);
//     });
//   };
//   mw.and = function (and) {
//     let that = this;
//     return MiddleWare(function (req, res) {
//       return that.requires(req, res) && and.requires(req, res);
//     });
//   };
//   mw.fail = function (fail) {
//     let that = this;
//     return MiddleWare(that.requires, fail);
//   };
//   return mw;
// }
//
// Function.prototype.mw = function () {
//   return MiddleWare(this);
// };
//
// Function.prototype.and = (f1, f2) => {
//   return function (req, res) {
//     return f1(req, res) && f2(req, res);
//   };
// };
//
// Function.prototype.or = (f1, f2) => {
//   return function (req, res) {
//     return f1(req, res) || f2(req, res);
//   };
// };
//
// function isAdmin(req, res) {
//   return req.user.isAdmin;
// }
//
// function liftMW(f) {
//   return (req, res, next, fail) => {
//     if (f(req, res)) {
//       next();
//     } else {
//       fail();
//     }
//   };
// }
//
// function orMW(mw1, mw2) {
//   return (req, res, next, fail) => {
//     // if mw1 is true we short-circuit to next
//     // if mw1 is false, we test mw2
//     mw1(req, res, next, () => {
//       mw2(req, res, next, fail);
//     });
//   };
// }
//
// function andMW(mw1, mw2) {
//   return (req, res, next, fail) => {
//     // if mw1 is true we test m2
//     // if mw1 is false we fail
//     mw1(req, res, () => {
//       mw2(req, res, next, fail);
//     }, fail);
//   };
// }
// /* why not just convert to middleWare
// and arrows are our tests
// we get true/false at the end (or error? or failure)
// and terminate with next(400) or something
//
// so we have a boolean result [true, { req, res, next }]
//
// function myfunc(x) {
//   return x +2;
// }
// myfunc.then()
// */
// //instead of myfunc.A.then()
Object.defineProperty(Function.prototype, 'a', {
  get: function () {
    if (!this._a) {
      // if this is a function of three parameters
      // then presume it's an arrow already
      if (this.length === 2) {
        this._a = this;
      } else if (this.length > 1) {
        // ^ note this means functions of 1 or 0 formal params can be lifted
        return Error('incorrect number of parameters');
      } else {
        let that = this;
        let arrow = (x, cont) => {
          cont(that(x));
        }; // set 'A' to an arrow
        arrow._a = arrow; // an arrow self-references
        this._a = arrow;
      }
    }

    return this._a;
  }
});
//
// if arrow constructors used the 'a' property
// then the complexity of arrow v non-arrow is resolved
// in these constructors instead of having syntax sugar
// resolve in the sugar

// first f, then g
let then = (f, g) => (x, cont) => {
  return f.a(x, (x) => {
    return g.a(x, cont);
  });
};


// // run f over x[0] and g over x[1] and continue with [f(x[0]), g(x[1])]
// // product assumes a pair
// let productA = (f, g) => (x, cont, p) => {
//   let myP = P();
//   let cancelId = p.add(() => myP.cancelAll());
//   let fCompleted = false,
//     gCompleted = false,
//     fx, gx;
//
//   let continueIfFinished = () => {
//     if (fCompleted && gCompleted) {
//       p.advance(cancelId);
//       return cont([fx, gx], p);
//     }
//   };
//
//   let contf = (x) => {
//     fCompleted = true;
//     fx = x;
//     return continueIfFinished();
//   };
//
//   let contg = (x) => {
//     gCompleted = true;
//     gx = x;
//     return continueIfFinished();
//   };
//
//   f.a(x.first, contf, p);
//   return g.a(x.second, contg, p);
// };
//

Function.prototype.then = function (g) {
  return then(this.a, g.a);
};

let stateTrack = [];

function doThis(x) {
  // immer wants us to return undefined or a new draft
  // if we don't surround with '{...}' the arrow syntax returns
  // the value - and produce throws
  let newx = produce(x, draft => {
    draft.do += 1;
  });
  stateTrack.push(newx);
  return newx;
}

function doThat(x) {
  let newx = produce(x, d => {
    d.do *= 2;
  });
  stateTrack.push(newx);
  return newx;
}

function doTheOther(x) {
  const newx = produce(x, d => {
    d.do += 5;
  });
  stateTrack.push(newx);
  return newx;
}

const base = {
  do: 0
};
doThis.then(doThat).then(doTheOther)(base, (x) => console.log('base:', base, 'final:', x, 'stack:', stateTrack));

// // or(f1, f2)
// // where f1, f2 are of the form
// // f(req, res, next) and returns a value tested as true
// // creates a middleware from two boolean tests
// Object.defineProperty(MiddleWare.prototype, 'fail', {
//   get: function () {
//     return this[1];
//   }
// });