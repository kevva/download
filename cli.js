#!/usr/bin/env node
'use strict';

var Download = require('./');
var input = process.argv.slice(2);
var path = require('path');
var pkg = require('./package.json');

/**
 * Help screen
 */

function help() {
    console.log(pkg.description);
    console.log('');
    console.log('Usage');
    console.log('  $ download <URL>');
    console.log('');
    console.log('Example');
    console.log('  $ download http://example.com/file.zip');
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

var download = new Download()
    .get(input[0]);

download.run(function (err) {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    console.log(path.basename(input[0]) + ' successfully downloaded!');
});
