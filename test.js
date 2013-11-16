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

        dl.once('done', function () {
            fs.stat(dest + '/download-master/download.js', cb);
        });
    });
    it('should download and extract a file using MIME type', function (cb) {
        var src = 'https://github.com/kevva/decompress/zipball/master';
        var dest = 'tmp/decompress';
        var dl = download(src, dest, { extract: true, strip: 1 });

        dl.once('done', function () {
            fs.stat(dest + '/decompress.js', cb);
        });
    });
    it('should download a file', function (cb) {
        var src = 'https://www.google.se/images/srpr/logo4w.png';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('done', function () {
            fs.stat(dest + '/logo4w.png', cb);
        });
    });
    it('should download a file and set the right mode', function (cb) {
        var src = 'https://raw.github.com/yeoman/node-gifsicle/master/vendor/osx/gifsicle';
        var dest = 'tmp';
        var dl = download(src, dest, { mode: '0755' });

        dl.once('done', function () {
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

        dl.once('done', function () {
            fs.statSync(dest + '/logo4w.png');
            fs.statSync(dest + '/k1_a31af7ac.png');
            cb();
        });
    });
    it('should download a file and save with a custom filename', function (cb) {
        // Crazy, dynamic image URL (Yeoman's Gravatar)
        var src = 'https://0.gravatar.com/avatar/1039a7af7ed0840f84367608d0321ef5?d=https%3A%2F%2Fidenticons.github.com%2F845e9b722490df2335dba9cdc80a234c.png&r=x&s=440';
        var dest = 'tmp';
        var dl = download({ url : src, filename: 'yeoman_gravatar.png' }, dest);

        dl.once('done', function () {
            fs.stat(dest + '/yeoman_gravatar.png', cb);
        });
    });
    it('should download an array of files and save each with a custom filename', function (cb) {
        // Crazy, dynamic image URLs (GitHub's and Joyent's Gravatars)
        var src = [
            { url: 'https://2.gravatar.com/avatar/61024896f291303615bcd4f7a0dcfb74?d=https%3A%2F%2Fidenticons.github.com%2Fae816a80e4c1c56caa2eb4e1819cbb2f.png&r=x&s=440', filename: 'github_gravatar.png' },
            { url: 'https://0.gravatar.com/avatar/95c8b4070c2ba024f87a8fdca63e9d24?d=https%3A%2F%2Fidenticons.github.com%2Fb569502f473b890f9fcfc45b8a227baa.png&r=x&s=440', filename: 'joyent_gravatar.png' }
        ];
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('done', function () {
            fs.statSync(dest + '/github_gravatar.png');
            fs.statSync(dest + '/joyent_gravatar.png');
            cb();
        });
    });
});
