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
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('close', function () {
            fs.stat(dest + '/logo4w.png', cb);
        });
    });
    it('should download an array of files', function (cb) {
        var src = [
            'https://www.google.se/images/srpr/logo4w.png',
            'https://ssl.gstatic.com/gb/images/k1_a31af7ac.png'
        ];
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('close', function () {
            fs.statSync(dest + '/logo4w.png');
            fs.statSync(dest + '/k1_a31af7ac.png');
            cb();
        });
    });
});
