/*global describe, it, afterEach */
'use strict';

var fs = require('fs');
var download = require('./download');
var path = require('path');

describe('download()', function () {
    afterEach(function () {
        fs.unlinkSync(path.join('tmp', 'test.png'));
        fs.rmdirSync('tmp');
    });
    it('should download a file', function (cb) {
        download('https://www.google.se/images/srpr/logo4w.png', 'tmp/test.png')
        .on('close', function () {
            fs.stat('tmp/test.png', cb);
        });
    });
});
