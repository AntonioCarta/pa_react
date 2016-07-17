/**
 * Created by Antonio on 10/06/2016.
 */

var c = new Counter();

a = c.render();

console.assert(parseVDOM(a[0]) == "x");