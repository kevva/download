'use strict';
const fs = require('fs');
const path = require('path');
const url = require('url');
const caw = require('caw');
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
const filenameFromPath = res => path.basename(url.parse(res.requestUrl).pathname);

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

const getFilename = (res, data) => {
	const header = res.headers['content-disposition'];
	let filename;

	if (header) {
		const parsed = contentDisposition.parse(header);

		if (parsed.parameters && parsed.parameters.filename) {
			filename = parsed.parameters.filename;
		}
	}

	if (!filename) {
		filename = filenameFromPath(res);
	}

	const parsed = path.parse(filename);
	let ext = parsed.ext;

	if (!ext || ext === '.') {
		ext = (fileType(data) || {}).ext || getExtFromMime(res);
	}

	return filenamify(decodeURIComponent(parsed.name), { replacement: ' ' }) + ext;
};

const getProtocolFromUri = uri => {
	let {protocol} = url.parse(uri);

	if (protocol) {
		protocol = protocol.slice(0, -1);
	}

	return protocol;
};

module.exports = (uri, output, opts) => {
	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	const protocol = getProtocolFromUri(uri);

	opts = Object.assign({
		encoding: null,
		rejectUnauthorized: process.env.npm_config_strict_ssl !== 'false'
	}, opts);

	const agent = caw(opts.proxy, {protocol});
	const stream = got.stream(uri, Object.assign({agent}, opts))
		.on('redirect', (response, nextOptions) => {
			const redirectProtocol = getProtocolFromUri(nextOptions.href);
			if (redirectProtocol && redirectProtocol !== protocol) {
				nextOptions.agent = caw(opts.proxy, {protocol: redirectProtocol});
			}
		});

	const promise = pEvent(stream, 'response').then(res => {
		const encoding = opts.encoding === null ? 'buffer' : opts.encoding;
		return Promise.all([getStream(stream, {encoding}), res]);
	}).then(result => {
		const [data, res] = result;

		if (!output) {
			return opts.extract && archiveType(data) ? decompress(data, opts) : data;
		}

		const filename = opts.filename || getFilename(res, data);
		const outputFilepath = path.join(output, filename);

		if (opts.extract && archiveType(data)) {
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
