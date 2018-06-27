/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
let lifta = require('../lifta.js')();
let expect = require('chai').expect;
let produce = require('immer').default;

// is it really kosher to test an implementation detail? no...
describe('property a', () => {
  it('adds a property _a to a unary function when property a is accessed', () => {
    let aFunction = function (x) {
      return x;
    };
    expect(aFunction).to.not.have.property('_a');
    let arrow = aFunction.a;
    expect(aFunction).to.have.property('_a');
  });
  it('adds a property _a to an arity of 3 function when property a is accessed', () => {
    let aFunction = function (x, cont, p) {
      cont(x, p);
    };
    expect(aFunction).to.not.have.property('_a');
    let arrow = aFunction.a;
    expect(aFunction).to.have.property('_a');
  });
  it('does not add a property _a to an arity of 2 function when property a is accessed', () => {
    let aFunction = function (x, y) {
      return x * y;
    };
    let arrow = aFunction.a;
    expect(aFunction).to.not.have.property('_a');
  });
  it('is undefined for an arity of 2 function', () => {
    let aFunction = function (x, y) {
      return x * y;
    };
    expect(aFunction.a).to.be.instanceof(Error);
  });
  it('should have an arity of 3', () => {
    let aFunction = function (x) {
      return x;
    };
    let arrow = aFunction.a;
    expect(arrow).to.have.property('length').equal(3);
  });
  it('if function is arity of 3 then property a points to itself', () => {
    let aFunction = function (x, cont, p) {
      cont(x, p);
    };
    let arrow = aFunction.a;
    expect(arrow).to.equal(aFunction);
  });
});

describe('then', () => {
  it('creates an arrow and execs unary f (this) then unary g continuing with g(f(x))', (done) => {
    let fFunction = (x) => {
      expect(x).to.not.have.property('gexec'); //should.not.exist(x.gexec);
      x.fexec = true;
      return x;
    };
    let gFunction = (x) => {
      expect(x.fexec).to.be.true;
      x.gexec = true;
      return x;
    };
    let arrow = fFunction.then(gFunction);
    arrow({}, (x) => {
      expect(x.fexec).to.be.true;
      expect(x.gexec).to.be.true;
      done();
    }, lifta.P());
  });
  it('creates an arrow and execs arrow f (this) then arrow g continuing with g(f(x))', (done) => {
    let fArrow = (x, cont, p) => {
      setTimeout(() => {
        expect(x).to.not.have.property('gexec');
        x.fexec = true;
        return cont(x, p);
      }, 0);
    };
    let gArrow = (x, cont, p) => {
      setTimeout(() => {
        expect(x.fexec).to.be.true;
        x.gexec = true;
        return cont(x, p);
      }, 0);
    };
    let arrow = fArrow.then(gArrow);
    arrow({}, (x) => {
      expect(x.fexec).to.be.true;
      expect(x.gexec).to.be.true;
      done();
    }, lifta.P());
  });
});

describe('first', () => {
  it('runs f over x[0] and returns [x, x[1]]', (done) => {
    let fFunction = (x) => {
      return x + 2;
    };
    let arrow = fFunction.first;
    arrow([20, 30], (x) => {
      expect(x[0]).to.equal(22);
      expect(x[1]).to.equal(30);
      done();
    }, lifta.P());
  });
});

describe('second', () => {
  it('runs f over x[1] and returns [x[0], x]', (done) => {
    let fFunction = (x) => {
      return x + 2;
    };
    let arrow = fFunction.second;
    arrow([20, 30], (x) => {
      expect(x[0]).to.equal(20);
      expect(x[1]).to.equal(32);
      done();
    }, lifta.P());
  });
});

describe('fan', () => {
  it('creates an arrow and execs unary f (this) over x and unary g over x continuing with [f(x), g(x)]', (done) => {
    let fFunction = (x) => {
      return {
        value: x.value / 10
      };
    };
    let gFunction = (x) => {
      return {
        value: x.value + 2
      };
    };
    let arrow = fFunction.fan(gFunction);
    arrow({
      value: 20
    }, (x) => {
      expect(x[0]).to.not.equal(x[1]);
      expect(x[0].value).to.equal(2);
      expect(x[1].value).to.equal(22);
      done();
    }, lifta.P());
  });
  it('creates an arrow and execs arrow f (this) over x and arrow g over x continuing with [f(x), g(x)]', (done) => {
    let fArrow = (x, cont, p) => {
      setTimeout(() => {
        cont({
          value: x.value / 10
        }, p);
      }, 0);
    };
    let gArrow = (x, cont, p) => {
      setTimeout(() => {
        cont({
          value: x.value + 2
        }, p);
      }, 0);
    };
    let arrow = fArrow.fan(gArrow);
    arrow({
      value: 20
    }, (x) => {
      expect(x[0]).to.not.equal(x[1]);
      expect(x[0].value).to.equal(2);
      expect(x[1].value).to.equal(22);
      done();
    }, lifta.P());
  });

  it('creates an arrow and execs arrow f (this) over x and arrow g over x continuing with [f(x), g(x)] using immutable x', (done) => {
    // this example uses immer to ensure x is immutable
    let fArrow = (x, cont, p) => {
      setTimeout(() => {
        return cont(produce(x, d => {
          d.value = d.value / 10;
        }), p);
      }, 0);
    };
    let gArrow = (x, cont, p) => {
      setTimeout(() => {
        return cont(produce(x, d => {
          d.value = d.value + 2;
        }), p);
      }, 0);
    };
    let arrow = fArrow.fan(gArrow);
    arrow({
      value: 20
    }, (x) => {
      expect(x[0]).to.not.equal(x);
      expect(x[1]).to.not.equal(x);
      expect(x[0]).to.not.equal(x[1]);
      expect(x[0].value).to.equal(2);
      expect(x[1].value).to.equal(22);
      done();
    }, lifta.P());
  });
});

describe('product', () => {
  it('creates an arrow and execs unary f (this) over x[0] and unary g over x[1] continuing with [f(x[0]), g(x[1])]', (done) => {
    let fFunction = (x) => {
      x.fexec = true;
      return x;
    };
    let gFunction = (x) => {
      x.gexec = true;
      return x;
    };
    let arrow = fFunction.product(gFunction);
    // tuple is expected and required
    arrow([{}, {}], (x) => {
      expect(x[0].fexec).to.equal(true);
      expect(x[0]).to.not.have.property('gexec');
      expect(x[1].gexec).to.equal(true);
      expect(x[1]).to.not.have.property('fexec');
      done();
    }, lifta.P());
  });
  it('creates an arrow and execs arrow f (this) over x[0] and arrow g over x[1] continuing with [f(x[0]), g(x[1])]', (done) => {
    let fArrow = (x, cont, p) => {
      setTimeout(() => {
        x.fexec = true;
        return cont(x, p);
      }, 0);
    };
    let gArrow = (x, cont, p) => {
      setTimeout(() => {
        x.gexec = true;
        return cont(x, p);
      }, 0);
    };
    let arrow = fArrow.product(gArrow);
    // tuple is expected and required
    arrow([{}, {}], (x) => {
      expect(x[0].fexec).to.equal(true);
      expect(x[0]).to.not.have.property('gexec');
      expect(x[1].gexec).to.equal(true);
      expect(x[1]).to.not.have.property('fexec');
      done();
    }, lifta.P());
  });
});

describe('either', () => {
  it('creates an arrow and runs arrow f over x and arrow g over x and continues with the first to finish f', (done) => {
    let fArrow = (x, cont, p) => {
      let canceller;
      let timeout = setTimeout(() => {
        p.advance(canceller);
        x.fexec = true;
        return cont(x, p);
      }, 1000);
      canceller = p.add(() => clearTimeout(timeout));
    };
    let gArrow = (x, cont, p) => {
      let canceller;
      let timeout = setTimeout(() => {
        p.advance(canceller);
        x.gexec = true;
        return cont(x, p);
      }, 0);
      canceller = p.add(() => clearTimeout(timeout));
    };
    let arrow = fArrow.either(gArrow);
    // tuple is expected and required
    arrow({}, (x) => {
      expect(x).to.not.have.property('fexec');
      expect(x.gexec).to.equal(true);
      done();
    }, lifta.P());
  });
  it('creates an arrow and runs arrow f over x and arrow g over x and continues with the first to finish g', (done) => {
    let fArrow = (x, cont, p) => {
      let canceller;
      let timeout = setTimeout(() => {
        p.advance(canceller);
        x.fexec = true;
        return cont(x, p);
      }, 0);
      canceller = p.add(() => clearTimeout(timeout));
    };
    let gArrow = (x, cont, p) => {
      let canceller;
      let timeout = setTimeout(() => {
        p.advance(canceller);
        x.gexec = true;
        return cont(x, p);
      }, 1000);
      canceller = p.add(() => clearTimeout(timeout));
    };
    let arrow = fArrow.either(gArrow);
    // tuple is expected and required
    arrow({}, (x) => {
      expect(x).to.not.have.property('gexec');
      expect(x.fexec).to.equal(true);
      done();
    }, lifta.P());
  });
});

describe('repeat', () => {
  it('repeats stuff repeatedly', () => {
    // fFunction will be lifted into an arrow
    // that continues with Done or Repeat
    let fFunction = (x) => {
      if (x > 9) {
        return lifta.Done(x);
      } else {
        return lifta.Repeat(x + 1);
      }
    };
    let arrow = fFunction.repeat;
    arrow(0, (x) => {
      expect(x).to.equal(10);
    }, lifta.P());
  });
});

describe('lor', () => {
  it('runs f over x if left, runs g over x if right', () => {
    // determine left or right
    let leftOrRight = (x) => {
      if (x < 10) {
        return lifta.Left(x);
      } else {
        return lifta.Right(x);
      }
    };
    // left
    let fFunction = (x) => {
      return x + 2;
    };
    // right
    let gFunction = (x) => {
      return x / 10;
    };
    let arrow = leftOrRight.lor(fFunction, gFunction);
    // go left
    arrow(3, (x) => {
      expect(x).to.equal(5);
    }, lifta.P());
    // go right
    arrow(70, (x) => {
      expect(x).to.equal(7);
    }, lifta.P());
  });
});

describe('falseError', () => {
  it('if x.first is false produces Error(x)', (done) => {
    let fFunction = (x) => {
      return [false, 25];
    };
    let arrow = fFunction.falseError;
    arrow(undefined, (x) => {
      expect(x).to.be.a('Error');
      done();
    }, lifta.P());
  });
  it('if x.first is true produces x', (done) => {
    let fFunction = (x) => {
      return [true, 25];
    };
    let arrow = fFunction.falseError;
    arrow(undefined, (x) => {
      expect(x[0]).to.be.true;
      expect(x[1]).to.equal(25);
      done();
    }, lifta.P());
  });
});

describe('promoteError', () => {
  it('if x.first is Error promote x.first to x', (done) => {
    let fFunction = (x) => {
      let first = Error('ouch');
      first.x = 32;
      return [first, 25];
    };
    let arrow = fFunction.promoteError;
    arrow(undefined, (x) => {
      expect(x).to.be.a('Error');
      expect(x.x[0]).to.equal(32);
      expect(x.x[1]).to.equal(25);
      done();
    }, lifta.P());
  });
  it('if x.first is not Error produce x', (done) => {
    let fFunction = (x) => {
      return ['ouch', 25];
    };
    let arrow = fFunction.promoteError;
    arrow(undefined, (x) => {
      expect(x).to.be.an('array');
      expect(x[0]).to.equal('ouch');
      expect(x[1]).to.equal(25);
      done();
    }, lifta.P());
  });
});

describe('leftError', () => {
  it('if x is Error produces Left(x)', () => {
    let fFunction = (x) => {
      return Error({
        didithurt: 'ouch'
      });
    };
    let arrow = fFunction.leftError;
    arrow(undefined, (x) => {
      expect(x).to.be.instanceof(lifta.Left);
      expect(x.x).to.be.instanceof(Error);
    }, lifta.P());
  });
  it('if x is not Error produces Left(x)', () => {
    let fFunction = (x) => {
      return {
        didithurt: 'no'
      };
    };
    let arrow = fFunction.leftError;
    arrow(undefined, (x) => {
      expect(x).to.be.instanceof(lifta.Right);
      expect(x.x).to.have.property('didithurt').equal('no');
    }, lifta.P());
  });
});

describe('barrier', () => {
  it('if x is Error does not run the arrow', () => {
    let fFunction = (x) => {
      return Error({
        didithurt: 'ouch'
      });
    };
    let gFunction = (x) => {
      return {
        heyItRan: 'hey'
      };
    };
    let arrow = fFunction.then(gFunction.barrier);
    arrow(undefined, (x) => {
      expect(x).to.be.instanceof(Error);
    }, lifta.P());
  });
  it('if x is Error does not run the arrow async', (done) => {
    let fFunction = (x) => {
      return Error({
        didithurt: 'ouch'
      });
    };
    let gFunction = (x) => {
      return {
        heyItRan: 'hey'
      };
    };
    let arrow = lifta.liftAsyncA(fFunction).then(lifta.liftAsyncA(gFunction).barrier);
    arrow(undefined, (x) => {
      expect(x).to.be.instanceof(Error);
      done();
    }, lifta.P());
  });
  it('if x is not Error run the arrow', () => {
    let fFunction = (x) => {
      return {
        didithurt: 'not much'
      };
    };
    let gFunction = (x) => {
      return {
        heyItRan: 'hey'
      };
    };
    let arrow = fFunction.then(gFunction.barrier);
    arrow(undefined, (x) => {
      expect(x).to.be.a('object');
      expect(x).to.have.property('heyItRan').equal('hey');
    }, lifta.P());
  });
  it('if x is not Error run the arrow async', () => {
    let fFunction = (x) => {
      return {
        didithurt: 'not much'
      };
    };
    let gFunction = (x) => {
      return {
        heyItRan: 'hey'
      };
    };
    let arrow = lifta.liftAsyncA(fFunction).then(lifta.liftAsyncA(gFunction).barrier);
    arrow(undefined, (x) => {
      expect(x).to.be.a('object');
      expect(x).to.have.property('heyItRan').equal('hey');
      done();
    }, lifta.P());
  });
});