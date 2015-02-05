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
	this.tasks = [];
	this._get = [];
}

/**
 * Get or set URL to download
 *
 * @param {String} url
 * @api public
 */

Download.prototype.get = function (url) {
	if (!arguments.length) {
		return this._get;
	}

	this._get.push(url);
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
 * Add a task to the middleware stack
 *
 * @param {Function} task
 * @api public
 */

Download.prototype.pipe = function (task) {
	this.tasks.push(task);
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

	each(this.get(), function (url, i, done) {
		if (!urlRegex().test(url)) {
			done(new Error('Specify a valid URL'));
			return;
		}

		got(url, { encoding: null }, function (err, data) {
			if (err) {
				done(err);
				return;
			}

			files.push({
				contents: data,
				path: path.basename(url),
				url: url
			});

			done();
		});
	}, function (err) {
		if (err) {
			cb(err);
			return;
		}

		var pipe = self.construct(files);
		var end = concat(function (files) {
			cb(null, files, pipe);
		});

		pipe.on('error', cb);
		pipe.pipe(end);
	});
};

/**
 * Construct stream
 *
 * @param {Array} files
 * @api private
 */

Download.prototype.construct = function (files) {
	var stream = through.obj();

	files.forEach(function (file) {
		var obj = new File(file);
		obj.url = file.url;
		stream.write(obj);
	});

	stream.end();

	if (this.opts.extract) {
		this.tasks.unshift(decompress(this.opts));
	}

	this.tasks.unshift(stream);

	if (this.rename()) {
		this.tasks.push(rename(this.rename()));
	}

	if (this.dest()) {
		this.tasks.push(fs.dest(this.dest(), this.opts));
	}

	return combine(this.tasks);
};

/**
 * Module exports
 */

module.exports = Download;
