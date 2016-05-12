import fs from 'fs';
import path from 'path';
import nock from 'nock';
import rimraf from 'rimraf';
import test from 'ava';
import Download from '../';
const fixture = path.join.bind(path, __dirname, 'fixtures');

test('expose a constructor', t => {
	t.plan(1);
	t.is(typeof Download, 'function');
});

test('return an instance if it called without `new`', t => {
	t.plan(1);
	t.true(Download() instanceof Download); // eslint-disable-line
});

test('set a file to get', t => {
	t.plan(1);

	const download = new Download()
		.get('http://example.com/test.jpg');

	t.is(download._get[0].url, 'http://example.com/test.jpg');
});

test.cb('download a file', t => {
	t.plan(4);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.end();
		});
});

test.cb('download multiple files', t => {
	t.plan(7);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/nested/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/nested/test-file.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files.length, 2, files.length);
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.is(files[1].path, 'test-file.zip');
			t.is(files[1].url, 'http://foo.com/nested/test-file.zip');
			t.end();
		});
});

test.cb('download a file and rename it', t => {
	t.plan(4);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.rename('foobar.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(path.basename(files[0].path), 'foobar.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.end();
		});
});

test.cb('download and extract a file', t => {
	t.plan(3);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download({extract: true})
		.get('http://foo.com/test-file.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'file.txt');
			t.end();
		});
});

test.cb('specify destination folder', t => {
	t.plan(4);

	const d0 = path.join(__dirname, 'tmp');
	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/test.js')
		.replyWithFile(200, __filename);

	new Download({extract: true})
		.get('http://foo.com/test-file.zip')
		.get('http://foo.com/test.js')
		.dest(d0)
		.run(err => {
			const r0 = fs.readdirSync(d0);
			t.ifError(err);
			t.true(scope.isDone());
			rimraf.sync(d0);
			t.is(r0[0], 'file.txt');
			t.is(r0[1], 'test.js');
			t.end();
		});
});

test.cb('specify multiple destination folders', t => {
	t.plan(4);

	const d1 = path.join(__dirname, 't1');
	const d2 = path.join(__dirname, 't2');
	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'))
		.get('/test.js')
		.replyWithFile(200, __filename);

	new Download({extract: true})
		.get('http://foo.com/test-file.zip', d1)
		.get('http://foo.com/test.js')
		.dest(d2)
		.run(err => {
			const r1 = fs.readdirSync(d1);
			const r2 = fs.readdirSync(d2);
			t.ifError(err);
			t.true(scope.isDone());
			rimraf.sync(d1);
			rimraf.sync(d2);
			t.is(r1[0], 'file.txt');
			t.is(r2[0], 'test.js');
			t.end();
		});
});

test.cb('rename file to a valid filename', t => {
	t.plan(4);

	const scope = nock('http://foo.com')
		.get('/test?file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test?file.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'test!file.zip');
			t.is(files[0].url, 'http://foo.com/test?file.zip');
			t.end();
		});
});

test.cb('error on invalid URL', t => {
	t.plan(1);

	new Download()
		.get('foobar')
		.run(err => {
			t.is(err.message, 'Specify a valid URL');
			t.end();
		});
});

test.cb('error on 404', t => {
	t.plan(3);

	const scope = nock('http://foo.com')
		.get('/')
		.reply(404);

	new Download()
		.get('http://foo.com/')
		.run(err => {
			t.true(scope.isDone());
			t.is(err.statusCode, 404);
			t.is(err.message, 'Response code 404 (Not Found)');
			t.end();
		});
});

test.cb('follows 302 redirect', t => {
	t.plan(5);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.reply(302, null, {location: 'http://foo.com/redirected.zip'})
		.get('/redirected.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	let called = 0;

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(() => called++)
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.is(called, 1, `plugin called ${called} times`);
			t.end();
		});
});

test.cb('request options', t => {
	t.plan(4);

	const scope = nock('http://foo.com')
		.matchHeader('authorization', 'Basic dXNlcjpwYXNzd29yZA==')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download({auth: 'user:password'})
		.get('http://foo.com/test-file.zip')
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.end();
		});
});

test.cb('expose the response object', t => {
	t.plan(7);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.use((res, url) => {
			t.truthy(res);
			t.is(res.statusCode, 200);
			t.is(url, 'http://foo.com/test-file.zip');
		})
		.run((err, files) => {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].path, 'test-file.zip');
			t.is(files[0].url, 'http://foo.com/test-file.zip');
			t.end();
		});
});

test.cb('do not flush data to plugin', t => {
	t.plan(3);

	const scope = nock('http://foo.com')
		.get('/test-file.zip')
		.replyWithFile(200, fixture('test-file.zip'));

	new Download()
		.get('http://foo.com/test-file.zip')
		.use(res => res.on('data', () => {}))
		.run(function (err, files) {
			t.ifError(err);
			t.true(scope.isDone());
			t.is(files[0].contents.length, 166);
			t.end();
		});
});
