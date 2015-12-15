'use strict';
var fs = require('fs');
var path = require('path');
var nock = require('nock');
var rimraf = require('rimraf');
var test = require('ava');
var Transform = require('readable-stream').Transform;
var Download = require('../');
var fixture = path.join.bind(path, __dirname, 'fixtures');

test('expose a constructor', function (t) {
	t.plan(1);
	t.is(typeof Download, 'function');
});

test('return an instance if it called without `new`', function (t) {
	t.plan(1);
	t.ok(Download() instanceof Download); // eslint-disable-line
});

test('set a file to get', function (t) {
	t.plan(1);

	var download = new Download()
		.get('http://example.com/test.jpg');

	t.is(download._get[0].url, 'http://example.com/test.jpg');
});

test('download a file', function (t) {
	t.plan(4);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
		});
});

test('download multiple files', function (t) {
	t.plan(7);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/nested/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/nested/test-file.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files.length, 2, files.length);
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.is(files[1].path, 'test-file.zip');
			t.is(files[1].url, 'http://foo.com/nested/test-file.zip');
		});
});

test('download a file and rename it', function (t) {
	t.plan(4);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.rename('foobar.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(path.basename(files[0].path), 'foobar.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
		});
});

test('download and extract a file', function (t) {
	t.plan(3);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download({extract: true})
		.get('http://foo.com/test-file.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'file.txt');
		});
});

test('specify destination folder', function (t) {
	t.plan(4);

	var d0 = path.join(__dirname, 'tmp');
	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/test.js')
		.replyWithFile(200, __filename);

	new Download({extract: true})
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/test.js')
		.dest(d0)
		.run(function (err) {
			var r0 = fs.readdirSync(d0);
			t.ifError(err);
			t.ok(scope.isDone());
			rimraf.sync(d0);
			t.is(r0[0], 'file.txt');
			t.is(r0[1], 'test.js');
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

	new Download({extract: true})
		.get('http://foo.com/test-file.zip', d1)
		.get('http://foo.com/test.js')
		.dest(d2)
		.run(function (err) {
			var r1 = fs.readdirSync(d1);
			var r2 = fs.readdirSync(d2);
			t.ifError(err);
			t.ok(scope.isDone());
			rimraf.sync(d1);
			rimraf.sync(d2);
			t.is(r1[0], 'file.txt');
			t.is(r2[0], 'test.js');
		});
});

test('rename file to a valid filename', function (t) {
	t.plan(4);

	var scope = nock('http://foo.com')
		.get('/test?file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test?file.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test!file.zip');
			t.is(files[0].url, 'http://foo.com/test?file.zip');
		});
});

test('error on invalid URL', function (t) {
	t.plan(1);

	new Download()
		.get('foobar')
		.run(function (err) {
			t.is(err.message, 'Specify a valid URL');
		});
});

test('error on 404', function (t) {
	t.plan(3);

	var scope = nock('http://foo.com')
		.get('/')
		.reply(404);

	new Download()
		.get('http://foo.com/')
		.run(function (err) {
			t.ok(scope.isDone());
			t.is(err.statusCode, 404);
			t.is(err.message, 'Response code 404 (Not Found)');
		});
});

test('follows 302 redirect', function (t) {
	t.plan(5);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.reply(302, null, {location: 'http://foo.com/redirected.zip'})
		.get('/redirected.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	var called = 0;

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(function () {
			called++;
		})
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.is(called, 1, 'plugin called ' + called + ' times');
		});
});

test('request options', function (t) {
	t.plan(4);

	var scope = nock('http://foo.com')
		.matchHeader('authorization', 'Basic dXNlcjpwYXNzd29yZA==')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download({auth: 'user:password'})
		.get('http://foo.com/test-file.zip')
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
		});
});

test('expose the response object', function (t) {
	t.plan(7);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(function (res, url) {
			t.ok(res);
			t.is(res.statusCode, 200);
			t.is(url, 'http://foo.com/test-file.zip');
		})
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
		});
});

test('do not flush data to plugin', function (t) {
	t.plan(3);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(function (res) {
			res.on('data', function () {});
		})
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].contents.length, 166);
		});
});

test('add transform stream', function (t) {
	t.plan(5);

	var stream = new Transform({
		objectMode: true,
		transform: function (file, enc, cb) {
			t.is(file.path, 'test-file.zip');

			cb(null, file);
		}
	});

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.addTransform(stream)
		.run(function (err, files) {
			t.ifError(err);
			t.ok(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
		});
});
