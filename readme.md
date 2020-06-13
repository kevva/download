# download [![Build Status](https://travis-ci.org/kevva/download.svg?branch=master)](https://travis-ci.org/kevva/download)

> Download and extract files

*See [download-cli](https://github.com/kevva/download-cli) for the command-line version.*


## Install

```
$ npm install download
```


## Usage

```js
const fs = require('fs');
const download = require('download');

(async () => {
	await download('http://unicorn.com/foo.jpg', 'dist');

	fs.writeFileSync('dist/foo.jpg', await download('http://unicorn.com/foo.jpg'));

	download('unicorn.com/foo.jpg').pipe(fs.createWriteStream('dist/foo.jpg'));

	await Promise.all([
		'unicorn.com/foo.jpg',
		'cats.com/dancing.gif'
	].map(url => download(url, 'dist')));
})();
```

### Proxies

To work with proxies, read the [`got documentation`](https://github.com/sindresorhus/got#proxies).

### Rewriting

This feature allows downloading from mirrors, by supporting URL rewriting.

Create a `.downloadrc` in you home directory or somewhere else that can be searched by [cosmiconfig](https://github.com/davidtheclark/cosmiconfig), with prefix replacing rules. For instance, rewriting the URLs to download image processing binary files:

```json
{
  "rewrite": {
    "https://raw.githubusercontent.com/imagemin/cwebp-bin/": "https://npm.taobao.org/mirrors/cwebp-bin/",
    "https://raw.githubusercontent.com/imagemin/mozjpeg-bin/": "https://npm.taobao.org/mirrors/mozjpeg-bin/",
    "https://raw.githubusercontent.com/imagemin/pngquant-bin/": "https://npm.taobao.org/mirrors/pngquant-bin/"
  }
}
```

Only prefixes will be matched for now.

## API

### download(url, destination?, options?)

Returns both a `Promise<Buffer>` and a [Duplex stream](https://nodejs.org/api/stream.html#stream_class_stream_duplex) with [additional events](https://github.com/sindresorhus/got#streams-1).

#### url

Type: `string`

URL to download.

#### destination

Type: `string`

Path to where your file will be written.

#### options

Type: `Object`

Same options as [`got`](https://github.com/sindresorhus/got#options) and [`decompress`](https://github.com/kevva/decompress#options) in addition to the ones below.

##### extract

Type: `boolean`<br>
Default: `false`

If set to `true`, try extracting the file using [`decompress`](https://github.com/kevva/decompress).

##### filename

Type: `string`

Name of the saved file.
