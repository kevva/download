#!/usr/bin/env node
'use strict';

var download = require('./');
var path = require('path');
var pkg = require('./package.json');
var stdin = require('get-stdin');

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

if (process.argv.indexOf('-h') !== -1 || process.argv.indexOf('--help') !== -1) {
    help();
    return;
}

/**
 * Show package version
 */

if (process.argv.indexOf('-v') !== -1 || process.argv.indexOf('--version') !== -1) {
    console.log(pkg.version);
    return;
}

/**
 * Run
 */

function run(src, dest) {
    if (!src || src.length === 0) {
        console.error('Specify a URL');
        return;
    }

    if (!dest || dest.length === 0) {
        console.error('Specify a destination path');
        return;
    }

    src = Array.isArray(src) ? src : [src];
    dest = Array.isArray(dest) ? dest.join('') : dest;

    download(src, dest)
        .on('error', function (err) {
            throw err;
        })
        .on('close', function () {
            console.log('Successfully downloaded ' + src.length + ' files to ' + path.resolve(dest));
        });
}


/**
 * Apply arguments
 */

if (process.stdin.isTTY) {
    run(process.argv[2], process.argv[3]);
} else {
    stdin(function (data) {
        run([].concat(data.trim().split('\n')), process.argv.splice(2));
    });
}
