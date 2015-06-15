'use strict';

var path = require('path');
var concatStream = require('concat-stream');
var decompress = require('gulp-decompress');
var eachAsync = require('each-async');
var filenamify = require('filenamify');
var got = require('got');
var tunnel = require('tunnel-agent');
var getProxy = require('get-proxy');
var isUrl = require('is-url');
var objectAssign = require('object-assign');
var readAllStream = require('read-all-stream');
var rename = require('gulp-rename');
var streamCombiner = require('stream-combiner2');
var through = require('through2');
var Vinyl = require('vinyl');
var vinylFs = require('vinyl-fs');
var Ware = require('ware');

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

	var defaults = {encoding: null};
	var proxy = getProxy();
	if (proxy) {
		var components = proxy.match(/^(http|https):\/\/(?:(.*:.*)@)?([\w\.]*)(?::(\d{0,5}))?/);

		defaults.proxy = {
			proto: components[1],
			host: components[3],
			port: components[4],
			proxyAuth: components[2]
		};
    }

	this.opts = objectAssign(defaults, opts);
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
	var files = [];

	eachAsync(this.get(), function (get, i, done) {
		if (!isUrl(get.url)) {
			done(new Error('Specify a valid URL'));
			return;
		}

		if (this.opts.proxy && !this.opts.agent) {
			var getMatch = get.url.match(/^(http|https):\/\/[^:\/]*(?:\:(\d{1,5}))?/);
			var targetProto = getMatch[1].toLowerCase();
			var targetPort = getMatch[2];

			//Hack to get https working. For some reason it needs the port to explicitly be setted.
			if (targetProto === 'https' && !targetPort) {
				this.opts.port = 443;
			}

			var method = {
				'http-http': 'httpOverHttp',
				'https-http': 'httpsOverHttp',
				'http-https': 'httpOverHttps',
				'https-https': 'httpsOverHttps',
			}[targetProto + '-' + this.opts.proxy.proto.toLowerCase()];

			this.opts.agent = tunnel[method]({proxy: this.opts.proxy});
		}

		var stream = got(get.url, this.opts);

		stream.on('error', done);
		stream.on('response', function (res) {
			this.ware.run(res, get.url);
		}.bind(this));

		readAllStream(stream, null, function (err, data) {
			var dest = get.dest || this.dest();
			var fileStream = this.createStream(this.createFile(get.url, data), dest);

			fileStream.on('error', done);
			fileStream.pipe(concatStream(function (items) {
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
		streams.push(vinylFs.dest(dest, this.opts));
	}

	return streamCombiner(streams);
};
