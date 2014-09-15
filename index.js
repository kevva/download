'use strict';

var combine = require('stream-combiner');
var concat = require('concat-stream');
var decompress = require('decompress');
var each = require('each-async');
var File = require('vinyl');
var fs = require('vinyl-fs');
var path = require('path');
var rename = require('gulp-rename');
var through = require('through2');
var urlRegex = require('url-regex');
var Ware = require('ware');

/**
 * Initialize a new `Download`
 *
 * @param {Object} opts
 * @api public
 */

function Download(opts) {
    if (!(this instanceof Download)) {
        return new Download();
    }

    this.opts = opts || {};
    this.plugins = [];
    this.ware = new Ware();
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

    var request = require('request');
    var self = this;
    var files = [];

    each(this.get(), function (url, i, done) {
        var ret = [];
        var len = 0;

        if (!urlRegex().test(url)) {
            done(new Error('Specify a valid URL'));
            return;
        }

        request.get(url, self.opts)
            .on('response', function (res) {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    res.destroy();
                    done(new Error(res.statusCode));
                    return;
                }

                res.on('error', done);
                res.on('data', function (data) {
                    ret.push(data);
                    len += data.length;
                });

                self.ware.run(res, url);

                res.on('end', function () {
                    files.push({
                        path: path.basename(url),
                        contents: Buffer.concat(ret, len)
                    });

                    done();
                });
            })

            .on('error', done);
    }, function (err) {
        if (err) {
            cb(err);
            return;
        }

        var pipe = self.pipe(files);
        var end = concat(function (files) {
            cb(null, files, pipe);
        });

        pipe.on('error', function (err) {
            cb(err);
            return;
        });

        pipe.pipe(end);
    });
};

/**
 * Construct stream
 *
 * @param {Array} files
 * @api public
 */

Download.prototype.pipe = function (files) {
    var stream = through.obj();
    var streams = [];

    files.forEach(function (file) {
        stream.write(new File(file));
    });

    stream.end();
    streams.push(stream);

    if (this.opts.extract) {
        streams.push(decompress.tar(this.opts));
        streams.push(decompress.tarbz2(this.opts));
        streams.push(decompress.targz(this.opts));
        streams.push(decompress.zip(this.opts));
    }

    if (this.rename()) {
        streams.push(rename(this.rename()));
    }

    if (this.dest()) {
        streams.push(fs.dest(this.dest(), this.opts));
    }

    return combine(streams);
};

/**
 * Module exports
 */

module.exports = Download;
