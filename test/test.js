'use strict';

var archiveType = require('archive-type');
var Download = require('../');
var nock = require('nock');
var fs = require('fs');
var path = require('path');
var fixture = path.join.bind(path, __dirname, 'fixtures');
var rm = require('rimraf');
var test = require('ava');

test('expose a constructor', function (t) {
	t.plan(1);
	t.assert(typeof Download === 'function');
});

test('return an instance if it called without `new`', function (t) {
	t.plan(1);
	t.assert(Download() instanceof Download);
});

test('set a file to get', function (t) {
	t.plan(1);

	var download = new Download()
		.get('http://example.com/test.jpg');

	t.assert(download._get[0].url === 'http://example.com/test.jpg');
});

test('download a file', function (t) {
	t.plan(5);

	var download = new Download()
		.get('http://foo.com/test-file.zip');

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	download.run(function (err, files) {
		t.assert(!err, err);
		t.assert(scope.isDone());
		t.assert(files[0].path === 'test-file.zip');
		t.assert(files[0].url === 'http://foo.com/test-file.zip');
		t.assert(archiveType(files[0].contents).ext === 'zip');
	});
});

test('download multiple files', function (t) {
	t.plan(9);

	var download = new Download()
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/nested/test-file.zip');

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/nested/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	download.run(function (err, files) {
		t.assert(!err, err);
		t.assert(scope.isDone());
		t.assert(files.length === 2);
		t.assert(files[0].path === 'test-file.zip');
		t.assert(files[0].url === 'http://foo.com/test-file.zip');
		t.assert(archiveType(files[0].contents).ext === 'zip');
		t.assert(files[1].path === 'test-file.zip');
		t.assert(files[1].url === 'http://foo.com/nested/test-file.zip');
		t.assert(archiveType(files[1].contents).ext === 'zip');
	});
});

test('download a file and rename it', function (t) {
	t.plan(5);

	var download = new Download()
		.get('http://foo.com/test-file.zip')
		.rename('foobar.zip');

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	download.run(function (err, files) {
		t.assert(!err, err);
		t.assert(scope.isDone());
		t.assert(path.basename(files[0].path) === 'foobar.zip');
		t.assert(archiveType(files[0].contents).ext === 'zip');
		t.assert(files[0].url === 'http://foo.com/test-file.zip');
	});
});

test('download and extract a file', function (t) {
	t.plan(3);

	var download = new Download({ extract: true })
		.get('http://foo.com/test-file.zip');

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	download.run(function (err, files) {
		t.assert(!err, err);
		t.assert(scope.isDone());
		t.assert(files[0].path === 'file.txt');
	});
});

test('download and extract multiple files', function (t) {
	t.plan(5);

	var download = new Download({ extract: true })
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/nested/test-file.zip');

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/nested/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	download.run(function (err, files) {
		t.assert(!err, err);
		t.assert(scope.isDone());
		t.assert(files.length === 2);
		t.assert(files[0].path === 'file.txt');
		t.assert(files[1].path === 'file.txt');
	});
});

test('specify destination folder', function (t) {
	t.plan(4);

	var d0 = path.join(__dirname, 'd0');
	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/test.js')
		.replyWithFile(200, __filename);

	new Download({ extract: true })
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/test.js')
		.dest(d0)
		.run(function (err, files) {
			var r0 = fs.readdirSync(d0);
			t.assert(!err, err);
			t.assert(scope.isDone());
			rm.sync(d0);
			t.assert(r0[0] === 'file.txt');
			t.assert(r0[1] === 'test.js');
		});
});

test('specify multiple destination folders', function (t) {
	t.plan(4);

	var d1 = path.join(__dirname, 't1');
	var d2 = path.join(__dirname, 't2');
	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/test.js')
		.replyWithFile(200, __filename);

	new Download({ extract: true })
		.get('http://foo.com/test-file.zip', d1)
		.get('http://foo.com/test.js')
		.dest(d2)
		.run(function (err, files) {
			var r1 = fs.readdirSync(d1);
			var r2 = fs.readdirSync(d2);
			t.assert(!err, err);
			t.assert(scope.isDone());
			rm.sync(d1);
			rm.sync(d2);
			t.assert(r1[0] === 'file.txt');
			t.assert(r2[0] === 'test.js');
		});
});

test('error on invalid URL', function (t) {
	t.plan(1);

	var download = new Download()
		.get('foobar');

	download.run(function (err) {
		t.assert(err.message === 'Specify a valid URL');
	});
});
