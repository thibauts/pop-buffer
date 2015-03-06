pop-buffer
==========

Install
-------

```bash
$ npm install pop-buffer
```

Example
-------

```javascript
var bunny = require('bunny');
var encode = require('pop-buffer').encode;
var decode = require('pop-buffer').decode;

var popBuffer = encode(bunny.cells, bunny.positions, 16);
var mesh = decode(popBuffer);
```

Demo
----

Check the [online demo](http://requirebin.com/?gist=538bb6f0da184e91c26a) or

```bash
$ git clone https://github.com/thibauts/pop-buffer.git
$ cd pop-buffer
$ npm install
$ npm run demo
```


