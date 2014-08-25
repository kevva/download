'use strict';

var assign = require('object-assign');
var Decompress = require('decompress');
var DownloadJob = require('./downloadJob');
var each = require('each-async');
var path = require('path');
var Ware = require('ware');

/**
 * Initialize Download
 *
 * @param {Object} opts
 * @api public
 */

function Download(opts) {
    if (!(this instanceof Download)) {
        return new Download();
    }

    this._get = [];
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
        return this._get;
    }

    if (typeof dest === 'object') {
        opts = dest;
        dest = require('os').tmpdir();
    }

    opts = assign({}, this.opts, opts);

    if (file.url && file.name) {
        this._get.push(new DownloadJob(file.url, file.name, dest, opts));
    } else {
        var name = path.basename(file);
        this._get.push(new DownloadJob(file, name, dest, opts));
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
    cb = (cb && typeof cb === 'function')? cb : function () {};

    var files = [];
    var self = this;

    each(this.get(), function (job, i, done) {

        console.log(job.opts.abc);
        job.on('error', done)

        .on('response', function (res) {

                self._run(res);
            })

        .on('finish', function () {

                files.push({ url: job.url, location: job.getFullPath() });

                if (job.opts.extract) {
                    return self._extract(job.getFullPath(), job.dest, job.opts, function (err) {
                        if (err) {
                            done(err);
                            return;
                        }

                        done();
                    });

                }else{
                    done();
                }

            })

        .start();


    }, function (err) {
        if (err) {
            cb(err);
            return;
        }

        cb(null, files);
    });
};

/**
 * Run the response through the middleware
 *
 * @param {Object} res
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

Download.prototype._extract = function (filePath, dest, opts, cb) {

    var decompress = new Decompress()
        .src(filePath)
        .dest(dest)
        .use(Decompress.tar(opts))
        .use(Decompress.targz(opts))
        .use(Decompress.zip(opts));

    decompress.decompress(function (err) {
        if (err) {
            cb(err);
            return;
        }

        cb();
    });
};

/**
 * Module exports
 */

module.exports = Download;
