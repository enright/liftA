'use strict';
function repeat(func) {
  if (func() !== undefined) {
    return repeat(func);
  }
}
let x = 0;
repeat(function () {
  x += 1;
  console.log(x);
  if (x > 1000) {
    return undefined;
  }
  return x;
});
