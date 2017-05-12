'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');
const caw = require('caw');
const contentDisposition = require('content-disposition');
const decompress = require('decompress');
const filenamify = require('filenamify');
const getStream = require('get-stream');
const got = require('got');
const makeDir = require('make-dir');
const pify = require('pify');
const pEvent = require('p-event');

const fsP = pify(fs);

function filenameFromPath(res) {
	return path.basename(url.parse(res.requestUrl).pathname);
}

function getFilename(res) {
	const header = res.headers['content-disposition'];
	if (!header) {
		return filenameFromPath(res);
	}

	const parsed = contentDisposition.parse(res.headers['content-disposition']);
	if (parsed.type === 'attachment' && parsed.parameters && parsed.parameters.filename) {
		return parsed.parameters.filename;
	}

	return filenameFromPath(res);
}

module.exports = (uri, output, opts) => {
	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	opts = Object.assign({
		encoding: null,
		rejectUnauthorized: process.env.npm_config_strict_ssl !== 'false'
	}, opts);

	let protocol = url.parse(uri).protocol;

	if (protocol) {
		protocol = protocol.slice(0, -1);
	}

	const agent = caw(opts.proxy, {protocol});
	const stream = got.stream(uri, Object.assign(opts, {agent}));

	const promise = pEvent(stream, 'response').then(res => {
		const encoding = opts.encoding === null ? 'buffer' : opts.encoding;
		return Promise.all([getStream(stream, {encoding}), res]);
	}).then(result => {
		// TODO: Use destructuring when targeting Node.js 6
		const data = result[0];
		const res = result[1];

		if (!output && opts.extract) {
			return decompress(data, opts);
		}

		if (!output) {
			return data;
		}

		const outputFilepath = path.join(output, filenamify(getFilename(res)));

		if (opts.extract) {
			return decompress(data, path.dirname(outputFilepath), opts);
		}

		return makeDir(path.dirname(outputFilepath))
			.then(() => fsP.writeFile(outputFilepath, data))
			.then(() => data);
	});

	stream.then = promise.then.bind(promise);
	stream.catch = promise.catch.bind(promise);

	return stream;
};
