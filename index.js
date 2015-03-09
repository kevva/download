'use strict';

var combine = require('stream-combiner2');
var concatStream = require('concat-stream');
var decompress = require('gulp-decompress');
var eachAsync = require('each-async');
var File = require('vinyl');
var filenamify = require('filenamify');
var got = require('got');
var isUrlSuperb = require('is-url-superb');
var path = require('path');
var rename = require('gulp-rename');
var through = require('through2');
var vfs = require('vinyl-fs');

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

	this.opts = opts || {};
}

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
 * Run
 *
 * @param {Function} cb
 * @api public
 */

Download.prototype.run = function (cb) {
	cb = cb || function () {};
	var files = [];

	eachAsync(this.get(), function (get, i, done) {
		if (!isUrlSuperb(get.url)) {
			done(new Error('Specify a valid URL'));
			return;
		}

		got(get.url, {encoding: null}, function (err, data) {
			if (err) {
				done(err);
				return;
			}

			var dest = get.dest || this.dest();
			var stream = this.createStream(this.createFile(get.url, data), dest);

			stream.on('error', cb);
			stream.pipe(concatStream(function (items) {
				items.forEach(function (item) {
					files.push(item);
				});

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
	var obj = new File({
		contents: data,
		path: filenamify(path.basename(url))
	});

	obj.url = url;
	return obj;
};

/**
 * Create stream
 *
 * @param {Object} file
 * @param {String} dest
 * @api private
 */

Download.prototype.createStream = function (file, dest) {
	var stream = through.obj();
	var streams = [stream];

	stream.end(file);

	if (this.opts.extract) {
		streams.push(decompress(this.opts));
	}

	if (this.rename()) {
		streams.push(rename(this.rename()));
	}

	if (dest) {
		streams.push(vfs.dest(dest, this.opts));
	}

	return combine(streams);
};

/**
 * Module exports
 */

module.exports = Download;
