var express = require('express');
var randomstring = require("randomstring");
var $jwt = require('../utils/jwt_handler');
var $encryption = require('../utils/encryption');
var validate = require('../utils/validate');

var router = express.Router();


function analyze_message_data(messages, res_obj) {
	// body...
	console.log("Dwsdc")
	var analyzed_msg = [];

	for (var i = 0; i < messages.length; i++) {
		// console.log(messages[i].id);
		analyzed_msg.push({id: messages[i].id, sender_id: messages[i].sender_id, message: $encryption.decrypt(messages[i].message, messages[i].alts), is_file: messages[i].is_file, team_name: messages[i].team_name, full_date: messages[i].full_date, fullname: messages[i].fullname, email: messages[i].email})
	}

	res_obj.json({ res: true, data: analyzed_msg, message: "true", reason: "Messages found" });

}


// io('connection', function(socket){
//   console.log('a user connected');
// });
// console.log(io);

// var encrypted_msg = $encryption.encrypt("ello");
// console.log(encrypted_msg);
// console.log($encryption.encrypt("ello"));
// console.log($encryption.decrypt(encrypted_msg));

/* fetch chat. */
router.get('/:team/:token/:page', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var team_name = req.params.team || null;
	var page = req.params.page || 1;

	var page_end = 10 * page;
	var page_start = page_end - 10;

	console.log(page_end)
	console.log(page_start)

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});

	else {

				//confirm if such team exist
				res.locals.connection.query("SELECT * FROM Team_mates WHERE team_name = ? AND company_for = ? AND email = ?", [team_name, token_decoded.company, token_decoded.email], function (err, result, fields) {

					  if (err) {res.json({ res: false, message: "error", reason: err });}

					  else if (result.length > 0) {

							console.log(result[0]);
							console.log("\n\n\n\n\n\n");
							res.locals.connection.query("SELECT msg.*, user.fullname, user.email FROM Messages AS msg INNER JOIN User as user ON (msg.sender_id=user.id) WHERE team_name = ? AND parent_company = ? ORDER BY id DESC LIMIT ?, ?", [team_name, token_decoded.company, page_start, page_end], function (err, result, fields) {

								  if (err) {res.json({ res: false, message: "error", reason: err });}

								  else if (result.length > 0) {

										console.log(result[0]);
										console.log("\n\n\n\n\n\n");
										analyze_message_data(result, res);
										return;

								  }

								  else{

								    res.json({ res: false, message: 'no_msg', reason: 'No message' });

								  }

							});

					  }

					  else{

					    res.json({ res: false, message: 'team_not_exist', reason: 'Team does not exist' });

					  }

				});



		}

});


/* send message to a team. */
router.post('/send/:team/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var team_name = req.params.team || null;
	// var sender_id = req.body.sender_id || null;
	var message = req.body.message || null;


	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

	else {

				//confirm if such team exist
				res.locals.connection.query("SELECT * FROM Team_mates WHERE team_name = ? AND company_for = ? AND email = ?", [team_name, token_decoded.company, token_decoded.email], function (err, result, fields) {

					  if (err) {res.json({ res: false, message: "error", reason: err });}

					  else if (result.length > 0) {

					  	// new Date().toLocaleString();
					  	//this salt would be used to further hash
					  	var msg_salt = randomstring.generate(16);
					  	console.log(msg_salt)
					    var sql = "INSERT INTO Messages (sender_id, message, is_file, is_Team, team_name, full_date, parent_company, alts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
					    res.locals.connection.query(sql, [token_decoded.id_, ($encryption.encrypt(message, msg_salt)), false, true, team_name, (new Date().toISOString().slice(0, 19).replace('T', ' ')), token_decoded.company, msg_salt], function (err, result) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}
					  	  else {

					  	  	req.io.emit("team_msg_recv", {team: team_name, msg: message, sender: token_decoded.id_, company: token_decoded.company})
					  	  	res.json({ res: true, message: "true", reason: "Successfully sent message"});

					  	  }
					    });

					  }

					  else{

					    res.json({ res: false, message: 'team_not_exist', reason: 'Team does not exist' });

					  }

				});

			}

});



/*
*individual message hashing goes here
*
*/

/* send message to an individual. */
router.post('/send/:token', function(req, res, next) {

	console.log("ssos: "+req.io.emit);

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var receiver_id = req.body.receiver_id || null;
	var message = req.body.message || null;


	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('id', receiver_id) == false || receiver_id == null || token_decoded.id_ == receiver_id) res.json({res: false, message: 'error', reason: 'Invalid receiver'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

	else {

				//confirm if such team exist
				res.locals.connection.query("SELECT * FROM User WHERE id = ? AND company = ?", [receiver_id, token_decoded.company], function (err, result, fields) {

					  if (err) {res.json({ res: false, message: "error", reason: err });}

					  else if (result.length > 0) {

					  	// new Date().toLocaleString();
					  	var msg_salt = randomstring.generate(16);

					    var sql = "INSERT INTO Messages (sender_id, receiver_id, message, is_file, is_Team, full_date, parent_company, alts) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
					    res.locals.connection.query(sql, [token_decoded.id_, receiver_id, ($encryption.encrypt(message, msg_salt)), false, false, (new Date().toISOString().slice(0, 19).replace('T', ' ')), token_decoded.company, msg_salt], function (err, result) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}
					  	  else {

					  	  	req.io.emit("msg_recv", {recv: receiver_id, msg: message, sender: token_decoded.id_, company: token_decoded.company})
					  	  	res.json({ res: true, message: "true", reason: "Successfully sent message"});

					  	  }
					    });

					  }

					  else{

					    res.json({ res: false, message: 'user_not_exist', reason: 'User does not exist' });

					  }

				});

			}

});



/* fetch chat. */
router.get('/user/:receiver_id/:token/:page', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var receiver_id = req.params.receiver_id || null;
	var page = req.params.page || 1;

	var page_end = 10 * page;
	var page_start = page_end - 10;

	console.log(page_end)
	console.log(page_start)

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('id', receiver_id) == false || receiver_id == null) res.json({res: false, message: 'error', reason: 'Invalid receiver'});

	else {

		res.locals.connection.query("SELECT msg.*, user.fullname, user.email FROM Messages AS msg INNER JOIN User as user ON (msg.sender_id=user.id) WHERE receiver_id = ? AND sender_id = ? AND parent_company = ? OR receiver_id = ? AND sender_id = ? AND parent_company = ? ORDER BY id DESC LIMIT ?, ?", [receiver_id, token_decoded.id_, token_decoded.company, token_decoded.id_, receiver_id, token_decoded.company, page_start, page_end], function (err, result, fields) {

			if (err) {res.json({ res: false, message: "error", reason: err });}

			else if (result.length > 0) {

				console.log(result[0]);
				console.log("\n\n\n\n\n\n");
				analyze_message_data(result, res);
				return;

			}

			else{

				res.json({ res: false, message: 'no_msg', reason: 'No message' });

			}

		});

	}

});


/* delete chat. */
router.delete('/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var msg_id = req.body.msg_id || null;

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('id', msg_id) == false || msg_id == null) res.json({res: false, message: 'error', reason: 'Invalid msg id'});

	else {

		res.locals.connection.query("SELECT * FROM Messages WHERE id = ? AND sender_id = ? AND parent_company = ?", [msg_id, token_decoded.id_, token_decoded.company], function (err, result, fields) {

			if (err) {res.json({ res: false, message: "error", reason: err });}

			else if (result.length > 0) {

				console.log(result[0]);
				var sql = "DELETE FROM Messages WHERE id = ? AND sender_id = ? AND parent_company = ?";
				res.locals.connection.query(sql, [msg_id, token_decoded.id_, token_decoded.company], function (err, result) {

					if (err) {res.json({ res: false, message: "error", reason: err });}
					else {

						res.json({ res: true, message: "true", reason: "Successfully deleted this message" });						  	

					}

				});

			}

			else{

				res.json({ res: false, message: 'msg_not_found', reason: 'This message doesn\'t exist' });

			}

		});

	}

});
module.exports = router;