'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');
const caw = require('caw');
const cd = require('content-disposition');
const decompress = require('decompress');
const filenamify = require('filenamify');
const getStream = require('get-stream');
const got = require('got');
const mkdirp = require('mkdirp');
const pify = require('pify');

const fsP = pify(fs);

function getFilename(res) {
	const header = res.headers['content-disposition'];
	if (!header) {
		return filenameFromPath(res);
	}

	const parsed = cd.parse(res.headers['content-disposition']);
	if (parsed.type === 'attachment' && parsed.parameters && parsed.parameters.filename) {
		return parsed.parameters.filename;
	}

	return filenameFromPath(res);
}

function filenameFromPath(res) {
	return path.basename(url.parse(res.requestUrl).pathname);
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
	const promise = new Promise((resolve, reject) => {
		stream.on('error', reject);
		stream.on('response', res => {
			const getData = opts.encoding === null ? getStream.buffer(stream) : getStream(stream, opts);

			getData.then(data => {
				if (!output && opts.extract) {
					return resolve(decompress(data, opts));
				}

				if (!output) {
					return resolve(data);
				}

				output = path.join(output, filenamify(getFilename(res)));

				if (opts.extract) {
					return resolve(decompress(data, path.dirname(output), opts));
				}

				return pify(mkdirp)(path.dirname(output))
					.then(() => fsP.writeFile(output, data))
					.then(() => resolve(data));
			});
		});
	});

	stream.then = promise.then.bind(promise);
	stream.catch = promise.catch.bind(promise);

	return stream;
};
