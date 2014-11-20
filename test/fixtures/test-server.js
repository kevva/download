'use strict';

var http = require('http');

/**
 * Create a http server
 *
 * @api public
 */

module.exports = function () {
	var srv = http.createServer(function (req, res) {
		srv.emit(req.url, req, res);
	});

	srv.port = 9001;
	srv.url = 'http://localhost:' + 9001;

	return srv;
};
