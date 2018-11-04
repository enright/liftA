/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in ES6

// mocha tests
let lifta = require('../liftA.js');
let expect = require('chai').expect;
let lolex = require('lolex');

describe('liftA', () => {
  it('lifts a synchronous function into a runnable arrow', (done) => {
    let fFunction = (x) => {
      x.fexec = true;
      return x;
    };
    let arrow = lifta.liftA(fFunction);
    arrow({}, (x) => {
      expect(x.fexec).equal(true);
      done();
    }, lifta.P());
  });
});

describe('liftAsyncA', () => {
  it('lifts a synchronous unary function into a runnable asynchronous arrow', (done) => {
    let fFunction = (x) => {
      x.fexec = true;
      return x;
    };
    let arrow = lifta.liftAsyncA(fFunction);
    let x = {};
    arrow(x, (x) => {
      expect(x.fexec).equal(true);
      done();
    }, lifta.P());
    // we don't acquire the property until after fFunction runs
    expect(x).to.not.have.property('fexec');
  });
});

describe('thenA', () => {
  it('runs f over x then g over the result continuing with g(f(x))', (done) => {
    let fFunction = (x) => {
      expect(x).to.not.have.property('gexec'); //should.not.exist(x.gexec);
      x.fexec = true;
      return x;
    };
    let gFunction = (x) => {
      expect(x.fexec).equal(true);
      x.gexec = true;
      return x;
    };
    let arrow = lifta.thenA(lifta.liftA(fFunction), lifta.liftA(gFunction));
    arrow({}, (x) => {
      expect(x.fexec).equal(true);
      expect(x.gexec).equal(true);
      done();
    }, lifta.P());
  });
});

describe('productA', () => {
  it('runs f over x.first and g over x.second continuing with [f(x.first), g(x.second)]', (done) => {
    let fFunction = (x) => {
      x.fexec = true;
      return x;
    };
    let gFunction = (x) => {
      x.gexec = true;
      return x;
    };
    let arrow = lifta.productA(lifta.liftA(fFunction), lifta.liftA(gFunction));
    arrow([{}, {}], (x) => {
      expect(x.first.fexec).equal(true);
      expect(x.first).to.not.have.property('gexec');
      expect(x.second.gexec).equal(true);
      expect(x.second).to.not.have.property('fexec');
      done();
    }, lifta.P());
  });
});

describe('eitherA', () => {
  it('runs f over x and g over x continuing with f(x) if f finishes first', (done) => {
    let clock = lolex.install();
    let fFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.fexec = true;
        return cont(x, p);
      }, 0);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let gFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.gexec = true;
        return cont(x, p);
      }, 1);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let arrow = lifta.eitherA(fFunctionA, gFunctionA);
    arrow({}, (x) => {
      expect(x.fexec).equal(true);
      expect(x).to.not.have.property('gexec');
      clock.uninstall();
      done();
    }, lifta.P());
    clock.runAll();
  });
  it('runs f over x and g over x continuing with g(x) if g finishes first', (done) => {
    let clock = lolex.install();
    let fFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.fexec = true;
        return cont(x, p);
      }, 1);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let gFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.gexec = true;
        return cont(x, p);
      }, 0);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let arrow = lifta.eitherA(fFunctionA, gFunctionA);
    arrow({}, (x) => {
      expect(x.gexec).equal(true);
      expect(x).to.not.have.property('fexec');
      clock.uninstall();
      done();
    }, lifta.P());
    clock.runAll();
  });
});

describe('eitherSyncA', () => {
  it('runs f sync over x and g sync over x continuing with f(x) - f finishes first', (done) => {
    let fFunction = (x) => {
      x.fexec = true;
      return x;
    };
    let gFunction = (x) => {
      x.gexec = true;
      return x;
    };
    let arrow = lifta.eitherSyncA(lifta.liftA(fFunction), lifta.liftA(gFunction));
    arrow({}, (x) => {
      expect(x.fexec).equal(true);
      expect(x).to.not.have.property('gexec');
      done();
    }, lifta.P());
  });
  it('runs f async over x and g sync over x continuing with g(x) - g finishes first', (done) => {
    let clock = lolex.install();
    let fFunctionA = (x, cont, p) => {
      setTimeout(() => {
        x.fexec = true;
        return cont(x, p);
      }, 1);
    };
    let gFunction = (x) => {
      x.gexec = true;
      return x;
    };
    let arrow = lifta.eitherSyncA(fFunctionA, lifta.liftA(gFunction));
    arrow({}, (x) => {
      expect(x.gexec).equal(true);
      expect(x).to.not.have.property('fexec');
      clock.uninstall();
      done();
    }, lifta.P());
  });
  it('runs f over x and g over x continuing with f(x) if f finishes first', (done) => {
    let clock = lolex.install();
    let fFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.fexec = true;
        return cont(x, p);
      }, 0);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let gFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.gexec = true;
        return cont(x, p);
      }, 1);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let arrow = lifta.eitherSyncA(fFunctionA, gFunctionA);
    arrow({}, (x) => {
      expect(x.fexec).equal(true);
      expect(x).to.not.have.property('gexec');
      clock.uninstall();
      done();
    }, lifta.P());
    clock.runAll();
  });
  it('runs f over x and g over x continuing with g(x) if g finishes first', (done) => {
    let clock = lolex.install();
    let fFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.fexec = true;
        return cont(x, p);
      }, 1);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let gFunctionA = (x, cont, p) => {
      let cancelId;
      let timeout = setTimeout(() => {
        p.advance(cancelId);
        x.gexec = true;
        return cont(x, p);
      }, 0);
      cancelId = p.add(() => clearTimeout(timeout));
    };
    let arrow = lifta.eitherSyncA(fFunctionA, gFunctionA);
    arrow({}, (x) => {
      expect(x.gexec).equal(true);
      expect(x).to.not.have.property('fexec');
      clock.uninstall();
      done();
    }, lifta.P());
    clock.runAll();
  });
});

describe('fanA', () => {
  it('runs f over x and g over x continuing with [f(x), g(x)]', (done) => {
    let fFunctionA = (x, cont, p) => {
      let cancelId;
      let clear = setTimeout(() => {
        p.advance(cancelId);
        expect(x.first).to.equal("hello");
        expect(x.second).to.equal("goodbye");
        return cont(Object.freeze([x.first + ' there', 2]), p);
      }, 0);
      cancelId = p.add(() => clearTimeout(clear));
    };
    let gFunctionA = (x, cont, p) => {
      let cancelId;
      let clear = setTimeout(() => {
        p.advance(cancelId);
        expect(x.first).to.equal("hello");
        expect(x.second).to.equal("goodbye");
        return cont(Object.freeze([3, x.second + ' girl']), p);
      }, 0);
      cancelId = p.add(() => clearTimeout(clear));
    };
    let arrow = lifta.fanA(fFunctionA, gFunctionA);
    arrow(Object.freeze(["hello", "goodbye"]), (x) => {
      expect(x.first.first).equal('hello there');
      expect(x.first.second).equal(2);
      expect(x.second.second).equal('goodbye girl');
      expect(x.second.first).equal(3);
      done();
    }, lifta.P());
  });
});

describe('repeatA', () => {
  it('repeats if lifta.Repeat(x) is produced, finishes when lifta.Done(x) is produced', (done) => {
    let counter = 0;
    let toBeRepeated = (x, cont, p) => {
      if (counter === 4) {
        return cont(lifta.Done(x));
      }
      counter += 1;
      return cont(lifta.Repeat(x));
    };
    let arrow = lifta.repeatA(toBeRepeated);
    arrow(Object.freeze(["hello", "goodbye"]), (x) => {
      expect(counter).equal(4);
      // when we're done, x should no longer be wrapped in Done or Repeat
      expect(x.first).equal("hello");
      expect(x.second).equal("goodbye");
      done();
    }, lifta.P());
  });
});

describe('leftOrRightA', () => {
  it('run x over left if lifta.Left(x) is produced', (done) => {
    let produceLeft = (x, cont, p) => {
      return cont(lifta.Left(x), p);
    };
    let goLeft = (x, cont, p) => {
      return cont(4, p);
    };
    let goRight = (x, cont, p) => {
      throw Error('do not go right');
    };
    let arrow = lifta.leftOrRightA(produceLeft, goLeft, goRight);
    arrow(Object.freeze(["hello", "goodbye"]), (x) => {
      expect(x).equal(4);
      done();
    }, lifta.P());
  });
  it('run x over right if lifta.Right(x) is produced', (done) => {
    let produceRight = (x, cont, p) => {
      return cont(lifta.Right(x), p);
    };
    let goLeft = (x, cont, p) => {
      throw Error('do not go left');
    };
    let goRight = (x, cont, p) => {
      return cont(4, p);
    };
    let arrow = lifta.leftOrRightA(produceRight, goLeft, goRight);
    arrow(Object.freeze(["hello", "goodbye"]), (x) => {
      expect(x).equal(4);
      done();
    }, lifta.P());
  });
});