var express = require('express');
var $sendMail = require('../utils/mailer');
var $jwt = require('../utils/jwt_handler');
var validate = require('../utils/validate');
var router = express.Router();


function delete_task(db_con, task_name, project_name, team_name, company, res_obj) {

	//delete taSK IN A PARTICULAR PROJECT
	console.log(team_name)
	var sql = "DELETE FROM Task WHERE task_name = ? AND parent_project = ? AND parent_team = ? AND parent_company = ?";
	//lets add al required sql params in one large array so that the new name can
	//reflect on every part of the db it is displayed
	var sql_params = [task_name, project_name, team_name, company]
	db_con.query(sql, sql_params, function (err, result) {

		if (err) { res_obj.json({ res: false, message: "error", reason: err }); }
		else { 
			res_obj.json({ res: true, message: "true", reason: "Successfully deleted task and it's correspondents" });
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
		var task_name = req.body.task_name || null;
		var milestone = req.body.milestone || null;
		var assignee = req.body.assignee || null;
		var start_date = req.body.start_date || null;
		var end_date = req.body.end_date || null;
		var start_date_obj = new Date(start_date);
		var end_date_obj = new Date(end_date);
		//reset date
		start_date_obj.setHours(0); start_date_obj.setMinutes(0); start_date_obj.setSeconds(0); start_date_obj.setMilliseconds(0); 
		end_date_obj.setHours(0); end_date_obj.setMinutes(0); end_date_obj.setSeconds(0); end_date_obj.setMilliseconds(0); 

		/*--------------------END--------------------*/

		//lets check if user has admin permission to create a new team
		if (token_decoded.role != 'admin' ) res.json({res: false, message: 'invalid_account_type', reason: 'This user does not have admin right on this company'});

		else {

			//now what we do is quite simple, we basically verify all participant has a role and a valid email
			if (validate('name', project_name) == false || project_name == null) 
			{
				res.json({ res: false, message: 'invalid_projectname', reason: 'Project name is invalid' });
			}
			else if (validate('name', team_name) == false || team_name == null) 
			{
				res.json({ res: false, message: 'invalid_teamname', reason: 'Team name is invalid' });
			}
			else if (validate('name', task_name) == false || task_name == null) 
			{
				res.json({ res: false, message: 'invalid_taskname', reason: 'Task name is invalid' });
			}
			else if (validate('name', milestone) == false || milestone == null) 
			{
				res.json({ res: false, message: 'invalid_milestone', reason: 'Milestone name is invalid' });
			}
			else if (validate('email', assignee) == false || assignee == null) 
			{
				res.json({ res: false, message: 'invalid_assignee', reason: 'Assignee mail is invalid' });
			}
			else if (validate('date', start_date) == false || start_date == null) 
			{
				res.json({ res: false, message: 'invalid_start_date', reason: 'Start date is invalid' });
			}
			else if (validate('date', end_date) == false || end_date == null) 
			{
				res.json({ res: false, message: 'invalid_end_date', reason: 'End Date is invalid' });
			}
			else if (start_date_obj.getTime() > end_date_obj.getTime()) {
				res.json({ res: false, message: 'invalid_start_date', reason: 'Start Date is invalid and higher than end date' });
			}
			else
			{

				res.locals.connection.query("SELECT * FROM Project WHERE project_name = ? AND parent_team = ? AND parent_company = ?", [project_name, team_name, token_decoded.company], function (err, result, fields) {

				    console.log(result.length)
					if (err) {res.json({ res: false, message: "error", reason: err });}

					else if (result.length < 1) {res.json({ res: false, message: 'project_not_exist', reason: 'This project is does not exist in that team/company' });}

					else
						{

						  res.locals.connection.query("SELECT * FROM Project WHERE project_name = ? AND parent_team = ? AND parent_company = ?", [project_name, team_name, token_decoded.company], function (err, result, fields) {

							  if (err) {res.json({ res: false, message: "error", reason: err });}

						   	  else if (result.length < 1) {res.json({ res: false, message: 'project_not_exist', reason: 'This project is does not exist in that team/company' });}

							  else
								{
								    res.locals.connection.query("SELECT * FROM Team_mates WHERE email = ? AND team_name = ? AND company_for = ?", [assignee, team_name, token_decoded.company], function (err, result, fields) {

								  		if (err) {res.json({ res: false, message: "error", reason: err });}

								  		else if (result.length < 1) {res.json({ res: false, message: 'email_not_exist', reason: 'This email is not registered to this project\'s parent team' });}

								  		else
								  		  	{

										      	var sql = "INSERT INTO Task (task_name, milestone, assignee, start_date, end_date, parent_project, parent_team, parent_company, completed) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)";
												  //create a project then
												res.locals.connection.query(sql, [task_name, milestone, assignee, start_date, end_date, project_name, team_name, token_decoded.company], function (err, result, fields) {
												  	
											      if (err) res.json({ res: false, message: "error", reason: err });
											      	
											      else
											      	{
											      		res.json({ res: true, message: "true", reason: "Successfully added task" });
											      	}

												});
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


/* get users listing. */
router.get('/:team_name/:project_name/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
	var team_name = req.params.team_name || null;
	var project_name = req.params.project_name || null;

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});	

	else if (validate('name', project_name) == false || project_name == null) res.json({res: false, message: 'invalid_projectname', reason: 'Invalid Project name'});	

	else {

			/*------------list of all form data needed on for this api to work------------*/

			res.locals.connection.query("SELECT * FROM Task WHERE parent_project = ? AND parent_team = ? AND parent_company = ?", [project_name, team_name, token_decoded.company], function (err, result, fields) {

				if (err) {res.json({ res: false, message: "error", reason: err });}

				else if (result.length > 0) {
					// res.json({ res: true, message: 'true', data: result, reason: 'Data was found' });
					analyze_task_data(result,res)
					return;
				}

				else{

					res.json({ res: true, message: 'empty', reason: 'No task found' });

				}

			});

		}

});


/* delete an existing task. */
router.delete('/:team/:project/:token', function(req, res, next) {

	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

	if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});	

	else {

		/*------------list of all form data needed on for this api to work------------*/

		var task_name = req.body.task_name || null;
		var project = req.params.project || null;
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
			if (validate('name', project) == false || project == null) 
			{
				res.json({ res: false, message: 'error', reason: 'Invalid Project name' });
			}
			if (validate('name', task_name) == false || task_name == null) 
			{
				res.json({ res: false, message: 'error', reason: 'Invalid Task Name' });
			}
			else
			{

				    res.locals.connection.query("SELECT * FROM Task WHERE task_name = ? AND parent_project = ? AND parent_team = ? AND parent_company = ?", [task_name, project, team, token_decoded.company], function (err, result, fields) {

					      if (err) {res.json({ res: false, message: "error", reason: err });}

					      else if (result.length > 0) {

						      	//this variable is to know if an array returned in the result variable
						      	// does not contain empty arrays.. because the email actually didn't 
						      	//exist in the db_con

						      	delete_task(res.locals.connection, task_name, project, team, token_decoded.company, res)
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


function analyze_task_data (result, res) {

	// console.log(result)
	var tasks = [];
	var completedTasks = 0;
	var totalTasks = result.length;

	for (var i = result.length - 1; i >= 0; i--) {

		//get parts of task data needed
		tasks.push({
			id: result[i].id,
			name: result[i].task_name,
			milestone: result[i].milestone,
			start_date: result[i].start_date,
			end_date: result[i].end_date,
			completed: result[i].completed,
			assignee: result[i].assignee
		});

		if (result[i].completed == true) {
			completedTasks++;
		}

	}

	res.json({ res: true, message: 'true', data: {tasks: tasks, total: totalTasks, completed: completedTasks}, reason: 'Data was found' });
}

module.exports = router;