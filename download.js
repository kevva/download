'use strict';

var decompress = require('decompress');
var forEach = require('async-foreach').forEach;
var fs = require('fs');
var mkdir = require('mkdirp');
var path = require('path');
var request = require('request');
var stream = require('through2')();
var async = require('async');

/**
 * Download a file to a given destination
 *
 * Options:
 *
 *   - `extract` Try extracting the file
 *   - `mode` Set mode on the downloaded files
 *   - `strip` Equivalent to --strip-components for tar
 *
 * @param {String|Array} url
 * @param {String} dest
 * @param {Object} opts
 * @api public
 */

module.exports = function (url, dest, opts) {

    url = Array.isArray(url) ? url : [url];

    async.map(url, function (url, cb) {

        // Load in global options for this particular download
        // This will prevent conflicts between multiple download requests
        // while still maintaining global defaults set through opts
        var this_opts = opts || {};
        this_opts.strip = this_opts.strip || '0';

        this_opts.url = url;
        this_opts.destination = path.join(dest, path.basename(url));

        var req = request.get(this_opts)
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
                return callback(new Error('Invalid status code: ' + status), status);
            }

            if (this_opts.extract && decompress.canExtract(this_opts.url, mime)) {
                var ext;

                if (decompress.canExtract(this_opts.url)) {
                    ext = this_opts.url;
                } else {
                    ext = mime;
                }

                end = decompress.extract({ ext: ext, path: dest, strip: this_opts.strip });
            } else {

                if (!fs.existsSync(dest)) {
                    mkdir.sync(dest);
                }

                end = fs.createWriteStream(this_opts.destination);
            }

            req.pipe(end);

            end.on('close', function () {

                if (!this_opts.extract && this_opts.mode) {
                    fs.chmodSync(this_opts.destination, this_opts.mode);
                }

                stream.emit('close');

                // Callback
                return cb(null, status);

            });
        });
    }, function (error, status_code_collection) {

        // This block is here to ensure all requests have
        // completed before emitting a "done" event
        // I've had issues with race conditions in tests, even with only 2 items.
        // One file would complete, emit the "close" event, and the test would check for all files
        // This was problematic as some of the other requests/io were not done yet.

        // Error is handled by emiting an error on each individual file.
        // So we ignore it here for now
        // if (error) {}

        // We are done!
        stream.emit('done');

    });

    return stream;

};
