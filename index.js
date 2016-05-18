'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');
const caw = require('caw');
const Decompress = require('decompress');
const filenamify = require('filenamify');
const getStream = require('get-stream');
const got = require('got');
const mkdirp = require('mkdirp');
const pify = require('pify');
const fsP = pify(fs);

const createPromise = (uri, output, stream, opts) => new Promise((resolve, reject) => {
	stream.on('response', res => {
		const stream = opts.encoding === null ? getStream.buffer(res) : getStream(res, opts);

		stream
			.then(data => resolve(data))
			.catch(err => reject(err));
	});

	stream.on('error', reject);
}).then(data => {
	if (!output) {
		return data;
	}

	if (opts.extract) {
		const decompress = new Decompress(opts).src(data).dest(path.dirname(output));
		return pify(decompress.run.bind(decompress))().then(() => data);
	}

	return pify(mkdirp)(path.dirname(output))
		.then(() => fsP.writeFile(output, data))
		.then(() => data);
});

module.exports = (uri, output, opts) => {
	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	opts = Object.assign({encoding: null}, opts);

	let protocol = url.parse(uri).protocol;

	if (protocol) {
		protocol = protocol.slice(0, -1);
	}

	const agent = caw(opts.proxy, {protocol});
	const stream = got.stream(uri, Object.assign(opts, {agent}));
	const dest = output ? path.join(output, filenamify(path.basename(uri))) : null;
	const promise = createPromise(uri, dest, stream, opts);

	stream.then = promise.then.bind(promise);
	stream.catch = promise.catch.bind(promise);

	return stream;
};
