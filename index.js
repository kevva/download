'use strict';

var combine = require('stream-combiner2');
var concat = require('concat-stream');
var decompress = require('gulp-decompress');
var each = require('each-async');
var File = require('vinyl');
var fs = require('vinyl-fs');
var got = require('got');
var path = require('path');
var rename = require('gulp-rename');
var through = require('through2');
var urlRegex = require('url-regex');

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
		return this._name;
	}

	this._name = name;
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

	var self = this;
	var files = [];

	each(this.get(), function (get, i, done) {
		if (!urlRegex().test(get.url)) {
			done(new Error('Specify a valid URL'));
			return;
		}

		got(get.url, { encoding: null }, function (err, data) {
			if (err) {
				done(err);
				return;
			}

			var dest = get.dest || self.dest();
			var stream = self.createStream(self.createFile(get.url, data), dest);

			stream.on('error', cb);
			stream.pipe(concat(function (items) {
				items.forEach(function (item) {
					files.push(item);
				});

				done();
			}));
		});
	}, function (err) {
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
		path: path.basename(url)
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
		streams.push(fs.dest(dest, this.opts));
	}

	return combine(streams);
};

/**
 * Module exports
 */

module.exports = Download;
