'use strict';

var decompress = require('decompress');
var eachAsync = require('each-async');
var fs = require('fs');
var mkdir = require('mkdirp');
var path = require('path');
var request = require('request');
var through = require('through2');

/**
 * Download a file to a given destination
 *
 * Options:
 *
 *   - `extract` Try extracting the file
 *   - `mode` Set mode on the downloaded files
 *   - `strip` Equivalent to --strip-components for tar
 *
 * @param {String|Array|Object} url
 * @param {String} dest
 * @param {Object} opts
 * @api public
 */

module.exports = function (url, dest, opts) {
    url = Array.isArray(url) ? url : [url];
    opts = opts || {};

    var stream = through();
    var strip = opts.strip || '0';

    eachAsync(url, function (url, index, done) {
        opts.url = url;
        var target = path.join(dest, path.basename(url));

        if (url.url && url.name) {
            target = path.join(dest, url.name);
            opts.url = url.url;
        }

        var req = request.get(opts)
        .on('response', function (res) {
            stream.emit('response', res);
        })
        .on('data', function (data) {
            stream.emit('data', data);
        })
        .on('error', function (err) {
            stream.emit('error', err);
        });

        req.on('response', function (res) {
            var mime = res.headers['content-type'];
            var status = res.statusCode;
            var end;

            if (status < 200 || status >= 300) {
                stream.emit('error', status);
                return;
            }

            if (opts.extract && decompress.canExtract(url, mime)) {
                var ext;

                if (decompress.canExtract(url)) {
                    ext = url;
                } else {
                    ext = mime;
                }

                end = decompress.extract({
                    ext: ext,
                    path: dest,
                    strip: strip
                });
            } else {
                if (!fs.existsSync(dest)) {
                    mkdir.sync(dest);
                }

                end = fs.createWriteStream(target);
            }

            req.pipe(end);

            end.on('close', function () {
                if (!opts.extract && opts.mode) {
                    fs.chmodSync(target, opts.mode);
                }

                done();
            });
        });
    }, function () {
        stream.emit('close');
    });

    return stream;
};
