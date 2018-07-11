var express = require('express');
var bcrypt = require('bcrypt');
var $sendMail = require('../utils/mailer');
var $jwt = require('../utils/jwt_handler');
var validate = require('../utils/validate');

var router = express.Router();

function gen_password_hash(pwd) {
	// body...
	bcrypt.hash(pwd, 15, function(err, hash) {
		console.log(hash)
		return hash;
	});
}

function generate_otp () {
	var arr = ""
	while(arr.length < 5){
	    var randomnumber = Math.floor(Math.random()*100) + 1;
	    if(arr.indexOf(randomnumber) > -1) continue;
	    arr += randomnumber;
	}
	return arr;
}

/* Post for BoukuPay. */
router.post('/create/admin', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var firstname = req.body.firstname || null;
		var lastname = req.body.lastname || null;
		var email = req.body.email || null;
		var password = req.body.password || null;
		var company = req.body.company || null;


		/*--------------------END--------------------*/

		if (validate("name", firstname) == false || firstname == null) 
		{
			res.json({ res: false, message: "invalid_firstname", reason: "First name is invalid" });
		}

		else if (validate("name", lastname) == false || lastname == null)
		{
			res.json({ res: false, message: "invalid_lastname", reason: "Last name is invalid" });
		}

		else if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else if (validate("company", company) == false || company == null)
		{
			res.json({ res: false, message: "invalid_company", reason: "Company name is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ? OR company = ?"), [email, company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {
			    	
			    	if (result[0].email == email) res.json({ res: false, message: "email_already_exist", reason: "Email belongs to another User" });
			    	else res.json({ res: false, message: "company_already_exist", reason: "Company is already registered" });
			    }

				/*Else add to db*/
				else
				{

					

					bcrypt.hash(password, 5, function(err, hash) {//hash the password

						var today = new Date();//generate date of registeration
						//prepare sql statement
						var sql = " INSERT INTO User (fullname, email, password, company, role, otp, account_activated) VALUES (?) "
						var values = [(firstname+" "+lastname), email, hash, company, 'admin', (generate_otp()), false]

						//insert into db
						res.locals.connection.query(sql, [values] , function (err, result) {

						    if (err) res.json({ res: false, message: "error", reason: err });
						    res.json({ res: true, message: "good", reason: "Successfully added" });

						});
						//res.locals.connection.end();

					});

				}

			  });

		}

	}
	catch(err) {
		console.log(err)
		res.json({ res: false, message: "error", reason: "Sorry an error occured" });
		return;
	}

});


/*verify user handler*/
router.post('/verify', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var email = req.body.email || null;
		var company = req.body.company || null;

		/*--------------------END--------------------*/

		if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else if (validate("company", company) == false || company == null)
		{
			res.json({ res: false, message: "invalid_company", reason: "Company name is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ? OR company = ?"), [email, company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    	if (result[0].company.toLowerCase() == company.toLowerCase() && result[0].email.toLowerCase() == email.toLowerCase()) {
			    		//means both company and email are registered to each other
			    		res.json({ res: true, message: "verified", reason: "THe email is registered in this company" });
			    	}

			    	else if (result[0].company.toLowerCase() == company.toLowerCase() && result[0].email.toLowerCase() != email.toLowerCase()) {
			    		//means both company and email are registered to each other
			    		res.json({ res: false, message: "company_verified", reason: "THe company is registered but email doesn't exist" });
			    	}

			    	else{

			    		res.json({ res: false, message: "non_verified", reason: "This company does not exist, kindly create one" });

			    	}

			    }

			    else{
			    	res.json({ res: false, message: "invalid", reason: "Email does not exist" });
			    }

			  });
			  //res.locals.connection.end();
		}

	}
	catch(err) {
		console.log(err)
		res.json({ res: false, message: "error", reason: "Sorry an error occured" });
		return;
	}

});


/*verify user handler*/
router.post('/login', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var email = req.body.email || null;
		var company = req.body.company || null;
		var password = req.body.password || null;

		/*--------------------END--------------------*/

		if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else if (validate("company", company) == false || company == null)
		{
			res.json({ res: false, message: "invalid_company", reason: "Company name is invalid" });
		}

		else if (validate("password", password) == false || password == null) 
		{
			res.json({ res: false, message: "invalid_password", reason: "Password is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [email, company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    	bcrypt.compare(password, result[0].password, function(err, is_valid){
			    		//lets verify password is valid

			    		if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    		else{

			    			if (is_valid == true) {

			    				//means both company and email are registered.. and if email is registered under company
						    	if (result[0].company.toLowerCase() == company.toLowerCase() && result[0].email.toLowerCase() == email.toLowerCase()) {
						    		
						    		//make 24hr timed jwt token and give it data
									var jwt_token = $jwt.sign(res.locals.key, {company: result[0].company.toLowerCase(), email: result[0].email.toLowerCase(), fullname: result[0].fullname.toLowerCase(), role: result[0].role.toLowerCase(), id_: result[0].id})

									console.log($jwt.verify(jwt_token, res.locals.key).company);

						    		res.json({ res: true, message: "true", jwt_token: jwt_token, account_type: result[0].role.toLowerCase(), reason: "Successfully logged in" });

						    	}

						    	else if (result[0].company.toLowerCase() != company.toLowerCase()) {

						    		//means both company and email are registered to each other
						    		res.json({ res: false, message: "invalid", reason: "Invalid Company name or Email" });

						    	}

						    	else{

						    		res.json({ res: false, message: "invalid", reason: "Invalid Company name or Email" });

						    	}
						    }

						    else
						    {

						    	res.json({ res: false, message: "invalid", reason: "Email/Password is incorrect	" });

						    }

						}
				    });
				    //res.locals.connection.end();

			    }

			    else
			    {
			    	res.json({ res: false, message: "invalid", reason: "Email does not exist" });
			    }

			  });
		}

	}
	catch(err) {
		console.log(err)
		res.json({ res: false, message: "error", reason: "Sorry an error occured" });
		return;
	}

});


/* Post for BoukuPay. */
router.post('/create/user', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var firstname = req.body.firstname || null;
		var lastname = req.body.lastname || null;
		var email = req.body.email || null;
		var password = req.body.password || null;
		var company = req.body.company || null;


		/*--------------------END--------------------*/

		if (validate("name", firstname) == false || firstname == null) 
		{
			res.json({ res: false, message: "invalid_firstname", reason: "First name is invalid" });
		}

		else if (validate("name", lastname) == false || lastname == null)
		{
			res.json({ res: false, message: "invalid_lastname", reason: "Last name is invalid" });
		}

		else if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else if (validate("company", company) == false || company == null)
		{
			res.json({ res: false, message: "invalid_company", reason: "Company name is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE company = ?"), [company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: company exist*/
			    else if(result.length > 0) {
	
			      //now lets check if the email has already been registered for this company
				  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [email], function (err, result, fields) {

					    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

					    /*If: email exist*/
					    else if(result.length > 0) {
			
					    	res.json({ res: false, message: "email_already_exist", reason: "Email exist for this company" });
		    	
					    }

						// /*Else add to db*/
						else
						{

							bcrypt.hash(password, 5, function(err, hash) {//hash the password

								//prepare sql statement
								var sql = " INSERT INTO User (fullname, email, password, company, role, otp, account_activated) VALUES (?) "
								var values = [(firstname+" "+lastname), email, hash, company, 'user', (generate_otp()), false]

								//insert into db
								res.locals.connection.query(sql, [values] , function (err, result) {

								    if (err) res.json({ res: false, message: "error", reason: err });
								    else{

										var subject = "Welcome to Revity";
										var msg = "Your account has been successfully created, welcome on board.\n To activate your account, kindly click on the link below";

										$sendMail(email, subject, msg);
										res.json({ res: true, message: "good", reason: "Successfully added" });

								    }

								});

							});	

						}

				    });//end of email existence search
				  //res.locals.connection.end();

			    }

				// /*Else add to db*/
				else
				{

					res.json({ res: false, message: "company_not_exist", reason: "Company doesn't exist on our db" });

				}

			  });

		}

	}
	catch(err) {
		console.log(err)
		res.json({ res: false, message: "error", reason: "Sorry an error occured" });
		return;
	}

});


module.exports = router;
