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
		analyzed_msg.push({id: messages[i].id, sender_id: messages[i].sender_id, message: $encryption.decrypt(messages[i].message, messages[i].alts), is_file: messages[i].is_file, team_name: messages[i].team_name, full_date: messages[i].full_date, fullname: messages[i].fullname, email: messages[i].email, reported: messages[i].reported})
	}
	console.log(analyzed_msg)
	res_obj.json({ res: true, data: analyzed_msg, message: "true", reason: "Messages found" });

}


function analyze_user(user_details, result, res, token_decoded) {
	// body...
	var users_messaged = [];//this array holds user's that the current logged user has messaged before
	for (var i = user_details.length - 1; i >= 0; i--) {

		if (user_details[i].id != token_decoded.id_) {
			console.log(user_details[i]);
			// console.log(result[i]);
			console.log(result[i][0]['COUNT(*)'])
			user_details[i].count = result[i][0]['COUNT(*)'];
			console.log(user_details[i])

			users_messaged.push(user_details[i])

		}

	}
	res.json({res: true, message: "true", data: users_messaged, reason: "Data Found"})
}



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

					  //this salt would be used to further hash
					  var msg_salt = randomstring.generate(16);
					  var msgDate = (new Date().toISOString().slice(0, 19).replace('T', ' '));

					  var sql = "INSERT INTO Messages (sender_id, receiver_id, message, is_file, is_Team, team_name, full_date, parent_company, alts, is_seen, reported) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
					  res.locals.connection.query(sql, [token_decoded.id_, 0, ($encryption.encrypt(message, msg_salt)), false, true, team_name, msgDate, token_decoded.company, msg_salt, '', false], function (err, result) {

					     if (err) {res.json({ res: false, message: "error", reason: err });}
					  	  else {

					  	  	//MESSAGE DATA TO BE SENT BACK TO THE FRONTEND COMPONENT
					  	  	var message_Data = {id: result.insertId, sender_id: token_decoded.id_, message: message, is_file: false, team_name: team_name, full_date: msgDate, fullname: token_decoded.fullname, email: token_decoded.email}

					  	  	req.io.emit("team_msg_recv", {team: team_name, msg: message, sender: token_decoded.id_, company: token_decoded.company})
					  	  	res.json({ res: true, message: "true", data: message_Data, reason: "Successfully sent message"});

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

	// console.log("ssos: "+req.io.emit);

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
					  	var msgDate = (new Date().toISOString().slice(0, 19).replace('T', ' '));

					    var sql = "INSERT INTO Messages (sender_id, receiver_id, message, is_file, is_seen, is_Team, full_date, parent_company, alts, team_name, reported) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
					    res.locals.connection.query(sql, [token_decoded.id_, receiver_id, ($encryption.encrypt(message, msg_salt)), false, false, false, msgDate, token_decoded.company, msg_salt, '', false], function (err, result) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}
					  	  else {

					  	  	var message_Data = {id: result.insertId, sender_id: token_decoded.id_, message: message, is_file: false, team_name: "", full_date: msgDate, fullname: token_decoded.fullname, email: token_decoded.email}

					  	  	req.io.emit("msg_recv", {recv: receiver_id, msg: message, sender: token_decoded.id_, company: token_decoded.company})

					  	  	res.json({ res: true, message: "true", data: message_Data, reason: "Successfully sent message"});

					  	  }
					    });

					  }

					  else{

					    res.json({ res: false, message: 'user_not_exist', reason: 'User does not exist' });

					  }

				});

			}

});


/* report message to an individual. */
router.post('/report/:token', function(req, res, next) {

	// console.log("ssos: "+req.io.emit);

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var msg_id = req.body.msg_id || null;
	var message = req.body.message || null;


	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('id', msg_id) == false || msg_id == null) res.json({res: false, message: 'invalid_msg_id', reason: 'Invalid message ID'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

	else {

				//confirm if such team exist
				res.locals.connection.query("SELECT * FROM Messages WHERE id = ? AND parent_company = ? AND sender_id != ?", [msg_id, token_decoded.company, token_decoded.id_], function (err, result, fields) {

					  if (err) {res.json({ res: false, message: "error", reason: err });}

					  else if (result.length > 0) {

					    	var sql = "UPDATE Messages SET reported = ? WHERE id = ?";
					    	res.locals.connection.query(sql, [true, msg_id], function (err, result) {

						      if (err) {res.json({ res: false, message: "error", reason: err });}

						  	   else {

							  	  	res.json({ res: true, message: "true", reason: "Successfully reported message"});

						  	  	}
					  	  
					    	});

					  }

					  else{

					    res.json({ res: false, message: 'message_not_exist', reason: 'Message does not exist' });

					  }

				});

			}

});


/* report message to an individual. */
router.post('/unreport/:token', function(req, res, next) {

	// console.log("ssos: "+req.io.emit);

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	var msg_id = req.body.msg_id || null;
	var message = req.body.message || null;


	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

	else if (validate('id', msg_id) == false || msg_id == null) res.json({res: false, message: 'invalid_msg_id', reason: 'Invalid message ID'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

	else {

				//confirm if such team exist
				res.locals.connection.query("SELECT * FROM Messages WHERE id = ? AND parent_company = ? AND sender_id != ?", [msg_id, token_decoded.company, token_decoded.id_], function (err, result, fields) {

					  if (err) {res.json({ res: false, message: "error", reason: err });}

					  else if (result.length > 0) {

					    	var sql = "UPDATE Messages SET reported = ? WHERE id = ?";
					    	res.locals.connection.query(sql, [false, msg_id], function (err, result) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					  	   else {

						  	  	res.json({ res: true, message: "true", reason: "Successfully unreported message"});

					  	  }
					  	  
					    });

					  }

					  else{

					    res.json({ res: false, message: 'message_not_exist', reason: 'Message does not exist' });

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

		res.locals.connection.query("SELECT msg.*, user.fullname, user.email FROM Messages AS msg INNER JOIN User as user ON (msg.sender_id=user.id) WHERE receiver_id = ? AND sender_id = ? AND parent_company = ? OR receiver_id = ? AND sender_id = ? AND parent_company = ? ORDER BY id DESC LIMIT ?, ?;", [receiver_id, token_decoded.id_, token_decoded.company, token_decoded.id_, receiver_id, token_decoded.company, page_start, page_end, receiver_id, token_decoded.id_], function (err, result, fields) {

			if (err) {res.json({ res: false, message: "error", reason: err });}

			else if (result.length > 0) {

				res.locals.connection.query("UPDATE Messages set is_seen = 'seen' WHERE sender_id = ? AND receiver_id = ? AND is_Team = 0;", [receiver_id, token_decoded.id_], function (err, results, fields) {
					if (err) {res.json({ res: false, message: "error", reason: err });}
					else{
						console.log(result[0]);
						console.log("\n\n\n\n\n\n");
						analyze_message_data(result, res);
						return;
					}
				});

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
	console.log("msg: "+msg_id)

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


/* get list of users in a team. */
router.get('/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

					/*------------list of all form data needed on for this api to work------------*/

				    res.locals.connection.query("SELECT user.id, user.fullname, user.email FROM Messages AS msg INNER JOIN User as user ON (msg.sender_id=user.id OR msg.receiver_id=user.id) WHERE is_Team = ? AND sender_id = ? AND parent_company = ? OR is_Team = ? AND receiver_id = ? AND parent_company = ? GROUP BY user.id HAVING COUNT(user.id) > 0", [0, token_decoded.id_, token_decoded.company, 0, token_decoded.id_, token_decoded.company], function (err, result, fields) {

				    	  var user_details;

					      if (err) {console.log(err); res.json({ res: false, message: "error", reason: err.message });}

					      else if (result.length > 0) {

					      	var sql_statement_for_users = "";
					      	var user_details = result;

					      	for (var i = 0; i < result.length; i++) {

					      		console.log(result[i])
					      		sql_statement_for_users += "SELECT COUNT(*) FROM Messages WHERE sender_id = '"+result[i].id+"' AND receiver_id = '"+token_decoded.id_+"' AND is_seen = '' AND is_Team = 0;";

					      	}

					      	res.locals.connection.query(sql_statement_for_users, function(err, result, fields){

								if (err) {console.log(err); res.json({ res: false, message: "error", reason: err.message });}

								else if (result.length > 0) {
									// console.log(result)
									// console.log("\n\n")
									analyze_user(user_details, result, res, token_decoded);
								}

					      	})


					      }

					      else{

							  res.json({ res: true, message: 'empty', reason: 'No message found' });

						  }
					});
					// res.locals.connection.end();

			}
    

});

module.exports = router;