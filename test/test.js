/*global describe, it, afterEach */
'use strict';

var assert = require('assert');
var Download = require('../');
var fs = require('fs');
var nock = require('nock');
var path = require('path');
var rm = require('rimraf');

describe('download()', function () {
    afterEach(function (cb) {
        rm(path.join(__dirname, 'tmp'), cb);
    });

    it('should download a file', function (cb) {
        var download = new Download()
            .url('http://example.com/file.zip', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert.ok(fs.existsSync(path.join(__dirname, 'tmp', 'file.zip')));
            cb(scope.done());
        });
    });

    it('should download a file and rename it', function (cb) {
        var download = new Download()
            .url({ url: 'http://example.com/file.zip', name: 'file-rename.zip' }, path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert.ok(fs.existsSync(path.join(__dirname, 'tmp', 'file-rename.zip')));
            cb(scope.done());
        });
    });

    it('should download multiple files', function (cb) {
        var download = new Download()
            .url('http://example.com/file.zip', path.join(__dirname, 'tmp'))
            .url('http://example.com/file.tar', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'))
            .get('/file.tar')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.tar'));

        download.run(function (err) {
            assert(!err);
            assert.ok(fs.existsSync(path.join(__dirname, 'tmp', 'file.zip')));
            assert.ok(fs.existsSync(path.join(__dirname, 'tmp', 'file.tar')));
            cb(scope.done());
        });
    });

    it('should download and extract a file', function (cb) {
        var download = new Download({ extract: true })
            .url('http://example.com/file.zip', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert.ok(fs.existsSync(path.join(__dirname, 'tmp', 'file.txt')));
            cb(scope.done());
        });
    });

    it('should error on 404', function (cb) {
        var download = new Download()
            .url('http://example.com/error', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/error')
            .reply(404);

        download.run(function (err) {
            assert(err);
            cb(scope.done());
        });
    });
});
