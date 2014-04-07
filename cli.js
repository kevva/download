#!/usr/bin/env node
'use strict';

var download = require('./');
var input = process.argv.splice(2);
var path = require('path');
var pkg = require('./package.json');
var stdin = require('get-stdin');
var url = require('get-urls');


/**
 * Help screen
 */

function help() {
    console.log(pkg.description);
    console.log('');
    console.log('Usage');
    console.log('  $ download <url> <path>');
    console.log('  $ cat <file> | download <path>');
    console.log('');
    console.log('Example');
    console.log('  $ download https://github.com/kevva/download/archive/master.zip files');
    console.log('  $ cat urls.txt | download files');
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
 */

function run(input) {
    var src = url(input.join(' '));
    var dest = input.filter(function (i) {
        return !i.match(/(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi);
    });

    if (src.length === 0) {
        console.error('Specify a URL');
        return;
    }

    if (dest.length === 0) {
        console.error('Specify a destination path');
        return;
    }

    download(src, dest.join(''))
        .on('error', function (err) {
            throw err;
        })
        .on('close', function () {
            console.log('Successfully downloaded ' + src.length + ' files to ' + path.resolve(dest.join('')));
        });
}

/**
 * Apply arguments
 */

if (process.stdin.isTTY) {
    run(input);
} else {
    stdin(function (data) {
        [].push.apply(input, data.trim().split('\n'));
        run(input);
    });
}
