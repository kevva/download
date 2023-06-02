import {promises as fs} from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import contentDisposition from 'content-disposition';
import archiveType from '@xhmikosr/archive-type';
import decompress from '@xhmikosr/decompress';
import defaults from 'defaults';
import filenamify from 'filenamify';
import getStream from 'get-stream';
import got from 'got';
import {pEvent} from 'p-event';
import fileType from 'file-type';
import extName from 'ext-name';

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

		if (parsed.parameters?.filename) {
			return parsed.parameters.filename;
		}
	}

	let filename = filenameFromPath(res);

	if (!path.extname(filename)) {
		const ext = fileType(data)?.ext || getExtFromMime(res);

		if (ext) {
			filename = `${filename}.${ext}`;
		}
	}

	return filename;
};

const download = (uri, output, options) => {
	if (typeof output === 'object') {
		options = output;
		output = null;
	}

	options = defaults(options, {
		got: {
			responseType: 'buffer',
			https: {
				rejectUnauthorized: process.env.npm_config_strict_ssl !== 'false',
			},
		},
		decompress: {},
	});

	const stream = got.stream(uri, options.got);

	const promise = pEvent(stream, 'response')
		.then(res => {
			const encoding = options.got.responseType === 'buffer' ? 'buffer' : options.got.encoding;
			return Promise.all([getStream(stream, {encoding}), res]);
		})
		.then(([data, res]) => {
			if (!output) {
				return options.extract && archiveType(data)
					? decompress(data, options.decompress)
					: data;
			}

			const filename = options.filename || filenamify(getFilename(res, data));
			const outputFilepath = path.join(output, filename);

			if (options.extract && archiveType(data)) {
				return decompress(
					data,
					path.dirname(outputFilepath),
					options.decompress,
				);
			}

			return fs
				.mkdir(path.dirname(outputFilepath), {recursive: true})
				.then(() => fs.writeFile(outputFilepath, data))
				.then(() => data);
		});

	// eslint-disable-next-line unicorn/no-thenable
	stream.then = promise.then.bind(promise);
	stream.catch = promise.catch.bind(promise);

	return stream;
};

export default download;
