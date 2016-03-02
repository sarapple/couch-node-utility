#Couch Doc Fixer

###This package consists of scripts to run to pull relevant data from documents, filter documents, and update edited documents.

###To use

Setup:

```
git clone https://github.com/sarapple/couch-node-utility
cd couch-node-utility
npm install
```

Run scripts:
* For __updater.js__, proceed only after setting up config.js and doing some trial runs without http PUT requests:
```
node getter.js
node converter.js
```
The getter.js and converter.js scripts are required (in that order) before any processing/filtering can take place. The scripts below will be used separately (although combining is possible by altering the script), for purposes described below.
```
node filter.js
node collector.js
node updater.js
```

###Getter

Get all docs in a couch db POST request based on params in config.js, and output it to a file called getter.json. This only contains objects of ids and rev ids, but has the potential to get very large with large number of docs, which is why I created converter.js, which end up being 1/4 the size.

###Converter

Create a JSON object that contains rows of arrays (max size specified in config.js) containing only couch doc ids. This will be outputted in a file called converter.json and is paginated by array, so that each couch request (in subsequent scripts) contain a manageable number of ids when full documents are retrieved.

###Filter

Create a JSON object like the output of converter.js, except that it only contains ids of those specified in the filter function in config.js. Output will be filter.json. If for updater.js and collector.js you would like to use filter.json, just change the read stream source.

###Updater

Fetches full documents from couch (based on config.js) from the converter.json file. Sends all documents through the filter function, one by one. In your filter function, return the doc if it matches the filter. Otherwise return null (and do not process).

Then the document runs through the process function in config.js and alters the document. However you return the document object is what will be passed to the http PUT request to update the document on couch (unless null, in which case no request is made).

###Collector

This creates a JSON outputted file full of arrays based on what you choose to 'collect' from the document, based on converter.json. If you want just one property, then return the property. If you want the full doc, return the doc. You get the idea.

###Configs

__config.js__ allows you to easily change the couch host, port, and database. It is also where you will
be changing your filter function (like in Views) and process function (to actually make changes to the document). It also contains a collect function to create arrays of elements b

Below are example implementations of filter and process in the __config.js__ file.

####Filter
```javascript
config.fn.filter = function(doc) {
	// for default: use return doc
	if (_.get(doc, ['type']) == 'instance') {
		return doc;
	} else {
		return null;
	}
};

```

####Process
Sends all filtered documents through the process function, one by one. The returned doc will be the doc sent to couch to update.
id and revision keys must stay in tact for the PUT operation to succeed.

```javascript
config.fn.process = function(doc) {
	// PUT request to your server, alter the document (but do not change the _id and _rev) and return
	// the desired format of the document here
	doc.data.addProperty = 'I want this new property';
	return doc;
};
```

####Collect
Every element in an array will be an altered version of the doc, altered here.
Make changes to your doc in this code, and you will receive an array of elements
for each non-null altered version of your document.

```javascript
config.fn.collect = function(doc) {
	var out = [], form = '';

	instance = _.get(doc, ['type']);
	if (!instance) instance = null;
	out = instance;

	return out;
	//result json will be array of [[instance,instance,instance]] split up by rowmax size
};
```
