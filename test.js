/*global describe, it */
'use strict';

var fs = require('fs');
var assert = require('assert');
var download = require('./download');

describe('download()', function () {
    it('should download a file', function (cb) {
        download('https://www.google.se/images/srpr/logo4w.png', 'tmp/test.png')
        .on('close', function () {
            fs.statSync('tmp/test.png');
            cb();
        });
    });
    it('should return status code 404', function (cb) {
        download('https://github.com/not/existing/url', 'tmp/404')
        .on('response', function (res) {
            assert.equal(res.statusCode, '404');
            cb();
        });
    });
});
