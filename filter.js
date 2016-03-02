var config = require('./config');
var fs = require('fs');
var request = require('request');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var _ = require('lodash');

//streams
var wstream, rstream, beforestream, afterstream;
changestream = fs.createWriteStream('data/filter.json');
rstream = fs.createReadStream('data/converter.json');

//main processing
var req;
var fixer = {};
fixer.fn = {};
fixer.vars = {};
fixer.vars.ids = [];
fixer.vars.counter = 0;

//returns a string that can be json stringified, full of ids
fixer.fn.row = function(ids) {
	var str = '';

	str += "[";

	_.forEach(ids, function(val, i){
		str += '"' + ids[i] + '"';
		if (i != ids.length-1) str += ',';
	});

	str += "]";

	if (JSON.parse(str)) return str;
	else return null;
};

fixer.fn.find = function(cb) {
	changestream.write('{"rows":[[]');
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

				if (fixer.vars.counter == config.setting.rowmax) {
					var row = '';

					row = fixer.fn.row(fixer.vars.ids);
					row = ',' + row;

					if (row) changestream.write(row, function(){
						docthrough.resume();
					});
					else return cb('json unparsable string returned');

					fixer.vars.ids = []; //reset to 0 length
					fixer.vars.counter = 0;
				}

				//first filter out docs that match, the ones that we dont want to change will be null
				doc = config.fn.filter(doc);
				if (doc) {
					fixer.vars.counter++;
					fixer.vars.ids.push(doc._id);
				}

				return docthrough.resume();
			}))
			.on('end', function(){
				return rowthrough.resume();
			});
	}))
	.on('end', function(){
		var row = '';

			//take care of any remaning ids in the end
			if (fixer.vars.ids.length > 0) {


				row = fixer.fn.row(fixer.vars.ids);
				row = ',' + row;

				fixer.vars.ids = []; //reset to 0 length
				fixer.vars.counter = 0;
			}

			changestream.write(row + "]}");
			changestream.end();
			cb(null);
	})
	;
};

//run after definitions
fixer.fn.find(function(err) {
	if (err) return console.err(err);

	console.log('Found docs based on specifications');
});
