import fs from 'fs';
import path from 'path';
import getStream from 'get-stream';
import isZip from 'is-zip';
import nock from 'nock';
import pathExists from 'path-exists';
import pify from 'pify';
import randomBuffer from 'random-buffer';
import {serial as test} from 'ava';
import m from './';

const fsP = pify(fs);

test.beforeEach(t => {
	t.context = nock('http://foo.bar')
		.get('/404')
		.reply(404)
		.get('/foo.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/foo?bar.zip')
		.replyWithFile(200, path.join(__dirname, 'fixture.zip'))
		.get('/redirect.zip')
		.reply(302, null, {location: 'http://foo.bar/foo.zip'});
});

test('download as stream', async t => {
	t.true(isZip(await getStream.buffer(m('http://foo.bar/foo.zip'))));
});

test('download as promise', async t => {
	t.true(isZip(await m('http://foo.bar/foo.zip')));
});

test('download a very large file', async t => {
	// The randomBuffer creation is slow, so only create this mock for this particular test.
	t.context
		.get('/large.bin')
		.reply(200, randomBuffer(7928260));

	t.is((await getStream.buffer(m('http://foo.bar/large.bin'))).length, 7928260);
});

test('save file', async t => {
	await m('http://foo.bar/foo.zip', __dirname);
	t.true(await pathExists(path.join(__dirname, 'foo.zip')));
	await fsP.unlink(path.join(__dirname, 'foo.zip'));
});

test('extract file', async t => {
	await m('http://foo.bar/foo.zip', __dirname, {extract: true});
	t.true(await pathExists(path.join(__dirname, 'file.txt')));
	await fsP.unlink(path.join(__dirname, 'file.txt'));
});

test('error on 404', async t => {
	t.throws(m('http://foo.bar/404'), 'Response code 404 (Not Found)');
});

test('rename to valid filename', async t => {
	await m('http://foo.bar/foo?bar.zip', __dirname);
	t.true(await pathExists(path.join(__dirname, 'foo!bar.zip')));
	await fsP.unlink(path.join(__dirname, 'foo!bar.zip'));
});

test('follow redirects', async t => {
	t.true(isZip(await m('http://foo.bar/redirect.zip')));
});
