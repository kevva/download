/*global describe, it, afterEach */
'use strict';

var assert = require('assert');
var download = require('../download');
var fs = require('fs');
var nock = require('nock');
var path = require('path');
var rm = require('rimraf');

describe('download()', function () {
    afterEach(function (cb) {
        rm(path.join(__dirname, 'tmp'), cb);
    });

    it('should download and extract a file', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        var src = 'http://example.com/file.zip';
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest, { extract: true });

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file.txt')));
            cb(scope.done());
        });
    });

    it('should download and extract a file using MIME type', function (cb) {
        var scope = nock('http://example.com')
            .get('/file')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'), {'content-type': 'application/zip'});

        var src = 'http://example.com/file';
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest, { extract: true });

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file.txt')));
            cb(scope.done());
        });
    });

    it('should download a file without extracting', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        var src = 'http://example.com/file.zip';
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest);

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file.zip')));
            cb(scope.done());
        });
    });

    it('should download a file and rename it', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        var src = {
            url: 'http://example.com/file.zip',
            name: 'file-rename.zip'
        };
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest);

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file-rename.zip')));
            cb(scope.done());
        });
    });

    it('should download a file and set the right mode', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        var src = 'http://example.com/file.zip';
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest, { mode: '0755' });

        dl.on('close', function () {
            fs.stat(path.join(dest, 'file.zip'), function (err, stats) {
                var mode = stats.mode.toString(8);
                assert.equal(mode, '100755');
                cb(scope.done());
            });
        });
    });

    it('should download an array of files', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'))
            .get('/file.tar')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.tar'));

        var src = [
            'http://example.com/file.zip',
            'http://example.com/file.tar'
        ];
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest);

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file.zip')));
            assert.ok(fs.existsSync(path.join(dest, 'file.tar')));
            cb(scope.done());
        });
    });

    it('should download an array of files and rename them', function (cb) {
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'))
            .get('/file.tar')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.tar'));

        var src = [{
            url: 'http://example.com/file.zip',
            name: 'file-rename.zip'
        }, {
            url: 'http://example.com/file.tar',
            name: 'file-rename.tar'
        }];
        var dest = path.join(__dirname, 'tmp');
        var dl = download(src, dest);

        dl.on('close', function () {
            assert.ok(fs.existsSync(path.join(dest, 'file-rename.zip')));
            assert.ok(fs.existsSync(path.join(dest, 'file-rename.tar')));
            cb(scope.done());
        });
    });

    it('should emit an error on 404', function (cb) {
        var scope = nock('http://example.com')
            .get('/error')
            .reply(404);

        var src = 'http://example.com/error';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.on('error', function (status) {
            assert.equal(status, 404);
            cb(scope.done());
        });
    });

    it('should emit an error on connection failure', function (cb) {
        var src = 'http://error:12345/foo';
        var dest = 'tmp';
        var dl = download(src, dest);

        dl.on('error', function (err) {
            cb(assert.ok(err instanceof Error));
        });
    });
});
