# download [![CI](https://github.com/XhmikosR/download/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/XhmikosR/download/actions/workflows/ci.yml)

> Download and extract files

*See [download-cli](https://github.com/kevva/download-cli) for the command-line version.*


## Install

```sh
npm install @xhmikosr/downloader
```


## Usage

```js
import fs from 'node:fs';
import download from '@xhmikosr/downloader';

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

##### options.got

Type: `Object`

Same options as [`got`](https://github.com/sindresorhus/got#options).

##### options.decompress

Same options as [`decompress`](https://github.com/XhmikosR/decompress#options).

##### extract

* Type: `boolean`
* Default: `false`

If set to `true`, try extracting the file using [`decompress`](https://github.com/XhmikosR/decompress).

##### filename

Type: `string`

Name of the saved file.
