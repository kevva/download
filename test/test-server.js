'use strict';

var http = require('http');

/**
 * Create a http server
 *
 * @param {Number} port
 * @api public
 */

module.exports = function (port) {
    port = port || 9000;

    var srv = http.createServer(function (req, res) {
        srv.emit(req.url, req, res);
    });

    srv.port = port;
    srv.url = 'http://localhost:' + port;

    return srv;
};
