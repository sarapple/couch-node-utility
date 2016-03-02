var config = require('./config');
var fs = require('fs');
var JSONStream = require('JSONStream');
var es = require('event-stream');
var _ = require('lodash');

//streams
var wstream, rstream;
wstream = fs.createWriteStream('data/converter.json');
rstream = fs.createReadStream('data/getter.json');

//main processing
var fixer = {};
fixer.fn = {};
fixer.vars = {};
fixer.vars.ids = [];
fixer.vars.counter = 0;

fixer.fn.set = function(cb) {
	wstream.write('{"rows":[[]');

	rstream
		.pipe(JSONStream.parse('rows.*'))
		.pipe(es.through(function (data) {
			var that = this;
			that.pause();
			var _id = '';

			if (typeof data != 'object' || !_.get(data,['id'])) return cb('non-object returned');

			_id = data.id;

			if (_id) {
				fixer.vars.counter++;
				fixer.vars.ids.push(_id); //keep a max number of 100 in each row
			}
			else {
				return cb('id not found');
			}
			if (fixer.vars.counter == config.setting.rowmax) {
				var row = '';

				row = fixer.fn.row(fixer.vars.ids);
				row = ',' + row;

				if (row) wstream.write(row, function(){
					that.resume();
				});
				else return cb('json unparsable string returned');

				fixer.vars.ids = []; //reset to 0 length
				fixer.vars.counter = 0;
			}
			else {
				that.resume();
			}
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

			wstream.write(row + "]}");
			wstream.end();
			cb(null);
		});
};

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

//run after definitions
fixer.fn.set(function(err) {
	if (err) return console.err(err);

	console.log('Array of ids created.');
});
