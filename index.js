'use strict';
const fs = require('fs');
const path = require('path');
const {URL} = require('url');
const contentDisposition = require('content-disposition');
const archiveType = require('archive-type');
const decompress = require('decompress');
const filenamify = require('filenamify');
const getStream = require('get-stream');
const got = require('got');
const makeDir = require('make-dir');
const pify = require('pify');
const pEvent = require('p-event');
const fileType = require('file-type');
const extName = require('ext-name');

const fsP = pify(fs);
const filenameFromPath = res => path.basename(new URL(res.requestUrl).pathname);

const getExtFromMime = res => {
	const header = res.headers['content-type'];

	if (!header) {
		return null;
	}

	const exts = extName.mime(header);

	if (exts.length !== 1) {
		return null;
	}

	return exts[0].ext;
};

const getFilename = (res, data, decode) => {
	const header = res.headers['content-disposition'];

	if (header) {
		const parsed = contentDisposition.parse(header);

		if (parsed.parameters && parsed.parameters.filename) {
			return parsed.parameters.filename;
		}
	}

	let filename = filenameFromPath(res);
	
	if(decode){
		try {
			filename = decodeURIComponent(filename);
		} catch(e){
			console.error(e);
		}
	}

	if (!path.extname(filename)) {
		const ext = (fileType(data) || {}).ext || getExtFromMime(res);

		if (ext) {
			filename = `${filename}.${ext}`;
		}
	}

	return filename;
};

const writeWithoutOverwriting = (output, filename, data) => {
	try {		
		if (fs.existsSync(path.join(output, filename))) {
			let { name, ext } = path.parse(filename)
			let i = 0;
			let newFilename = name + "(" + i + ")" + ext
			
			while(fs.existsSync(path.join(output, newFilename))){
				newFilename = name + "(" + ++i + ")" + ext
			}
			
			return fsP.writeFile(path.join(output, newFilename), data)	
		} else {
			return fsP.writeFile(path.join(output, filename), data)
		}
	} catch(err) {
		//console.error(err)
		// correct ?
		return Promise.reject(err)
	}
}

module.exports = (uri, output, opts) => {
	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	opts = Object.assign({
		encoding: null,
		rejectUnauthorized: process.env.npm_config_strict_ssl !== 'false',
		decode: true
	}, opts);

	const stream = got.stream(uri, opts);

	const promise = pEvent(stream, 'response').then(res => {
		const encoding = opts.encoding === null ? 'buffer' : opts.encoding;
		return Promise.all([getStream(stream, {encoding}), res]);
	}).then(result => {
		const [data, res] = result;

		if (!output) {
			return opts.extract && archiveType(data) ? decompress(data, opts) : data;
		}

		const filename = opts.filename || filenamify(getFilename(res, data, opts.decode));
		const outputFilepath = path.join(output, filename);

		if (opts.extract && archiveType(data)) {
			return decompress(data, path.dirname(outputFilepath), opts);
		}

		return makeDir(path.dirname(outputFilepath))
			.then(() => writeWithoutOverwriting(output, filename, data))
			.then(() => data);
	});

	stream.then = promise.then.bind(promise);
	stream.catch = promise.catch.bind(promise);

	return stream;
};
