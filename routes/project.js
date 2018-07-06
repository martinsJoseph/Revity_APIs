var express = require('express');
var $sendMail = require('../utils/mailer');
var $jwt = require('../utils/jwt_handler');
var validate = require('../utils/validate');
var router = express.Router();


function delete_project(db_con, project_name, team_name, company, res_obj) {

	//delete project IN A PARTICULAR TEAM
	console.log(team_name)
	var sql = "DELETE FROM Project WHERE project_name = ? AND parent_team = ? AND parent_company = ?; DELETE FROM Task WHERE parent_project = ? AND parent_team = ? AND parent_company = ?";
	//lets add al required sql params in one large array so that the new name can
	//reflect on every part of the db it is displayed
	var sql_params = [project_name, team_name, company, project_name, team_name, company]
	db_con.query(sql, sql_params, function (err, result) {

		if (err) { res_obj.json({ res: false, message: "error", reason: err }); }
		else { 
			res_obj.json({ res: true, message: "true", reason: "Successfully deleted project and it's correspondents" });
		}

	});

}


/* GET users listing. */
router.post('/create/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var project_name = req.body.project_name || null;
		var team_name = req.body.team_name || null;

		/*--------------------END--------------------*/

		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, we basically verify all participant has a role and a valid email
			if (validate('name', project_name) == false || project_name == null) 
			{
				res.json({ res: false, message: 'invalid_projectname', reason: 'Project Name name is invalid' });
			}
			else if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Team Name name is invalid' });
			}
			else
			{

				    res.locals.connection.query("SELECT * FROM Teams WHERE 	team_name = ? AND 	company_for = ?", [team_name, token_decoded.company], function (err, result, fields) {

				    	  console.log(result.length)
					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length < 1) {res.json({ res: false, message: 'team_not_exist', reason: 'This team is does not exist' });}

						  else{ res.locals.connection.query("SELECT * FROM Project WHERE project_name = ? AND parent_team = ? AND parent_company = ?", [project_name, team_name, token_decoded.company], function (err, result_, fields) {

						  		  console.log(result_);
							      if (err) {res.json({ res: false, message: "error", reason: err });}

							      else if (result_.length > 0) {res.json({ res: false, message: 'project_exist', reason: 'THis project is already registered for this team under this company' });}

							      else{

							      	  var sql = "INSERT INTO Project (project_name, parent_team, parent_company) VALUES (?,?,?)";
									  //create a project then
									  res.locals.connection.query(sql, [project_name, team_name, token_decoded.company], function (err, result, fields) {
									  	
								      	if (err) res.json({ res: false, message: "error", reason: err });
								      	
								      	else{
								      		res.json({ res: true, message: "true", reason: "Successfully created project" });
								      	}

									  });

								  }
							});
						}
					});

			}


		}
	}
    

});


/* get projects listing. */
router.get('/:team_name/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
	var team_name = req.params.team_name || null;

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});	

	else {

			/*------------list of all form data needed on for this api to work------------*/

			res.locals.connection.query("SELECT * FROM Project WHERE parent_team = ? AND parent_company = ?", [team_name, token_decoded.company], function (err, result, fields) {

				if (err) {res.json({ res: false, message: "error", reason: err });}

				else if (result.length > 0) { res.json({ res: true, message: 'true', data: result, reason: 'Data was found' }); }

				else{

					res.json({ res: true, message: 'empty', reason: 'No Project found' });

				}

			});

			/* End of form data... */
	}

});


/* delete an existing project. */
router.delete('/:team/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var project_name = req.body.project_name || null;
		var team = req.params.team || null;
		

		/*--------------------END--------------------*/


		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, update teamname with the new name
			if (validate('name', team) == false || team == null) 
			{
				res.json({ res: false, message: 'error', reason: 'Invalid Team name' });
			}
			if (validate('name', project_name) == false || project_name == null) 
			{
				res.json({ res: false, message: 'error', reason: 'Invalid Team Name' });
			}
			else
			{

				    res.locals.connection.query("SELECT * FROM Project WHERE project_name = ? AND parent_team = ? AND parent_company = ?", [project_name, team, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {

						      	delete_project(res.locals.connection, project_name, team, token_decoded.company, res)
							    console.log("Yaa");
							    return;

					      }

					      else{

					      	  res.json({ res: false, message: 'error', reason: 'It\'s either team/project/company is invalid' });

						  }
					});
				  // res.locals.connection.end();

			}


		}
	}
    

});

module.exports = router;