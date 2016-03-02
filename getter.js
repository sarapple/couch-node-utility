var config = require('./config');
var request = require('request');
var fs = require('fs');
var wstream = fs.createWriteStream('data/getter.json');

request
	.get('http://' + config.couch.host + ':' + config.couch.port + '/' + config.couch.db + '/' + '_all_docs')
	.on('data', function(chunk) {
		wstream.write(chunk);
	})
	.on('end', function(chunk) {
		wstream.end();
	});
