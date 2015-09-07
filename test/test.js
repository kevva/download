'use strict';
var fs = require('fs');
var path = require('path');
var nock = require('nock');
var rimraf = require('rimraf');
var test = require('ava');
var Download = require('../');
var fixture = path.join.bind(path, __dirname, 'fixtures');

test('expose a constructor', function (t) {
	t.plan(1);
	t.assert(typeof Download === 'function', typeof Download);
});

test('return an instance if it called without `new`', function (t) {
	t.plan(1);
	t.assert(Download() instanceof Download);
});

test('set a file to get', function (t) {
	t.plan(1);

	var download = new Download()
		.get('http://example.com/test.jpg');

	t.assert(download._get[0].url === 'http://example.com/test.jpg', download._get[0].url);
});

test('download a file', function (t) {
	t.plan(4);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.run(function (err, files) {
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'test-file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
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
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files.length === 2, files.length);
			t.assert(files[0].path === 'test-file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
			t.assert(files[1].path === 'test-file.zip', files[1].path);
			t.assert(files[1].url === 'http://foo.com/nested/test-file.zip', files[1].url);
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
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(path.basename(files[0].path) === 'foobar.zip', path.basename(files[0].path));
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
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
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'file.txt', files[0].path);
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
		.run(function (err, files) {
			var r0 = fs.readdirSync(d0);
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			rimraf.sync(d0);
			t.assert(r0[0] === 'file.txt', r0[0]);
			t.assert(r0[1] === 'test.js', r0[1]);
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
		.run(function (err, files) {
			var r1 = fs.readdirSync(d1);
			var r2 = fs.readdirSync(d2);
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			rimraf.sync(d1);
			rimraf.sync(d2);
			t.assert(r1[0] === 'file.txt', r1[0]);
			t.assert(r2[0] === 'test.js', r2[0]);
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
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'test!file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test?file.zip', files[0].url);
		});
});

test('error on invalid URL', function (t) {
	t.plan(1);

	new Download()
		.get('foobar')
		.run(function (err) {
			t.assert(err.message === 'Specify a valid URL', err.message);
		});
});

test('error on 404', function (t) {
	t.plan(3);

	var scope = nock('http://foo.com')
		.get('/')
		.reply(404);

	new Download()
		.get('http://foo.com')
		.run(function (err) {
			t.assert(scope.isDone(), scope.isDone());
			t.assert(err.code === 404, err.code);
			t.assert(err.message === 'GET http://foo.com/ response code is 404 (Not Found)', err.message);
		});
});

test('follows 302 redirect', function (t) {
	t.plan(5);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.reply(302, null, { location: 'http://foo.com/redirected.zip' })
		.get('/redirected.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	var called = 0;

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(function () {
			called++;
		})
		.run(function (err, files) {
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'test-file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
			t.assert(called === 1, 'plugin called ' + called + ' times');
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
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'test-file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
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
			t.assert(res, res);
			t.assert(res.statusCode === 200, res.statusCode);
			t.assert(url === 'http://foo.com/test-file.zip', url);
		})
		.run(function (err, files) {
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].path === 'test-file.zip', files[0].path);
			t.assert(files[0].url === 'http://foo.com/test-file.zip', files[0].url);
		});
});

test('do not flush data to plugin', function (t) {
	t.plan(7);

	var scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(function (res, url) {
			res.on('data', function () {});
		})
		.run(function (err, files) {
			t.assert(!err, err);
			t.assert(scope.isDone(), scope.isDone());
			t.assert(files[0].contents.length === 166, files[0].contents.length);
		});
});
