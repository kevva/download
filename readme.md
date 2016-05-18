# download [![Build Status](https://travis-ci.org/kevva/download.svg?branch=master)](https://travis-ci.org/kevva/download)

> Download and extract files

*See [download-cli](https://github.com/kevva/download-cli) for the command-line version.*


## Install

```
$ npm install --save download
```


## Usage

```js
const download = require('download');

download('http://unicorn.com/foo.jpg', 'dist').then(() => {
	console.log('done!');
});
```


## API

### download(url, [destination], [options])

Returns both a Promise for a buffer and a Duplex stream with [additional events](https://github.com/sindresorhus/got#streams).

#### url

Type: `string`

URL to download.

#### destination

Type: `string`

Path to where your file will be written.

#### options

Same options as [got](https://github.com/sindresorhus/got) in addition to the ones below.

##### extract

Type: `boolean`  
Default: `false`

If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/).


## License

MIT © [Kevin Mårtensson](http://github.com/kevva)
