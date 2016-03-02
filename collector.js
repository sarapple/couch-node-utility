var config = require('./config');
var fs = require('fs');
var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var _ = require('lodash');

//streams
var wstream, rstream;
wstream = fs.createWriteStream('data/collector.json');
rstream = fs.createReadStream('data/converter.json');

//main processing
var req;
var updater = {};
var collection = { rows : [] };
updater.fn = {};
updater.vars = {};

rstream
	.pipe(JSONStream.parse('rows.*'))
	.pipe(es.through(function (data, outercb) {
		//rowthrough is an array of ids, and before moving to the next row we need to pause and process all requests
		var rowthrough = this;
		rowthrough.pause();

		if (!data.length) return rowthrough.resume();

		var opt = {};
		var counter = 0;

		counter = data.length-1;
		opt = {
			method : 'POST',
			url : 'http://' + config.couch.host + ':' + config.couch.port + '/' + config.couch.db + '/' + '_all_docs',
			qs : {
				include_docs : true
			},
			json : { keys : data }
		};

		request(opt)
			.pipe(JSONStream.parse('rows.*.doc'))
			.pipe(es.through(function(doc) {
				//docthrough is an actual doc returned from the previous request, and before moving to the next doc we need to pause until we process this document
				var docthrough = this;
				var options = {};
				var collected;

				docthrough.pause();

				collected = config.fn.collect(doc);
				if(!collected) return docthrough.resume();

				collection.rows.push(collected);
				docthrough.resume();
			}))
			.on('end', function(){
				return rowthrough.resume();
			});
	}))
	.on('end', function(){
		var output = JSON.stringify(collection);
		wstream.write(output);
	})
	;
