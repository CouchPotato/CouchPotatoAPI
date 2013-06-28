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
	redis = require('redis'),

	// Routes
	home = require('./routes'),
	eta = require('./routes/eta'),
	ismovie = require('./routes/ismovie'),
	info = require('./routes/info'),
	search = require('./routes/search'),
	suggest = require('./routes/suggest'),
	updater = require('./routes/updater'),
	messages = require('./routes/messages'),
	rstats = require('./routes/stats'),

	// Stats & restriction
	stats = require('./libs/stats').stats,
	restrict = require('./libs/restrict').restrict,

	// HTTP server
	http = require('http')

	// Logging
	winston = require('winston');

var app = express(),
	server = http.createServer(app),
	io = require('socket.io').listen(server);

// Reset some stuff first
app.disable('x-powered-by');
app.use(function(req, res, next){
	// Replace header
	res.setHeader('X-Powered-By', 'CouchPotato ('+app.get('port')+')');

	// Unescape url
	try { req.url = decodeURIComponent(req.url); }
	catch(e) { req.url = unescape(req.url); }

	req.url = req.url.replace(/%/g, '%25').replace('/\+/g', ' ');

	if(req.query.legacy){
		req.headers['x-cp-version'] = req.query.HTTP_X_CP_VERSION;
		req.headers['x-cp-identifier'] = req.query.HTTP_X_CP_IDENTIFIER;
		req.headers['x-cp-api'] = req.query.HTTP_X_CP_API;
	}

	next();
});

// Set static folder
app.use(express.static(__dirname + '/public'));

// all environments
app.set('port', process.env.PORT || 3000);
app.use(express.compress());
app.use(express.bodyParser());

// Use proper IP
app.enable('trust proxy');

// Development only
if(app.get('env') != 'development') {
	winston.add(winston.transports.File, { filename: './logs/main.log' });
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
app.get('/suggest/', restrict, suggest.imdbs);
app.post('/suggest/', stats, restrict, suggest.imdbs);
app.get('/suggest/cron', restrict, suggest.cron);
app.get('/messages/', stats, restrict, messages.list);
app.get('/updater/', stats, updater.url);
app.get('/stats/', rstats.show);
app.get('*', function(req, res){
	res.status(404).send('Not found');
});

// Log errors resulting in 500
app.use(function(err, req, res, next){
	winston.error(req.url + ': ' + err.stack);
	res.status(500).send('Something isn\'t right.. abort abort!');
});

// Socket.io stuff
var rclient = redis.createClient();
	rclient.subscribe('location');
io.sockets.on('connection', function(socket) {

	var on_message = function(channel, message){
		console.log('Send to socket: '+ message);
		socket.emit('location', message);
	};
	rclient.on('message', on_message);

	socket.on('disconnect', function(){
        rclient.removeListener('message', on_message)
    });

});

// Start server
httpServer = server.listen(app.get('port'), function() {
	log.info('Express server listening on port ' + app.get('port'));
});

var graceful = function() {
	shutting_down = true;

	httpServer.close(function() {
		winston.info('Closed out remaining connections.');
		return process.exit();
	});

	return setTimeout(function() {
		winston.error('Could not close connections in time, forcefully shutting down');
		return process.exit(1);
	}, 30 * 1000);
}

// Graceful shutdown
process.on('SIGTERM', function(){
	winston.info('Received kill signal (SIGTERM), shutting down gracefully.');
	graceful();
});

// Try to log exceptions
process.on('uncaughtException', function (err) {
	winston.error(err.stack);
	graceful();
})
