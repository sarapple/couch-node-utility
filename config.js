var _ = require('lodash');

var config = {};
config.couch = {};
config.setting = {};
config.fn = {};

config.couch.host = {HOST};
config.couch.port = {5984};
config.couch.db = {DB};

config.setting.rowmax = 1000;

config.fn.filter = function(doc) {
	// Return the docs that you want to keep, all others will be filtered out
	if (_.get(doc, ['type']) == 'instance') {
		return doc;
	} else {
		return null;
	}
};

config.fn.collect = function(doc) {
	// Every element in an array will be an altered version of the doc, altered here.
	// Make changes to your doc in this code, and you will receive an array of elements
	// for each non-null altered version of your document.
	var out = [], form = '';

	instance = _.get(doc, ['type']);
	if (!instance) instance = null;
	out = instance;

	return out;
	//result json will be array of [[instance,instance,instance]] split up by rowmax size
};

config.fn.process = function(doc) {
	// PUT request to your server, alter the document (but do not change the _id and _rev) and return
	// the desired format of the document here
	doc.data.addProperty = 'I want this new property';
	return doc;
};

module.exports = config;
