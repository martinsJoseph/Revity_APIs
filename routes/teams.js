var express = require('express');
var $sendMail = require('../utils/mailer');
var $jwt = require('../utils/jwt_handler');
var validate = require('../utils/validate');
var router = express.Router();

function create_team(db_con, team_name, company_name, team_members, inviter, all_emails, current_user_email, res_obj) {

	var subject = "Invitation to Team("+team_name+")";
	var msg = "You where invited to team <b>("+team_name+")</b> by <b>"+inviter+"</b>, kindly use the link below to participate";

		$sendMail(all_emails.toString(), subject, msg);
		// lets create team
	    var sql = "INSERT INTO Teams (team_name, company_for) VALUES (?,?); INSERT INTO Team_mates (email, role, team_name, company_for) VALUES (?,?,?,?);";
	    db_con.query(sql, [team_name, company_name, current_user_email, 'Admin', team_name, company_name], function (err, result) {

	      if (err) {res_obj.json({ res: false, message: "error", reason: err });}
	  	    
	      //now let's add all team mates
	      else
	      {

	      		//we want to agreegate all the data our db needdss..
	      		// so  we can make multiple insert queries
	      		var compiled_sql_data = [];
	      		var all_emails = [];

	      		for (var i = team_members.length - 1; i >= 0; i--) {
	      			console.log("\n\n\n")
	      			console.log(team_members[i].email);
	      			all_emails.push(team_members[i].email);
	      			compiled_sql_data.push([team_members[i].email, team_members[i].role, team_name, company_name])
	      		}

			    var sql = "INSERT INTO Team_mates (email, role, team_name, company_for) VALUES ?";
			    db_con.query(sql, [compiled_sql_data], function (err, result) {

			      if (err) {res_obj.json({ res: false, message: "error", reason: err });}
			  	  else {

			  	  	res_obj.json({ res: true, message: "true", reason: "Successfully created team" });

			  	  }
			    });

      	  }


    	});

}


function update_team(db_con, old_team_name, new_team_name, company, res_obj) {

	//update team details
	console.log(old_team_name)
	var sql = "UPDATE Teams SET team_name=? WHERE team_name=? AND company_for=?; UPDATE Team_mates SET team_name=? WHERE team_name=? AND company_for=?; UPDATE Project SET parent_team=? WHERE parent_team=? AND parent_company=?; UPDATE Task SET parent_team=? WHERE parent_team=? AND parent_company=?";
	//lets add al required sql params in one large array so that the new name can
	//reflect on every part of the db it is displayed
	var sql_params = [new_team_name, old_team_name, company, new_team_name, old_team_name, company, new_team_name, old_team_name, company, new_team_name, old_team_name, company]
	db_con.query(sql, sql_params, function (err, result) {

		if (err) { res_obj.json({ res: false, message: "error", reason: err }); }
		else { 
			res_obj.json({ res: true, message: "true", reason: "Successfully updated team" });
		}

	});

}


function delete_team(db_con, team_name, company, res_obj) {

	//update team details
	console.log(team_name)
	var sql = "DELETE FROM Teams WHERE team_name=? AND company_for=?; DELETE FROM Team_mates WHERE team_name=? AND company_for=?; DELETE FROM Project WHERE parent_team=? AND parent_company=?; DELETE FROM Task WHERE parent_team=? AND parent_company=?";
	//lets add al required sql params in one large array so that the new name can
	//reflect on every part of the db it is displayed
	var sql_params = [team_name, company, team_name, company, team_name, company, team_name, company]
	db_con.query(sql, sql_params, function (err, result) {

		if (err) { res_obj.json({ res: false, message: "error", reason: err }); }
		else { 
			res_obj.json({ res: true, message: "true", reason: "Successfully deleted team and it's correspondents" });
		}

	});

}



function add_participant(db_con, team_name, company_name, team_members, inviter, all_emails, res_obj) {

	var subject = "Invitation to Team("+team_name+")";
	var msg = "You where invited to team <b>("+team_name+")</b> by <b>"+inviter+"</b>, kindly use the link below to participate";

	$sendMail(all_emails.toString(), subject, msg);

	    var compiled_sql_data = [];
	    var all_emails = [];

	    //lets compile sql data to process
	    for (var i = team_members.length - 1; i >= 0; i--) {
	      	console.log("\n\n\n")
	      	console.log(team_members[i].email);
	    	all_emails.push(team_members[i].email);
			compiled_sql_data.push([team_members[i].email, team_members[i].role, team_name, company_name])
	    }

		// lets add participant
	var sql = "INSERT INTO Team_mates (email, role, team_name, company_for) VALUES ?";
	db_con.query(sql, [compiled_sql_data], function (err, result) {

		if (err) {res_obj.json({ res: false, message: "error", reason: err });}
		else 
		{

			res_obj.json({ res: true, message: "true", reason: "Successfully added participant" });

		}

	});

}


function remove_participant(db_con, participant, team_name, company, res_obj) {

	var sql = "DELETE FROM Team_mates WHERE email = ? AND team_name = ? AND company_for = ?";
	db_con.query(sql, [participant, team_name, company], function (err, result) {

		if (err) {res_obj.json({ res: false, message: "error", reason: err });}
		else 
		{

			res_obj.json({ res: true, message: "true", reason: "Successfully removed participant" });

		}

	});

}


/* create new team. */
router.post('/create/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var team_name = req.body.team_name || null;
		var participants = eval(req.body.participants) || null;

		/*--------------------END--------------------*/


		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, we basically verify all participant has a role and a valid email
			if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Team name is invalid' });
			}
			else if (validate('participant', participants) == false || participants == null) 
			{
				res.json({ res: false, message: 'invalid_participant', reason: 'A participant\'s failed data verification' });
			}
			else
			{
				
				  var sql = "";
				  var all_emails = []

				  for (var i = participants.length - 1; i >= 0; i--) {

				  	//get all emails first so that we can run a search on them all
				  	console.log(participants[i].email)
				  	all_emails.push(participants[i].email)
				  	sql += "SELECT * FROM Team_mates WHERE email = ? AND company_for = '"+token_decoded.company+"' AND team_name = '"+team_name+"'; ";

				  }

				    console.log(sql)
				    console.log(all_emails)

				    res.locals.connection.query("SELECT * FROM Teams WHERE 	team_name = ? AND 	company_for = ?", [team_name, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {res.json({ res: false, message: 'team_exist', reason: 'THis team is already registered' });}

					      else{

							  //lets know if email added as a participant already exist
							  res.locals.connection.query((sql), all_emails, function (err, result, fields) {
							  	
						      	if (err) res.json({ res: false, message: "error", reason: err });
						      	
						      	else if (result.length > 0) {

						      		already_existing_emails = [];
						      		//this variable is to know if an array returned in the result variable
						      		// does not contain empty arrays.. because the email actually didn't 
						      		//exist in the db_con
						      		var already_has_data = false;

							      	for (var i = result.length - 1; i >= 0; i--) {
							      		//check if array is empty or containing a tru database value
							      		if (result[i].length > 0) {
							      			already_has_data = true;
								      		already_existing_emails.push(result[i][0].email);
							      		}
							      	}

							      	if (already_has_data == true) {res.json({ res: false, message: "email_exist", data: already_existing_emails, reason: "Some emails here already exist" }); return;}
						      		else{
						      			// console.log(all_emails.toString())
						      			create_team(res.locals.connection, team_name, token_decoded.company, participants, token_decoded.fullname, all_emails, token_decoded.email, res)
							      		console.log("naa")
							      	}

						      	}

						      	else{
							      	create_team(res.locals.connection, team_name, token_decoded.company, participants, token_decoded.fullname, all_emails, token_decoded.email, res)
							      	console.log("dupp")
						      	}

							  });

						  }
					});
			}
		}
	}
});


/* Add team participant. */
router.post('/add/participant/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var team_name = req.body.team_name || null;
		var participants = eval(req.body.participants) || null;

		/*--------------------END--------------------*/


		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, we basically verify all participant has a role and a valid email
			if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Team name is invalid' });
			}
			else if (validate('participant', participants) == false || participants == null) 
			{
				res.json({ res: false, message: 'invalid_participant', reason: 'A participant\'s failed data verification' });
			}
			else
			{
				
				  var sql = "";
				  var all_emails = []

				  for (var i = participants.length - 1; i >= 0; i--) {

				  	//get all emails first so that we can run a search on them all
				  	console.log(participants[i].email)
				  	all_emails.push(participants[i].email)
				  	sql += "SELECT * FROM Team_mates WHERE email = ? AND company_for = '"+token_decoded.company+"' AND team_name = '"+team_name+"'; ";

				  }

				    console.log(sql)
				    console.log(all_emails)

				    res.locals.connection.query("SELECT * FROM Teams WHERE 	team_name = ? AND 	company_for = ?", [team_name, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length < 1) {res.json({ res: false, message: 'team_not_exist', reason: 'THis team is not registered' });}

					      else{

							  //lets know if email added as a participant already exist
							  res.locals.connection.query((sql), all_emails, function (err, result, fields) {
							  	
						      	if (err) res.json({ res: false, message: "error", reason: err });
						      	
						      	else if (result.length > 0) {

						      		already_existing_emails = [];
						      		//this variable is to know if an array returned in the result variable
						      		// does not contain empty arrays.. because the email actually didn't 
						      		//exist in the db_con
						      		var already_has_data = false;


							      	for (var i = result.length - 1; i >= 0; i--) {
							      		//check if array is empty or containing a tru database value
							      		if (result[i].length > 0) {
							      			already_has_data = true;
								      		already_existing_emails.push(result[i][0].email);
							      		}
							      	}

							      	if (already_has_data == true) {res.json({ res: false, message: "email_exist", data: already_existing_emails, reason: "Some emails here already exist" }); return;}
						      		else{
						      			// console.log(all_emails.toString())
						      			add_participant(res.locals.connection, team_name, token_decoded.company, participants, token_decoded.fullname, all_emails, res)
							      		console.log("naa")
							      	}

						      	}

						      	else{
							      	add_participant(res.locals.connection, team_name, token_decoded.company, participants, token_decoded.fullname, all_emails, res)
							      	console.log("dupp")
						      	}

							  });

						  }
					});
				  // res.locals.connection.end();

			}


		}
	}
    

});



/* Remove team participant. */
router.post('/remove/participant/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var team_name = req.body.team_name || null;
		var participant = req.body.participant || null;

		/*--------------------END--------------------*/


		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, we basically verify all participant has a role and a valid email
			if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Team name is invalid' });
			}
			else if (validate('id', participant) == false || participant == null) 
			{
				res.json({ res: false, message: 'invalid_participant', reason: 'Participant id failed data verification' });
			}
			else
			{

				//lets know if email added as a participant already exist
				res.locals.connection.query("SELECT * FROM Team_mates WHERE email = ? AND team_name = ? AND company_for = ?", [participant, team_name, token_decoded.company], function (err, result, fields) {

					if (err) {res.json({ res: false, message: "error", reason: err });}

					else if (result.length < 1) {res.json({ res: false, message: 'not_exist', reason: 'THis team/user doesnt exist or the user is not in that team' });}

					else{
											  	
						remove_participant(res.locals.connection, participant, team_name, token_decoded.company, res)
						console.log("naa")

					}
				});
			}
		}
	}
    
});


/* get teams for an organization. */
router.get('/admin/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

			/*------------list of all form data needed on for this api to work------------*/
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {
			res.locals.connection.query("SELECT * FROM Teams WHERE company_for = ?", [token_decoded.company], function (err, result, fields) {

				if (err) {res.json({ res: false, message: "error", reason: err });}

				else if (result.length > 0) {res.json({ res: true, message: 'true', data: result, reason: 'Data was found' });}

				else{ res.json({ res: true, message: 'empty', reason: 'No team found' }); }

			});
		}
	}
});


/* get teams user belongs to in an organization. */
router.get('/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

			/*------------list of all form data needed on for this api to work------------*/
			// token_decoded
			res.locals.connection.query("SELECT * FROM Team_mates WHERE company_for = ? AND email = ?", [token_decoded.company, token_decoded.email], function (err, result, fields) {

				if (err) {res.json({ res: false, message: "error", reason: err });}

				else if (result.length > 0) {

					// res.json({ res: true, message: 'true', data: result, reason: 'Data was found' });

					// for (var i = 0; i < result.length; i++) {
						
						// res.locals.connection.query("SELECT * FROM Teams WHERE company_for = ? AND team_name = ?", [token_decoded.company, result[i].team_name], function (err, result, fields) {

							// if (err) {res.json({ res: false, message: "error", reason: err });}
							res.json({ res: true, message: 'true', data: result, reason: 'Data was found' });
							// else if (result.length > 0) {}

							// else{ res.json({ res: true, message: 'error', reason: 'Sorry an error occured' }); }

						// });

					// }

				}

				else{ res.json({ res: true, message: 'empty', reason: 'No team found' }); }

			});
	}
});

/* get list of users in a team. */
router.get('/:team_name/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
	var team_name = req.params.team_name || null;

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});	

	else {

					/*------------list of all form data needed on for this api to work------------*/

				    res.locals.connection.query("SELECT * FROM Team_mates WHERE team_name = ? AND company_for = ?", [team_name, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {

					      	var email_details = [];
					      	var sql_statement_for_users = "";

					      	for (var i = 0; i < result.length; i++) {

					      		email_details.push(result[i].email);
					      		sql_statement_for_users += "SELECT * FROM User WHERE email = ?; ";

					      	}

					      	console.log(sql_statement_for_users);
					      	/*
							* The logic in the code below is that, we check to see if all members added
							* to a team are acutally users, so first we save all emails gotten from the
							* Team_mates Table and we check them against the User table to confirm if they
							* acutally registerd to the platform, if they didn't then we basically give
							* them the name "NOn" and their email.
							* So how we did that was since we saved all emails into an array
							* if the user exist in the User table we delete him from the array 
							* and add him to UserData array
							* But if he was seen in the User table then we basically delete him
							* from the array too.. but not after adding him to the UserData array with 
							* the name NON, so that data left in the array would be unchecked names

					      	*/
							res.locals.connection.query((sql_statement_for_users), email_details, function (err, result, fields) {

								      if (err) {res.json({ res: false, message: "error", reason: err });}

								      else if (result.length > 0) {

								      	var already_found_existing_user = false;
								      	var userData = []

								      	for (var i = 0; i < result.length; i++) {
								      		
								      		if (result[i].length > 0) {

								      			console.log(result[i][0].email)
								      			already_found_existing_user = true;

								      			//get ele array index so we can remove it from the emails of users found in a team
								      			var index = email_details.indexOf(result[i][0].email);

								      			userData.push({name: result[i][0].fullname, email: result[i][0].email});
								      			email_details.splice(index,1);


								      		}
								      		else{
								      			console.log(email_details)
								      			userData.push({name: "Non", email: email_details[0]})
								      			email_details.splice(0,1);
								      		}
								      		console.log(email_details)

								      	}

								      	if (already_found_existing_user == true) res.json({ res: true, message: 'true', data: userData, reason: 'Data found' });

								      	else res.json({ res: true, message: 'empty', reason: 'No participant found' });

								      }

								      else{

										  res.json({ res: true, message: 'empty', reason: 'No participant found' });

									  }
							});


					      }

					      else{

							  res.json({ res: true, message: 'empty', reason: 'No team found' });

						  }
					});

			}
    

});


/* update existing team. */
router.post('/update/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var old_team_name = req.body.old_team_name || null;
		var new_team_name = req.body.new_team_name || null;

		/*--------------------END--------------------*/


		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, update teamname with the new name
			if (validate('name', old_team_name) == false || old_team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Old Team name is invalid' });
			}
			else if (validate('name', new_team_name) == false || new_team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'New Team name is invalid' });
			}
			else
			{

				    res.locals.connection.query("SELECT * FROM Teams WHERE 	team_name = ? AND company_for = ?", [old_team_name, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {

						      	//this variable is to know if an array returned in the result variable
						      	// does not contain empty arrays.. because the email actually didn't 
						      	//exist in the db_con

						      	update_team(res.locals.connection, old_team_name, new_team_name, token_decoded.company, res)
							    console.log("Yaa");
							    return;

					      }

					      else{

					      	  res.json({ res: false, message: 'team_not_exist', reason: 'Team does not exist' });

						  }
					});
			}
		}
	}
});


/* delete existing team. */
router.delete('/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var team_name = req.body.team_name || null;

		/*--------------------END--------------------*/

		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, update teamname with the new name
			if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'error', reason: 'Please use a valid ID' });
			}
			else
			{

				    res.locals.connection.query("SELECT * FROM Teams WHERE team_name = ? AND company_for = ?", [team_name, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {

						      	//this variable is to know if an array returned in the result variable
						      	// does not contain empty arrays.. because the email actually didn't 
						      	//exist in the db_con

						      	delete_team(res.locals.connection, team_name, token_decoded.company, res)
							    console.log("Yaa");
							    return;

					      }

					      else{

					      	  res.json({ res: false, message: 'team_not_exist', reason: 'Team does not exist' });

						  }
					});
			}
		}
	}
});


/* get list of users in a team. */
router.delete('/leave/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
	var team_name = req.body.team_name || null;

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});	

	else {

					/*------------list of all form data needed on for this api to work------------*/
					if (token_decoded.role == 'admin' ) res.json({res: false, message: 'error', reason: 'An admin can\'t leave a group without deleting it'});

					else{
					    res.locals.connection.query("SELECT * FROM Team_mates WHERE email = ? AND team_name = ? AND company_for = ?", [token_decoded.email, team_name, token_decoded.company], function (err, result, fields) {

						      if (err) {res.json({ res: false, message: "error", reason: err });}

						      else if (result.length > 0) {

								var sql = "DELETE FROM Team_mates WHERE email = ? AND team_name = ? AND company_for = ?";
								res.locals.connection.query(sql, [token_decoded.email, team_name, token_decoded.company], function (err, result) {

									if (err) {res.json({ res: false, message: "error", reason: err });}
									else {

										res.json({ res: true, message: "true", reason: "Successfully left the team" });

									}

								});

						      }

						      else{

								  res.json({ res: true, message: 'empty', reason: 'User does not exist in that team' });

							  }
						});
					}

			}
    

});
module.exports = router;
