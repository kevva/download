import {promises as fs} from 'fs';
import path from 'path';
import test from 'ava';
import contentDisposition from 'content-disposition';
import getStream from 'get-stream';
import isZip from 'is-zip';
import nock from 'nock';
import pathExists from 'path-exists';
import randomBuffer from 'random-buffer';
import m from '.';

test.before(() => {
	nock('http://foo.bar')
		.persist()
		.get('/404')
		.reply(404)
		.get('/foo.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/foo.js')
		.replyWithFile(200, __filename)
		.get('/querystring.zip').query({param: 'value'})
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/dispo')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'), {
			'Content-Disposition': contentDisposition('dispo.zip')
		})
		.get('/foo*bar.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/large.bin')
		.reply(200, randomBuffer(7928260))
		.get('/redirect.zip')
		.reply(302, null, {location: 'http://foo.bar/foo.zip'})
		.get('/redirect-https.zip')
		.reply(301, null, {location: 'https://foo.bar/foo-https.zip'})
		.get('/filetype')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'));

	nock('https://foo.bar')
		.persist()
		.get('/foo-https.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'));
});

test('download as stream', async t => {
	t.true(isZip(await getStream.buffer(m('http://foo.bar/foo.zip'))));
});

test('download as promise', async t => {
	t.true(isZip(await m('http://foo.bar/foo.zip')));
});

test('download a very large file', async t => {
	t.is((await getStream.buffer(m('http://foo.bar/large.bin'))).length, 7928260);
});

test('download and rename file', async t => {
	await m('http://foo.bar/foo.zip', __dirname, {filename: 'bar.zip'});
	t.true(await pathExists(path.join(__dirname, 'bar.zip')));
	await fs.unlink(path.join(__dirname, 'bar.zip'));
});

test('save file', async t => {
	await m('http://foo.bar/foo.zip', __dirname);
	t.true(await pathExists(path.join(__dirname, 'foo.zip')));
	await fs.unlink(path.join(__dirname, 'foo.zip'));
});

test('extract file', async t => {
	await m('http://foo.bar/foo.zip', __dirname, {extract: true});
	t.true(await pathExists(path.join(__dirname, 'file.txt')));
	await fs.unlink(path.join(__dirname, 'file.txt'));
});

test('extract file that is not compressed', async t => {
	await m('http://foo.bar/foo.js', __dirname, {extract: true});
	t.true(await pathExists(path.join(__dirname, 'foo.js')));
	await fs.unlink(path.join(__dirname, 'foo.js'));
});

test('error on 404', async t => {
	await t.throwsAsync(m('http://foo.bar/404'), 'Response code 404 (Not Found)');
});

test('rename to valid filename', async t => {
	await m('http://foo.bar/foo*bar.zip', __dirname);
	t.true(await pathExists(path.join(__dirname, 'foo!bar.zip')));
	await fs.unlink(path.join(__dirname, 'foo!bar.zip'));
});

test('follow redirects', async t => {
	t.true(isZip(await m('http://foo.bar/redirect.zip')));
});

test('follow redirect to https', async t => {
	t.true(isZip(await m('http://foo.bar/redirect-https.zip')));
});

test('handle query string', async t => {
	await m('http://foo.bar/querystring.zip?param=value', __dirname);
	t.true(await pathExists(path.join(__dirname, 'querystring.zip')));
	await fs.unlink(path.join(__dirname, 'querystring.zip'));
});

test('handle content dispositon', async t => {
	await m('http://foo.bar/dispo', __dirname);
	t.true(await pathExists(path.join(__dirname, 'dispo.zip')));
	await fs.unlink(path.join(__dirname, 'dispo.zip'));
});

test('handle filename from file type', async t => {
	await m('http://foo.bar/filetype', __dirname);
	t.true(await pathExists(path.join(__dirname, 'filetype.zip')));
	await fs.unlink(path.join(__dirname, 'filetype.zip'));
});
