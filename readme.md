# download-wo (download without overwriting)

> Download and extract files without overwriting by renaming them. Forked from [https://github.com/kevva/download](https://github.com/kevva/download).

> :warning: **Not extensively tested !!**

## Install

```
$ npm install getfile-wo
```


## Usage

```js
const fs = require('fs');
const download = require('getfile-wo');

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

Type: `Object`

Same options as [`got`](https://github.com/sindresorhus/got#options) and [`decompress`](https://github.com/kevva/decompress#options) in addition to the ones below.

##### extract

Type: `boolean`<br>
Default: `false`

If set to `true`, try extracting the file using [`decompress`](https://github.com/kevva/decompress).

##### filename

Type: `string`

Name of the saved file.

##### decode

Type: `boolean`<br>
Default: `true`

Enable URI decoding for more readable file name (e.g replaces "%20" with space).
