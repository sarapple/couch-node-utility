var config = require('./config');
var fs = require('fs');
var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var _ = require('lodash');

//streams
var wstream, rstream, beforestream, afterstream;
wstream = fs.createWriteStream('logs/finder-logs.txt');
changestream = fs.createWriteStream('data/change.json');
beforestream = fs.createWriteStream('logs/finder-before.txt');
afterstream = fs.createWriteStream('logs/finder-after.txt');
rstream = fs.createReadStream('data/converted.json');

//main processing
var req;
var updater = {};
updater.fn = {};
updater.vars = {};

changestream.write('{"rows":[[');

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
				
				docthrough.pause();
				
				//first filter out docs that match, the ones that we dont want to change will be null
				doc = config.fn.filter(doc);
				if (!doc) return docthrough.resume();
				
				//add to logs, including before and after text files to easily compare diffs
				wstream.write('Id to update: ' + doc._id + '\n');
				beforestream.write('\n' + JSON.stringify(doc) + '\n');
				
				//change and return an updated couch doc, nulls will not make a request
				doc = config.fn.process(doc);
				if (!doc) return docthrough.resume();

				//add to logs, including before and after text files to easily compare diffs
				afterstream.write('\n' + JSON.stringify(doc) + '\n');
				changestream.write('"' + doc._id + '"' + ',');

				docthrough.resume();
			}))
			.on('end', function(){
				return rowthrough.resume();
			});
	}))
	.on('end', function(){
		changestream.write('"blank"]]}');
	})
	;