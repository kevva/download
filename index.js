'use strict';
const fs = require('fs');
const path = require('path');
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

const getFilename = (res, data) => {
	const header = res.headers['content-disposition'];

	if (header) {
		const parsed = contentDisposition.parse(header);

		if (parsed.parameters && parsed.parameters.filename) {
			return parsed.parameters.filename;
		}
	}

	let filename = filenameFromPath(res);

	if (!path.extname(filename)) {
		const ext = (fileType(data) || {}).ext || getExtFromMime(res);

		if (ext) {
			filename = `${filename}.${ext}`;
		}
	}

	return filename;
};

module.exports = async (uri, output, opts) => {
	if (typeof output === 'object') {
		opts = output;
		output = null;
	}

	const strictSSL = Boolean(process.env.npm_config_strict_ssl === 'false' ? '' : process.env.npm_config_strict_ssl);
	this.opts = {
		encoding: null,
		rejectUnauthorized: strictSSL,
		...opts
	};

	const stream = got.stream(uri, opts);

	const streamResponse = await pEvent(stream, 'response');
	const encoding = opts.encoding === null ? 'buffer' : opts.encoding;

	const result = await Promise.all([getStream(stream, {encoding}), streamResponse]);
	const [data, res] = result;

	if (!output) {
		return opts.extract && archiveType(data) ? decompress(data, opts) : data;
	}

	const filename = opts.filename || filenamify(getFilename(res, data));
	const outputFilepath = path.join(output, filename);

	if (opts.extract && archiveType(data)) {
		return decompress(data, path.dirname(outputFilepath), opts);
	}

	await makeDir(path.dirname(outputFilepath));
	const streamData = await fsP.writeFile(outputFilepath, data);

	return streamData;
};
