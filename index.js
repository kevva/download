'use strict';
const path = require('path');
const url = require('url');
const caw = require('caw');
const concatStream = require('concat-stream');
const decompress = require('gulp-decompress');
const eachAsync = require('each-async');
const filenamify = require('filenamify');
const got = require('got');
const isUrl = require('is-url');
const objectAssign = require('object-assign');
const readAllStream = require('read-all-stream');
const rename = require('gulp-rename');
const streamCombiner = require('stream-combiner2');
const PassThrough = require('readable-stream/passthrough');
const Vinyl = require('vinyl');
const vinylFs = require('vinyl-fs');
const Ware = require('ware');

/**
 * Initialize a new `Download`
 *
 * @param {Object} opts
 * @api public
 */

function Download(opts) {
	if (!(this instanceof Download)) {
		return new Download(opts);
	}
	const strictSSL = process.env.npm_config_strict_ssl;
	this.opts = objectAssign({
		encoding: null,
		rejectUnauthorized: strictSSL ? (strictSSL !== 'false') : (!!strictSSL)
	}, opts);
	this.ware = new Ware();
}

module.exports = Download;

/**
 * Get or set URL to download
 *
 * @param {String} url
 * @param {String} dest
 * @api public
 */

Download.prototype.get = function (url, dest) {
	if (!arguments.length) {
		return this._get;
	}

	this._get = this._get || [];
	this._get.push({
		url: url,
		dest: dest
	});

	return this;
};

/**
 * Get or set the destination folder
 *
 * @param {String} dir
 * @api public
 */

Download.prototype.dest = function (dir) {
	if (!arguments.length) {
		return this._dest;
	}

	this._dest = dir;
	return this;
};

/**
 * Rename the downloaded file
 *
 * @param {Function|String} name
 * @api public
 */

Download.prototype.rename = function (name) {
	if (!arguments.length) {
		return this._rename;
	}

	this._rename = name;
	return this;
};

/**
 * Add a plugin to the middleware stack
 *
 * @param {Function} plugin
 * @api public
 */

Download.prototype.use = function (plugin) {
	this.ware.use(plugin);
	return this;
};

/**
 * Run
 *
 * @param {Function} cb
 * @api public
 */

Download.prototype.run = function (cb) {
	cb = cb || function () {};
	let files = [];

	eachAsync(this.get(), function (get, i, done) {
		if (!isUrl(get.url)) {
			done(new Error('Specify a valid URL'));
			return;
		}

		let protocol = url.parse(get.url).protocol;
		if (protocol) {
			protocol = protocol.slice(0, -1);
		}
		let agent = caw(this.opts.proxy, {protocol: protocol});
		let stream = got.stream(get.url, objectAssign(this.opts, {agent: agent}));

		stream.on('response', function (res) {
			stream.headers = res.headers;
			stream.statusCode = res.statusCode;
			this.ware.run(stream, get.url);
		}.bind(this));

		let hasHttpError = false;

		readAllStream(stream, null, function (err, data) {
			if (hasHttpError) {
				return;
			}

			if (err) {
				if (err instanceof got.HTTPError) {
					hasHttpError = true;
				}

				done(err);
				return;
			}

			let dest = get.dest || this.dest();
			let fileStream = this.createStream(this.createFile(get.url, data), dest);

			fileStream.on('error', done);
			fileStream.pipe(concatStream({encoding: 'object'}, function (items) {
				files = files.concat(items);
				done();
			}));
		}.bind(this));
	}.bind(this), function (err) {
		if (err) {
			cb(err);
			return;
		}

		cb(null, files);
	});
};

/**
 * Create vinyl file
 *
 * @param {String} url
 * @param {Buffer} data
 * @api private
 */

Download.prototype.createFile = function (url, data) {
	return objectAssign(new Vinyl({
		contents: data,
		path: filenamify(path.basename(url))
	}), {url: url});
};

/**
 * Create stream
 *
 * @param {Object} file
 * @param {String} dest
 * @api private
 */

Download.prototype.createStream = function (file, dest) {
	let stream = new PassThrough({objectMode: true});
	let streams = [stream];

	stream.end(file);

	if (this.opts.extract) {
		streams.push(decompress(this.opts));
	}

	if (this.rename()) {
		streams.push(rename(this.rename()));
	}

	if (dest) {
		streams.push(vinylFs.dest(dest, this.opts));
	}

	return streamCombiner.obj(streams);
};
