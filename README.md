# download [![Build Status](https://secure.travis-ci.org/kevva/download.png?branch=master)](http://travis-ci.org/kevva/download)

Download and extract files effortlessly in Node.js.

## Getting started

Install with [npm](https://npmjs.org/package/download): `npm install download`

## Examples

If you're fetching an archive you can set `extract: true` in options and
it'll extract it for you.

```js
var download = require('download');

// download and extract `foo.tar.gz` into `bar/`
download('foo.tar.gz', 'bar', { extract: true });

// download and save `foo.exe` into `bar/foo.exe` with mode `0755`
download('foo.exe', 'bar', { mode: '0755' });

// download and save an array of files in `bar/`
var files = ['foo.jpg', 'bar.jpg', 'cat.jpg'];
download(files, 'bar');
```

## API

### download(url, dest, opts)

Download a file or an array of files to a given destination. Returns an EventEmitter 
that emits the following possible events:

* `response` — Relayed when the underlying `http.ClientRequest` emits the same 
event. Listeners called with a `http.IncomingMessage` instance.
* `data` — Relayed when the underlying `http.IncomingMessage` emits the same 
event. Listeners called with a `Buffer` instance.
* `error` — Relayed when the underlying `http.ClientRequest` emits the same event 
or when the response status code is not in the 200s. Listeners called with an 
`Error` instance (in the first case) or the response status code.
* `close` — Relayed when the underlying `stream.Duplex` emits the same event.

## Options

You can define options accepted by the [request](https://github.com/mikeal/request/) module besides from the options below.

### extract

Type: `Boolean`  
Default: `false`

If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/).

### mode

Type: `String`  
Default: `undefined`

Set mode on the downloaded files.

### strip

Type: `Number`  
Default: `0`

Equivalent to `--strip-components` for tar.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) (c) [Kevin Mårtensson](http://kevinmartensson.com)
