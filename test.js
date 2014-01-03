/*global describe, it, afterEach */
'use strict';

var assert = require('assert');
var download = require('./download');
var fs = require('fs');
var rm = require('rimraf');
var nock = require('nock');

describe('download()', function () {
    afterEach(function (cb) {
        rm('tmp', cb);
    });
    it('should download and extract a file', function (cb) {
        var scope = nock('http://example.com')
            .get('/success.zip')
            .replyWithFile(200, __dirname + '/fixtures/success.zip');

        var src = 'http://example.com/success.zip';
        var dest = 'tmp';
        var dl = download(src, dest, { extract: true });

        dl.once('close', function () {
            assert.ok(fs.existsSync(dest + '/success.txt'));
            cb(scope.done());
        });
    });
    it('should download and extract a file using MIME type', function (cb) {
        var scope = nock('http://example.com')
            .get('/success/zipball/master')
            .replyWithFile(200, __dirname + '/fixtures/success.zip',
                {'content-type': 'application/zip'});

        var src = 'http://example.com/success/zipball/master';
        var dest = 'tmp/success';
        var dl = download(src, dest, { extract: true, strip: 1 });

        dl.once('close', function () {
            assert.ok(fs.existsSync(dest + '/success.txt'));
            cb(scope.done());
        });
    });
    it('should download a file (without extracting)', function (cb) {
        var scope = nock('http://example.com')
            .get('/success.zip')
            .replyWithFile(200, __dirname + '/fixtures/success.zip');

        var src = 'http://example.com/success.zip';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.once('close', function () {
            assert.ok(fs.existsSync(dest + '/success.zip'));
            cb(scope.done());
        });
    });
    it('should download a file and set the right mode', function (cb) {
        var scope = nock('http://example.com')
            .get('/empty-file')
            .replyWithFile(200, __dirname + '/fixtures/empty-file');

        var src = 'http://example.com/empty-file';
        var dest = 'tmp';
        var dl = download(src, dest, { mode: '0755' });

        dl.once('close', function () {
            fs.stat(dest + '/empty-file', function (err, stats) {
                var mode = stats.mode.toString(8);
                assert.equal(mode, '100755');
                cb(scope.done());
            });
        });
    });
    it('should download an array of files', function (cb) {
        var scope = nock('http://example.com')
            .get('/success.zip')
            .replyWithFile(200, __dirname + '/fixtures/success.zip')
            .get('/empty-file')
            .replyWithFile(200, __dirname + '/fixtures/empty-file');

        var src = [
            'http://example.com/success.zip',
            'http://example.com/empty-file'
        ];
        var dest = 'tmp';
        var dl = download(src, dest);
        var calls = 0;

        dl.on('close', function() {
            ++calls;
            if (calls === 2) {
                fs.statSync(dest + '/success.zip');
                fs.statSync(dest + '/empty-file');
                cb();
            }
        });
    });
    it('should emit an error on 404', function (cb) {
        var scope = nock('http://example.com')
            .get('/bogus-resource')
            .reply(404);

        var src = 'http://example.com/bogus-resource';
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
