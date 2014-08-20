'use strict';

var Download = require('../');
var fs = require('fs');
var nock = require('nock');
var path = require('path');
var test = require('ava');

test('expose a constructor', function (t) {
    t.plan(1);
    t.assert(typeof Download === 'function');
});

test('add a plugin to the middleware stack', function (t) {
    t.plan(1);

    var download = new Download()
        .use(function () {});

    t.assert(download.ware.fns.length === 1);
});

test('set a file to get', function (t) {
    t.plan(2);

    var download = new Download()
        .get('http://example.com/test.jpg', '/tmp');

    t.assert(download._get[0].url === 'http://example.com/test.jpg');
    t.assert(download._get[0].dest === '/tmp');
});

test('download a file', function (t) {
    t.plan(3);

    var download = new Download()
        .get({ url: 'http://e.com/f.zip', name: '1.zip' }, path.join(__dirname, 'tmp'));
    var scope = nock('http://e.com')
        .get('/f.zip')
        .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

    download.run(function (err) {
        t.assert(!err);
        t.assert(scope.isDone());

        fs.exists(path.join(__dirname, 'tmp/1.zip'), function (e) {
            t.assert(e);
        });
    });
});

test('download a file and set mode', function (t) {
    t.plan(3);

    var download = new Download({ mode: 755 })
        .get({ url: 'http://e.com/f.zip', name: '3.zip' }, path.join(__dirname, 'tmp'));
    var scope = nock('http://e.com')
        .get('/f.zip')
        .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

    download.run(function (err) {
        t.assert(!err);
        t.assert(scope.isDone());

        fs.stat(path.join(__dirname, 'tmp/3.zip'), function (err, stats) {
            t.assert(stats.mode.toString(8) === '100755');
        });
    });
});

test('download and extract a file', function (t) {
    t.plan(3);

    var download = new Download({ extract: true })
        .get({ url: 'http://e.com/f.zip', name: '4.zip' }, path.join(__dirname, 'tmp'));
    var scope = nock('http://e.com')
        .get('/f.zip')
        .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

    download.run(function (err) {
        t.assert(!err);
        t.assert(scope.isDone());

        fs.exists(path.join(__dirname, 'tmp/file.txt'), function (e) {
            t.assert(e);
        });
    });
});

test('download a file to Buffer', function (t) {
    t.plan(4);

    var download = new Download()
        .get('http://e.com/f.zip');
    var scope = nock('http://e.com')
        .get('/f.zip')
        .replyWithFile(200, path.join(__dirname, 'fixtures/file.zip'));

    download.run(function (err, files) {
        t.assert(!err);
        t.assert(scope.isDone());
        t.assert(files[0].url === 'http://e.com/f.zip');
        t.assert(files[0].contents.length > 0);
    });
});

test('error on 404', function (t) {
    t.plan(2);

    var download = new Download()
        .get('http://e.com/error');
    var scope = nock('http://e.com')
        .get('/error')
        .reply(404);

    download.run(function (err) {
        t.assert(err === 404);
        t.assert(scope.isDone());
    });
});
