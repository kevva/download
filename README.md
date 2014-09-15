# download [![Build Status](http://img.shields.io/travis/kevva/download.svg?style=flat)](https://travis-ci.org/kevva/download)

> Download and extract files effortlessly

## Install

```sh
$ npm install --save download
```

## Usage

If you're fetching an archive you can set `extract: true` in options and
it'll extract it for you.

```js
var Download = require('download');
var progress = require('download-status');

var download = new Download({ extract: true, strip: 1 })
    .get('http://example.com/foo.zip')
    .get('http://example.com/cat.jpg')
    .dest('dest')
    .use(progress());

download.run(function (err, files) {
    if (err) {
        throw err;
    }

    console.log('File downloaded successfully!');
});
```

## API

### new Download(opts)

Creates a new `Download` instance.

### .get(url)

Add a file to download.

### .dest(dir)

Set the destination folder to where your files will be written.

### .use(plugin)

Adds a plugin to the middleware stack.

### .run(cb)

Downloads your files and returns an error if something has gone wrong.

## Options

You can define options accepted by the [request](https://github.com/mikeal/request#requestoptions-callback) 
module besides from the options below.

### extract

Type: `Boolean`  
Default: `false`

If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/).

### mode

Type: `Number`  
Default: `null`

Set mode on the downloaded file.

### strip

Type: `Number`  
Default: `0`

Equivalent to `--strip-components` for tar.

## License

MIT © [Kevin Mårtensson](http://kevinmartensson.com)
