var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require('body-parser');
var mysql = require("mysql");

var accountRouter = require('./routes/account');
var teamRouter = require('./routes/teams');
var projectRouter = require('./routes/project');
var taskRouter = require('./routes/task');
var chatRouter = require('./routes/chat');
var fileRouter = require('./routes/file');

var app = express();
var io = require('socket.io').listen(app.listen(7000));

app.use(logger('dev'));
app.use(express.json({limit:'2MB'}));
app.use(bodyParser.urlencoded({ extended: true, limit:'2MB', parameterLimit: 1000000000000000000000000 }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.set('json spaces', 5);

//set express variable for socket connections
io.sockets.on('connection', function (socket) {
    console.log('client connect');
    socket.on('echo', function (data) {
        io.sockets.emit('message', data);
    });
});

// Make io accessible to our router
app.use(function(req,res,next){
    req.io = io;
    next();
});

app.use(function (req, res, next){

			// host     : 'db4free.net',
			// user     : 'creative_joe',
			// password : 'revity.API.007',
			// database : 'revity',
	try{
		res.locals.connection = mysql.createConnection({
			host     : 'localhost',
			user     : 'root',
			password : '',
			database : 'Revity',
			multipleStatements: true
		});
		res.locals.connection.connect();
		next();
	}
	catch (err) {
		res.json({res: false, message: "error_api", reason: "SQL server error"});
	}
});

//CORS Handlers
app.use(function (req, res, next) {
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
res.setHeader('Access-Control-Allow-Credentials', true);
res.locals.key = 'DJJJJJ:@D@MKdni2j9rd02q;sd@KD(@$D:efc/o/@(ue92E@D:@FD"@QDF@"ED(UD@D(J@DRcvrhwj@ue2e09d209edajdxwijadcdscisc';
res.locals.passkey = '$@RM#TFKMFGMGMM%ZMGmX@>D<2,,@me32mr56;u867y'
next();
});

app.use('/account', accountRouter);
app.use('/team', teamRouter);
app.use('/project', projectRouter);
app.use('/task', taskRouter);
app.use('/chat', chatRouter);
app.use('/file', fileRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  res.json({res: false, message: "invalid_api", reason: "Endpoint not found"});
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  console.log(err)
  res.json({res: false, message: "error_api", reason: "API server experienced an error"});
});

module.exports = app;
