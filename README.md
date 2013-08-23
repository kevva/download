# download [![Build Status](https://secure.travis-ci.org/kevva/download.png?branch=master)](http://travis-ci.org/kevva/download)

Downloading made easy.

## Getting started

Install with [npm](https://npmjs.org/package/download): `npm install download`

## Examples

```js
var download = require('download');

download('foo.tar.gz', 'bar');
// => download and extract `foo.tar.gz` into `bar/`

download('foo.jpg', 'bar/foo.jpg');
// => download and save `foo.jpg` into `bar/foo.jpg`
```

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) (c) [Kevin Mårtensson](http://kevinmartensson.com)
