'use strict';

var decompress = require('decompress');
//var forEach = require('async-foreach').forEach;
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
        var urlOptions = opts || {};
        urlOptions.strip = urlOptions.strip || '0';

        // If passed a "download object" instead of a string,
        // use the URL property in the object and the filename property to save the file
        // (this "download object" can be extended for other uses on individual files)
        if (url.url && url.filename) {
            urlOptions.url = url.url;
            urlOptions.destination = path.join(dest, url.filename);
        } else {
            urlOptions.url = url;
            urlOptions.destination = path.join(dest, path.basename(url));
        }

        var req = request.get(urlOptions)
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
                return cb(new Error('Invalid status code: ' + status), status);
            }

            if (urlOptions.extract && decompress.canExtract(urlOptions.url, mime)) {
                var ext;

                if (decompress.canExtract(urlOptions.url)) {
                    ext = urlOptions.url;
                } else {
                    ext = mime;
                }

                end = decompress.extract({ ext: ext, path: dest, strip: urlOptions.strip });
            } else {

                if (!fs.existsSync(dest)) {
                    mkdir.sync(dest);
                }

                end = fs.createWriteStream(urlOptions.destination);
            }

            req.pipe(end);

            end.on('close', function () {

                if (!urlOptions.extract && urlOptions.mode) {
                    fs.chmodSync(urlOptions.destination, urlOptions.mode);
                }

                stream.emit('close');

                // Callback
                return cb(null, status);

            });
        });
    }, function (error, statusCodeCollection) {

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
