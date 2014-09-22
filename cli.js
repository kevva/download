#!/usr/bin/env node
'use strict';

var Download = require('./');
var input = process.argv.slice(2);
var nopt = require('nopt');
var pkg = require('./package.json');
var progress = require('download-status');
var stdin = require('get-stdin');

/**
 * Options
 */

var opts = nopt({
	extract: Boolean,
	help: Boolean,
	out: String,
	strip: Number,
	version: Boolean
}, {
	e: '--extract',
	h: '--help',
	o: '--out',
	s: '--strip',
	v: '--version'
});

/**
 * Help screen
 */

function help() {
	console.log([
		'',
		'  ' + pkg.description,
		'',
		'  Usage',
		'    download <url>',
		'    download <url> > <file>',
		'    download --out <directory> <url>',
		'    cat <file> | download --out <directory>',
		'',
		'  Example',
		'    download http://foo.com/file.zip',
		'    download http://foo.com/cat.png > dog.png',
		'    download --extract --strip 1 --out dest http://foo.com/file.zip',
		'    cat urls.txt | download --out dest',
		'',
		'  Options',
		'    -e, --extract           Try decompressing the file',
		'    -o, --out               Where to place the downloaded files',
		'    -s, --strip <number>    Strip leading paths from file names on extraction'
	].join('\n'));
}

/**
 * Show help
 */

if (input.indexOf('-h') !== -1 || input.indexOf('--help') !== -1) {
	help();
	return;
}

/**
 * Show package version
 */

if (input.indexOf('-v') !== -1 || input.indexOf('--version') !== -1) {
	console.log(pkg.version);
	return;
}

/**
 * Run
 *
 * @param {Array} src
 * @param {String} dest
 * @api private
 */

function run(src, dest) {
	var download = new Download(opts);

	src.forEach(download.get.bind(download));

	if (process.stdout.isTTY) {
		download.use(progress());
		download.dest(dest ? dest : process.cwd());
	}

	download.run(function (err, files) {
		if (err) {
			console.error(err);
			process.exit(1);
		}

		if (!process.stdout.isTTY) {
			files.forEach(function (file) {
				process.stdout.write(file.contents);
			});
		}
	});
}

/**
 * Apply arguments
 */

if (process.stdin.isTTY) {
	var src = opts.argv.remain;
	var dest = opts.out;

	if (!src.length) {
		help();
		return;
	}

	run(src, dest);
} else {
	stdin(function (data) {
		var src = opts.argv.remain;
		var dest = opts.out;

		[].push.apply(src, data.trim().split('\n'));
		run(src, dest);
	});
}
