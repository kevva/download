/*global describe, it, after */
'use strict';

var assert = require('assert');
var download = require('./download');
var fs = require('fs');
var rm = require('rimraf');

describe('download()', function () {
    after(function (cb) {
        rm('tmp', cb);
    });
    it('should download and extract a file', function (cb) {
        var src = 'https://github.com/kevva/download/archive/master.zip';
        var dest = 'tmp';
        var dl = download(src, dest, { extract: true });

        dl.once('close', function () {
            fs.stat(dest + '/download-master/download.js', cb);
        });
    });
    it('should download a file', function (cb) {
        var src = 'https://www.google.se/images/srpr/logo4w.png';
        var dest = 'tmp/test.png';
        var dl = download(src, dest);

        dl.once('close', function () {
            fs.stat(dest, cb);
        });
    });
    it('should return status code 404', function (cb) {
        var src = 'https://github.com/not/existing/url';
        var dest = 'tmp/404';
        var dl = download(src, dest);

        dl.once('response', function (res) {
            cb(assert.equal(res.statusCode, '404'));
        });
    });
});
