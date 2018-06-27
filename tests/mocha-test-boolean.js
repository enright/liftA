/* globals require,describe,it,setTimeout,clearTimeout */
"use strict"; // enables proper tail calls (PTC) in Node 6 harmony

// mocha tests
let lifta = require('../lifta.js')();
let expect = require('chai').expect;

describe('or', () => {
  it('continues with true if f (this) is true but g is false', () => {
    let fFunction = (x) => {
      return [true, x.second];
    };
    let gFunction = (x) => {
      return [false, x.second];
    };
    let arrow = fFunction.or(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== true) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with true if f (this) is false but g is true', () => {
    let fFunction = (x) => {
      return [false, x.second];
    };
    let gFunction = (x) => {
      return [true, x.second];
    };
    let arrow = fFunction.or(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== true) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with true if f (this) is true and g is true', () => {
    let fFunction = (x) => {
      return [true, x.second];
    };
    let gFunction = (x) => {
      return [true, x.second];
    };
    let arrow = fFunction.or(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== true) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with false if f (this) is false and g is false', () => {
    let fFunction = (x) => {
      return [false, x.second];
    };
    let gFunction = (x) => {
      return [false, x.second];
    };
    let arrow = fFunction.or(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== false) {
        throw Error(x);
      }
    }, lifta.P());
  });
});

describe('and', () => {
  it('continues with false if f (this) is true but g is false', () => {
    let fFunction = (x) => {
      return [true, x.second];
    };
    let gFunction = (x) => {
      return [false, x.second];
    };
    let arrow = fFunction.and(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== false) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with false if f (this) is false but g is true', () => {
    let fFunction = (x) => {
      return [false, x.second];
    };
    let gFunction = (x) => {
      return [true, x.second];
    };
    let arrow = fFunction.and(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== false) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with true if f (this) is true and g is true', () => {
    let fFunction = (x) => {
      return [true, x.second];
    };
    let gFunction = (x) => {
      return [true, x.second];
    };
    let arrow = fFunction.and(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== true) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('continues with false if f (this) is false and g is false', () => {
    let fFunction = (x) => {
      return [false, x.second];
    };
    let gFunction = (x) => {
      return [false, x.second];
    };
    let arrow = fFunction.and(gFunction);
    arrow([undefined, undefined], (x) => {
      if (x.first !== false) {
        throw Error(x);
      }
    }, lifta.P());
  });
});

describe('not', () => {
  it('turns false true', () => {
    let fFunction = (x) => {
      return [false, x.second];
    };
    let arrow = fFunction.not;
    arrow([undefined, undefined], (x) => {
      if (x.first !== true) {
        throw Error(x);
      }
    }, lifta.P());
  });
  it('turns true false', () => {
    let fFunction = (x) => {
      return [true, x.second];
    };
    let arrow = fFunction.not;
    arrow([undefined, undefined], (x) => {
      if (x.first !== false) {
        throw Error(x);
      }
    }, lifta.P());
  });
});

describe('false', () => {
  it('runs g if false', (done) => {
    let fFunction = (x) => {
      return [false, 25];
    };
    let gFunction = (x) => {
      return [65, 33];
    };
    let arrow = fFunction.false(gFunction);
    arrow([], (x) => {
      expect(x[0]).to.equal(65);
      expect(x[1]).to.equal(33);
      done();
    }, lifta.P());
  });
  it('does not run g if true', (done) => {
    let fFunction = (x) => {
      return [true, 25];
    };
    let gFunction = (x) => {
      return [65, 33];
    };
    let arrow = fFunction.false(gFunction);
    arrow([], (x) => {
      expect(x[0]).to.equal(true);
      expect(x[1]).to.equal(25);
      done();
    }, lifta.P());
  });
});

describe('true', () => {
  it('runs g if true', (done) => {
    let fFunction = (x) => {
      return [true, 25];
    };
    let gFunction = (x) => {
      return [65, 33];
    };
    let arrow = fFunction.true(gFunction);
    arrow([], (x) => {
      expect(x[0]).to.equal(65);
      expect(x[1]).to.equal(33);
      done();
    }, lifta.P());
  });
  it('does not run g if false', (done) => {
    let fFunction = (x) => {
      return [false, 25];
    };
    let gFunction = (x) => {
      return [65, 33];
    };
    let arrow = fFunction.true(gFunction);
    arrow([], (x) => {
      expect(x[0]).to.equal(false);
      expect(x[1]).to.equal(25);
      done();
    }, lifta.P());
  });
});