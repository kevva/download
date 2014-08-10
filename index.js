'use strict';

var assign = require('object-assign');
var Decompress = require('decompress');
var each = require('each-async');
var fs = require('fs-extra');
var path = require('path');

/**
 * Initialize Download
 *
 * @param {Object} opts
 * @api public
 */

function Download(opts) {
    this._url = [];
    this.opts = opts || {};
    this.opts.encoding = null;
    this.opts.proxy = process.env.HTTPS_PROXY ||
                      process.env.https_proxy ||
                      process.env.HTTP_PROXY ||
                      process.env.http_proxy;
}

/**
 * Add a URL to download
 *
 * @param {String|Object} file
 * @param {String} dest
 * @param {Object} opts
 * @api public
 */

Download.prototype.get = function (file, dest, opts) {
    if (!arguments.length) {
        return this._url;
    }

    dest = dest || process.cwd();
    opts = opts || {};

    if (file.url && file.name) {
        this._url.push({ url: file.url, name: file.name, dest: dest, opts: opts });
    } else {
        this._url.push({ url: file, dest: dest, opts: opts });
    }

    return this;
};

/**
 * Set proxy
 *
 * @param {String} proxy
 * @api public
 */

Download.prototype.proxy = function (proxy) {
    if (!arguments.length) {
        return this.opts.proxy;
    }

    this.opts.proxy = proxy;
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

    each(this.get(), function (obj, i, done) {
        var name = obj.name || path.basename(obj.url);
        var opts = assign(self.opts, obj.opts);

        request.get(obj.url, opts, function (err, res, data) {
            if (err) {
                return done(err);
            }

            if (res.statusCode < 200 || res.statusCode >= 300) {
                return done(res.statusCode);
            }

            if (opts.extract) {
                return self._extract(data, obj.dest, opts, function (err) {
                    if (err) {
                        return done(err);
                    }

                    done(err);
                });
            }

            fs.outputFile(path.join(obj.dest, name), data, function (err) {
                if (err) {
                    return done(err);
                }

                done();
            });
        });
    }, function (err) {
        if (err) {
            return cb(err);
        }

        cb();
    });
};

/**
 * Extract archive
 *
 * @param {Buffer} buf
 * @param {String} dest
 * @param {Object} opts
 * @param {Function} cb
 * @api private
 */

Download.prototype._extract = function (buf, dest, opts, cb) {
    var decompress = new Decompress()
        .src(buf)
        .dest(dest)
        .use(Decompress.tar(opts))
        .use(Decompress.targz(opts))
        .use(Decompress.zip(opts));

    decompress.decompress(function (err) {
        if (err) {
            return cb(err);
        }

        cb();
    });
};

/**
 * Module exports
 */

module.exports = Download;
