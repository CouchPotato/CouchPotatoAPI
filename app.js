// Load settings first
var Settings = require('settings');
global.settings = new Settings(require('./config'));

// Helpers
require('./libs/helpers');
global.createLogger = require('./libs/logger').createLogger;

// Load the api in global
global.api = require('./libs/api');

// Import modules
var express = require('express'),
	compress = require('compression'),
	bodyParser = require('body-parser'),

	redis = require('redis'),

	// Routes
	home = require('./routes'),
	eta = require('./routes/eta'),
	ismovie = require('./routes/ismovie'),
	info = require('./routes/info'),
	search = require('./routes/search'),
	validate = require('./routes/validate'),
	suggest = require('./routes/suggest'),
	updater = require('./routes/updater'),
	messages = require('./routes/messages'),
	rstats = require('./routes/stats'),
	manage = require('./routes/manage'),
	authorize = require('./routes/authorize'),

	// Stats & restriction
	stats = require('./libs/stats').stats,
	restrict = require('./libs/restrict').restrict,

	// HTTP server
	http = require('http'),

	// Logging
	winston = require('winston');

var app = express(),
	server = http.createServer(app);

// Reset some stuff first
app.disable('x-powered-by');
app.use(function(req, res, next){
	// Replace header
	res.setHeader('X-Powered-By', 'CouchPotato ('+app.get('port')+')');

	// Unescape url
	try { req.url = decodeURIComponent(req.url); }
	catch(e) { req.url = unescape(req.url); }

	req.url = req.url.replace(/%/g, '%25').replace('/\+/g', ' ');

	next();
});

// Set static folder
app.use(express.static(__dirname + '/public'));

// all environments
app.set('port', process.env.PORT || 3000);
app.use(compress());
app.use(bodyParser.urlencoded({'extended': true}))
app.use(bodyParser.json({'limit': '50mb'}));

// Use proper IP
app.enable('trust proxy');

// Development only
if(app.get('env') != 'development') {
	winston.add(winston.transports.File, { filename: __dirname + '/logs/main.log'});
	winston.remove(winston.transports.Console);
}

var log = global.createLogger(__filename);

// Don't accept new incoming connections when restarting
var shutting_down = false;
app.use(function(req, res, next) {
	if (!shutting_down)
		return next();
	res.setHeader('Connection', 'close');
	return res.send(502, 'Server is in the process of restarting');
});

// Route
app.get('/', home.index);
app.get('/eta/tt:imdb(\\d{7})', stats, restrict, eta.imdb);
app.get('/ismovie/tt:imdb(\\d{7})', stats, restrict, ismovie.imdb);
app.get('/info/tt:imdb(\\d{7})', stats, restrict, info.imdb);
app.get('/search/:query', stats, restrict, search.query);
app.get('/validate/:name', stats, restrict, validate.name);
app.get('/suggest/', restrict, suggest.imdbs);
app.post('/suggest/', stats, restrict, suggest.imdbs);
app.get('/suggest/cron', restrict, suggest.cron);
app.get('/messages/', stats, messages.list);
app.get('/authorize/putio', stats, authorize.putio);
app.get('/authorize/trakt', stats, authorize.trakt);
app.get('/updater/', stats, updater.url);
app.get('/updates/*', stats, updater.builds);
app.get('/stats/', rstats.show);
app.get('/manage/cleanup', restrict, manage.cleanup);
app.get('*', function(req, res){
	res.status(404).send('Not found');
});

// Log errors resulting in 500
app.use(function(err, req, res, next){
	log.error(req.url + ': ' + err.stack);
	res.status(500).send('Something isn\'t right.. abort abort!');
});

// Start server
httpServer = server.listen(app.get('port'), function() {
	log.info('Express server listening on port ' + app.get('port'));
});

var graceful = function() {
	shutting_down = true;

	httpServer.close(function() {
		log.info('Closed out remaining connections.');
		return process.exit();
	});

	return setTimeout(function() {
		log.error('Could not close connections in time, forcefully shutting down');
		return process.exit(1);
	}, 30 * 1000);
}

// Graceful shutdown
process.on('SIGTERM', function(){
	log.info('Received kill signal (SIGTERM), shutting down gracefully.');
	graceful();
});

// Try to log exceptions
process.on('uncaughtException', function (err) {
	log.error(err.stack);
	graceful();
})
