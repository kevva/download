'use strict';

var fs = require('fs');
var path = require('path');
var mkdir = require('mkdirp');
var request = require('request');
var decompress = require('../decompress/decompress');
var stream = require('through2')();

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

        if (opts.extract && decompress.canExtract(url, mime)) {
            req.pipe(decompress.extract({ type: mime, path: dest }))
            .on('close', function () {
                stream.emit('close');
            });
        } else {
            if (!fs.existsSync(path.dirname(dest))) {
                mkdir.sync(path.dirname(dest));
            }

            req.pipe(fs.createWriteStream(dest))
            .on('close', function () {
                stream.emit('close');
            });
        }
    });

    return stream;
};
