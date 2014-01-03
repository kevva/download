/*global describe, it, afterEach */
'use strict';

var assert = require('assert');
var download = require('./download');
var fs = require('fs');
var rm = require('rimraf');

describe('download()', function () {
    afterEach(function (cb) {
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
    it('should download and extract a file using MIME type', function (cb) {
        var src = 'https://github.com/kevva/decompress/zipball/master';
        var dest = 'tmp/decompress';
        var dl = download(src, dest, { extract: true, strip: 1 });

        dl.once('close', function () {
            fs.stat(dest + '/decompress.js', cb);
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
    it('should download a file and set the right mode', function (cb) {
        var src = 'https://raw.github.com/yeoman/node-gifsicle/master/vendor/osx/gifsicle';
        var dest = 'tmp';
        var dl = download(src, dest, { mode: '0755' });

        dl.once('close', function () {
            fs.stat(dest + '/gifsicle', function (err, stats) {
                var mode = stats.mode.toString(8);
                cb(assert.equal(mode, '100755'));
            });
        });
    });
    it('should download an array of files', function (cb) {
        var src = [
            'https://www.google.se/images/srpr/logo4w.png',
            'https://ssl.gstatic.com/gb/images/k1_a31af7ac.png'
        ];
        var dest = 'tmp';
        var dl = download(src, dest);
        var calls = 0;

        dl.on('close', function() {
            ++calls;
            if (calls === 2) {
                fs.statSync(dest + '/logo4w.png');
                fs.statSync(dest + '/k1_a31af7ac.png');
                cb();
            }
        });
    });
    it('should emit an error on 404', function (cb) {
        var src = 'https://www.google.com/bogus-resource';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('error', function(status) {
            // providing an Error would be more consistent
            assert.equal(status, 404);
            assert.ok(!fs.existsSync(dest + '/bogus-resource'));
            cb();
        });
    });
    it('should emit an error on connection failure', function (cb) {
        var src = 'http://bogus-domain:12345/foo';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('error', function(err) {
            assert.ok(err instanceof Error);
            cb();
        });
    });
});
