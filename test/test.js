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
            .get('http://example.com/file.zip', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert(scope.isDone());

            fs.exists(path.join(__dirname, 'tmp/file.zip'), function (e) {
                assert(e);
                cb();
            });
        });
    });

    it('should download a file and rename it', function (cb) {
        var download = new Download()
            .get({ url: 'http://example.com/file.zip', name: 'file-rename.zip' }, path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert(scope.isDone());

            fs.exists(path.join(__dirname, 'tmp/file-rename.zip'), function (e) {
                assert(e);
                cb();
            });
        });
    });

    it('should download a file and set the right mode', function (cb) {
        var download = new Download({ mode: 755 })
            .get('http://example.com/file.zip', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert(scope.isDone());

            fs.stat(path.join(__dirname, 'tmp/file.zip'), function (err, stats) {
                assert(stats.mode.toString(8) === '100755');
                cb();
            });
        });
    });

    it('should download and extract a file', function (cb) {
        var download = new Download({ extract: true })
            .get('http://example.com/file.zip', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/file.zip')
            .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

        download.run(function (err) {
            assert(!err);
            assert(scope.isDone());

            fs.exists(path.join(__dirname, 'tmp/file.txt'), function (e) {
                assert(e);
                cb();
            });
        });
    });

    it('should error on 404', function (cb) {
        var download = new Download()
            .get('http://example.com/error', path.join(__dirname, 'tmp'));
        var scope = nock('http://example.com')
            .get('/error')
            .reply(404);

        download.run(function (err) {
            assert(err === 404);
            assert(scope.isDone());
            cb();
        });
    });
});
