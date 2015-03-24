# download [![Build Status](http://img.shields.io/travis/kevva/download.svg?style=flat)](https://travis-ci.org/kevva/download)

> Download and extract files effortlessly


## Install

```
$ npm install --save download
```


## Usage

If you're fetching an archive you can set `extract: true` in options and
it'll extract it for you.

```js
var Download = require('download');

new Download({mode: '755'})
	.get('http://example.com/foo.zip')
	.get('http://example.com/cat.jpg')
	.dest('dest');
	.run(function (err, files) {
		console.log(files);
		//=> [{path: 'foo.zip', url: 'http://example.com/foo.zip', contents: <Buffer 50 4b 03>, ...}, ...]
	});
```


## API

### new Download(options)

Creates a new `Download` instance.

#### options

Type: `object`

Options for [`got`](https://github.com/sindresorhus/got) or the underlying [`http`](https://nodejs.org/api/http.html#http_http_request_options_callback)/[`https`](https://nodejs.org/api/https.html#https_https_request_options_callback) request can be specified,
as well as options specific to the `download` module as described below.

##### options.extract

Type: `boolean`  
Default: `false`

If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/).

##### options.mode

Type: `string`

Set mode on the downloaded file, i.e `{mode: '755'}`.

##### options.strip

Type: `number`  
Default: `0`

Remove leading directory components from extracted files.

### .get(url, [dest])

#### url

Type: `string`

Add a URL to download.

#### dest

Type: `string`

Set an optional destination folder that will take precedence over the one set in 
`.dest()`.

### .dest(dir)

#### dir

Type: `string`

Set the destination folder to where your files will be downloaded.

### .rename(name)

#### name

Type: `function` or `string`

Rename your files using [gulp-rename](https://github.com/hparra/gulp-rename).

### .use(plugin)

#### plugin(response, url)

Type: `function`

Add a plugin to the middleware stack.

##### response

The [response object](http://nodejs.org/api/http.html#http_http_incomingmessage).

##### url

The requested URL.

### .run(callback)

#### callback(err, files)

Type: `function`

##### files

Contains an array of vinyl files.


## CLI

```
$ npm install --global download
```

```
$ download --help

  Usage
    $ download <url>
    $ download <url> > <file>
    $ download --out <directory> <url>
    $ cat <file> | download --out <directory>

  Example
    $ download http://foo.com/file.zip
    $ download http://foo.com/cat.png > dog.png
    $ download --extract --strip 1 --out dest http://foo.com/file.zip
    $ cat urls.txt | download --out dest

  Options
    -e, --extract           Try decompressing the file
    -o, --out               Where to place the downloaded files
    -s, --strip <number>    Strip leading paths from file names on extraction
```


## License

MIT © [Kevin Mårtensson](http://kevinmartensson.com)
