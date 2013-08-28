'use strict';

var decompress = require('decompress');
var fs = require('fs');
var mkdir = require('mkdirp');
var path = require('path');
var request = require('request');
var stream = require('through2')();

/**
 * Download a file to a given destination
 *
 * Options:
 *
 *   - `extract` Try extracting the file
 *
 * @param {String} url
 * @param {String} dest
 * @param {Object} opts
 */

module.exports = function (url, dest, opts) {
    opts = opts || {};
    opts.url = url;

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
            return;
        }

        if (opts.extract && decompress.canExtract(url, mime)) {
            end = decompress.extract({ ext: mime, path: dest });
        } else {
            if (!fs.existsSync(path.dirname(dest))) {
                mkdir.sync(path.dirname(dest));
            }

            end = fs.createWriteStream(dest);
        }

        req.pipe(end);

        end.on('close', function () {
            stream.emit('close');
        });
    });

    return stream;
};
