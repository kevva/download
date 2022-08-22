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

### Example with progress bar

For big files, it may be useful to use a progress bar on the CLI. You must install also module `progress`.

```js
const download = require('download')
const ProgressBar = require('progress')

const writeStream = fs.createWriteStream('http://unicorn.com/foo.zip')
const readStream = download('dist/foo.zip')

readStream.on('response', function (res) {
  const len = parseInt(res.headers['content-length'], 10)
  const bar = new ProgressBar('  downloading [:bar] :rate/bps :percent :etas', {
    complete: '=',
    incomplete: ' ',
    width: 20,
    total: len
  })

  readStream.on('data', function (chunk) {
    writeStream.write(chunk)
    bar.tick(chunk.length)
  })

  readStream.on('end', function () {
    console.log('Download done with success\n')
    writeStream.end()
  })
})
```

### Proxies

To work with proxies, read the [`got documentation`](https://github.com/sindresorhus/got#proxies).


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
