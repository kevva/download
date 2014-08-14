'use strict';

var assign = require('object-assign');
var Decompress = require('decompress');
var each = require('each-async');
var fs = require('fs-extra');
var path = require('path');
var Ware = require('ware');

/**
 * Initialize Download
 *
 * @param {Object} opts
 * @api public
 */

function Download(opts) {
    this._url = [];
    this.ware = new Ware();
    this.opts = opts || {};
    this.opts.encoding = null;
    this.opts.mode = parseInt(this.opts.mode, 8) || null;
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
        var ret = [];

        request.get(obj.url, opts)
            .on('error', done)

            .on('data', function (data) {
                ret.push(data);
            })

            .on('response', function (res) {
                if (res.statusCode < 200 || res.statusCode >= 300) {
                    return cb(res.statusCode);
                }

                self._run(res);

                res.on('end', function () {
                    if (opts.extract) {
                        return self._extract(Buffer.concat(ret), obj.dest, opts, function (err) {
                            if (err) {
                                return done(err);
                            }

                            done(err);
                        });
                    }

                    fs.outputFile(path.join(obj.dest, name), Buffer.concat(ret), function (err) {
                        if (err) {
                            return done(err);
                        }

                        if (opts.mode) {
                            return fs.chmod(path.join(obj.dest, name), opts.mode, function (err) {
                                if (err) {
                                    return done(err);
                                }

                                done();
                            });
                        }

                        done();
                    });
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
 * Run the response through the middleware
 *
 * @param {Object} res
 * @param {Function} cb
 * @api public
 */

Download.prototype._run = function (res) {
    this.ware.run(res, this);
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
