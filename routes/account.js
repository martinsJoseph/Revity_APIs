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

function makeKey() {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < 25; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
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

		else if (validate("password", password) == false || password == null)
		{
			res.json({ res: false, message: "invalid_password", reason: "Password is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ? OR company = ?"), [email, company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: err });

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
						var otp = generate_otp();
						var sql = " INSERT INTO User (fullname, email, password, company, role, otp, account_activated, p_pix) VALUES (?) "
						var values = [(firstname+" "+lastname), email, hash, company, 'admin', (otp), false, 'profile/nx2ued7823YKUBd3d293hd2dvyv2dv23ggr422.png']

						//insert into db
						res.locals.connection.query(sql, [values] , function (err, result) {

							//prepare mail to send
							var subject = "Revity: Confirm your Revity account";
							var msg = "Thanks for registering with Revity, and we promise to take your projects from start to finish.<br> your account activation code is: <b>"+otp+"</b><br> Cheers,<br>Team Revity.";

							$sendMail(email.toString(), subject, msg);

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

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ? AND company = ? OR email != ? AND company = ? OR email = ? AND company != ?"), [email, company, email, company, email, company], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    	var response_type = ''

			    	for (var i = result.length - 1; i >= 0; i--) {

			    		console.log(result[i])
		    	
				    	if (result[i].company.toLowerCase() == company.toLowerCase() && result[i].email.toLowerCase() == email.toLowerCase()) {
				    		//means both company and email are registered to each other
				    		res.json({ res: true, message: "verified", reason: "The email is registered in this company" });
				    		break;
				    	}

				    	else if (result[i].company.toLowerCase() == company.toLowerCase() && result[i].email.toLowerCase() != email.toLowerCase()) {
				    		//means both company
				    		response_type = 'company_verified';

				    	}

				    	else{

				    		response_type = 'non_verified';

				    	}

				   }

				    if (response_type == 'verified') {
				    	return;
				    }

				    else if (response_type == 'company_verified') {
				    	console.log("hay");
				    	res.json({ res: false, message: "company_verified", reason: "The company is registered but email doesn't exist" })
				    	return;		
				    }

				    else if (response_type == 'non_verified') {
				    	console.log("ha3");
				    	res.json({ res: false, message: "non_verified", reason: "This company does not exist, kindly create one" })
				    	return;
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


/*verify if email*/
router.post('/verifyEmail', function(req, res, next) {
  	
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
			    		res.json({ res: false, message: "email_not_in_compnay", reason: "THe company is registered but email doesn't exist" });
			    	}

			    	else{

			    		res.json({ res: false, message: "company_not_exist", reason: "This company does not exist, kindly create one" });

			    	}

			    }

			    else{
			    	res.json({ res: false, message: "not_exist", reason: "Email does not exist" });
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

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [email], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    	bcrypt.compare(password, result[0].password, function(err, is_valid){
			    		//lets verify password is valid

			    		if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    		else{

			    			if (is_valid == true) {

			    				//means both company and email are registered.. and if email is registered under company
						    	if (result[0].company.toLowerCase() == company.toLowerCase() && result[0].email.toLowerCase() == email.toLowerCase() && result[0].account_activated == true) {
						    		
						    		tempKey = makeKey();

									/*generate token to check time,
									* since we don't want to release 
									* our backend secret key to the main 
									* jwt outside to the front-end component
									*/
									
									var time_token = $jwt.sign(tempKey, "0x9x01xbc:c9:0x0")

						    		//make 24hr timed jwt token and give it data
									var jwt_token = $jwt.sign(res.locals.key, {company: result[0].company.toLowerCase(), email: result[0].email.toLowerCase(), fullname: result[0].fullname.toLowerCase(), role: result[0].role.toLowerCase(), id_: result[0].id, image: result[0].p_pix})

									console.log(result[0].p_pix);

						    		res.json({ res: true, message: "true", jwt_token: jwt_token, chain: tempKey, time: time_token, account_type: result[0].role.toLowerCase(), data: {company: result[0].company.toLowerCase(), email: result[0].email.toLowerCase(), fullname: result[0].fullname.toLowerCase(), id: result[0].id, image: result[0].p_pix}, reason: "Successfully logged in" });

						    	}

						    	else if (result[0].company.toLowerCase() != company.toLowerCase()) {

						    		//means both company and email are registered to each other
						    		res.json({ res: false, message: "invalid", reason: "Invalid Company name or Email" });

						    	}

						    	else if (result[0].account_activated == false) {

						    		var otp = generate_otp();
									var sql = "UPDATE User SET otp = ? WHERE email = ?";
									var sql_params = [otp, result[0].email]
									res.locals.connection.query(sql, sql_params, function (err, result_) {

										if (err) res.json({ res: false, message: "error", reason: "SQL error" });

										else{

											var subject = "Revity: Re-Confirm your Revity account";
											var msg = "Thanks for registering with Revity, and we promise to take your projects from start to finish.<br> your account activation code is: <b>"+otp+"</b><br> Cheers,<br>Team Revity.";

											$sendMail(result[0].email, subject, msg);

								    		//means both company and email are registered to each other
								    		res.json({ res: false, message: "not_activated", reason: "Account not activated" });

										}

									});

						    	}

						    	else{

						    		res.json({ res: false, message: "invalid", reason: "Invalid Company name or Email" });

						    	}
						    	
						    }

						    else
						    {

						    	res.json({ res: false, message: "invalid", reason: "Email/Password is incorrect" });

						    }

						}
				    });

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

		else if (validate("password", password) == false || password == null)
		{
			res.json({ res: false, message: "invalid_password", reason: "Password is invalid" });
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

								var otp = generate_otp();
								//prepare sql statement
								var sql = " INSERT INTO User (fullname, email, password, company, role, otp, account_activated, p_pix) VALUES (?) "
								var values = [(firstname+" "+lastname), email, hash, company, 'user', (otp), false, 'profile/nx2ued7823YKUBd3d293hd2dvyv2dv23ggr422.png']

								//insert into db
								res.locals.connection.query(sql, [values] , function (err, result) {

								    if (err) res.json({ res: false, message: "error", reason: err });
								    else{

										//prepare mail to send
										var subject = "Revity: Confirm your Revity account";
										var msg = "Thanks for registering with Revity, and we promise to take your projects from start to finish.<br> your account activation code is: <b>"+otp+"</b><br> Cheers,<br>Team Revity.";

										$sendMail(email.toString(), subject, msg);

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


/*Resend activation code*/
router.post('/resend', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var email = req.body.email || null;

		/*--------------------END--------------------*/

		if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [email], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    	if (result[0].account_activated == false) {

			    		var otp = generate_otp();

						var sql = "UPDATE User SET otp = ? WHERE email = ?";
						var sql_params = [otp, email]
						res.locals.connection.query(sql, sql_params, function (err, result) {

							if (err) res.json({ res: false, message: "error", reason: "SQL error" });

							else{

								var subject = "Revity: New Email Activation Code";
								var msg = "You requested for a new email activation code and here it is: <b>"+otp+"</b><br> Cheers,<br>Team Revity.";

								$sendMail(email.toString(), subject, msg);
								res.json({ res: true, message: "resent", reason: "OTP Successfully resent" });

							}

						});

			    	}
			    	else{
			    		res.json({ res: false, message: "already_activated", reason: "This account has already been activated" });
			    	}

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


/*Forgot Pass  activation code*/
router.post('/forgot', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var email = req.body.email || null;

		/*--------------------END--------------------*/

		if (validate("email", email) == false || email == null)
		{
			res.json({ res: false, message: "invalid_email", reason: "Email is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [email], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

			    		var forgotpassword_token = $jwt.quick_sign(res.locals.passkey, {code: generate_otp(), email: email});

						var subject = "Revity: You Forgot Your Password";
						var msg = "We noticed you are attempting to reset your password, if this was you then click on the link below <br> <a href='http://revityapp.com/reset/"+forgotpassword_token+"'>Reset Password</a> <br> If this wasn't you, then just ignore this message.";

						$sendMail(email.toString(), subject, msg);
						res.json({ res: true, message: "true", reason: "Forgot Password Code sent Successfully" });

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


/*Confirm reset link activation code*/
router.post('/verifyToken/:token', function(req, res, next) {
  	
  	try {

  		//confirm if token is valid, and get all the data needed to validate it
		var token_decoded = $jwt.verify(req.params.token, res.locals.passkey);
		console.log(token_decoded)

		if (token_decoded == false) res.json({res: false, message: 'invalid_token', reason: 'Invalid token'});

		else {

			/*
			*Let check if the email found in the token exist in the db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [token_decoded.email], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

						res.json({ res: true, message: "true", reason: "Valid Link" });

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


/*Confirm reset link activation code*/
router.post('/reset/:token', function(req, res, next) {
  	
  	try {

  		//confirm if token is valid, and get all the data needed to validate it
		var token_decoded = $jwt.verify(req.params.token, res.locals.passkey);

		if (token_decoded == false) { res.json({res: false, message: 'invalid_token', reason: 'Invalid token'}); return;	}

		var password = req.body.password || null;

		/*--------------------END--------------------*/

		if (validate("password", password) == false || password == null) 
		{
			res.json({ res: false, message: "invalid_password", reason: "Password is invalid" })
			return;
		}

		else {

			/*
			*Let check if the email found in the token exist in the db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE email = ?"), [token_decoded.email], function (err, result, fields) {

			    if (err) { res.json({ res: false, message: "error", reason: "SQL error" }); return;}

			    /*If: email exist, update user password*/
			    else if(result.length > 0) {


					bcrypt.hash(password, 5, function(err, hash) {//hash the Password
						var sql = "UPDATE User SET password = ?, account_activated = ? WHERE email = ?";
						var sql_params = [hash, true, token_decoded.email]
						res.locals.connection.query(sql, sql_params, function (err, result) {

							if (err) { res.json({ res: false, message: "error", reason: "SQL error" });  return;}

							else{

								res.json({ res: true, message: "confirmed", reason: "Password Successfully Changed" });
								return;

							}

						});
					});

			    }

			    else if (result.length < 1) {
			    	console.log(result)
			    	
			    	console.log({ res: false, message: "invalid", reason: "Email does not exist" });
			    	res.json({ res: false, message: "error", reason: "SQL error" });
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

/*Confirm Email verification code*/
router.post('/confirm', function(req, res, next) {
  	
  	try {

		/*------------list of all form data needed on for this api to work------------*/

		var code = req.body.code || null;

		/*--------------------END--------------------*/

		if (validate("message", code) == false || code == null)
		{
			res.json({ res: false, message: "invalid_code", reason: "Code is invalid" });
		}

		else {

			/*
			* What we do here is check if the email already exist for another User, 
			* if yes then we return email already in use, else we add to db
			*/

			  res.locals.connection.query(("SELECT * FROM User WHERE otp = ? AND account_activated = ?"), [code, false], function (err, result, fields) {

			    if (err) res.json({ res: false, message: "error", reason: "SQL error" });

			    /*If: email exist*/
			    else if(result.length > 0) {

						var sql = "UPDATE User SET otp = ?, account_activated = ? WHERE otp = ?";
						var sql_params = ["", true, code]
						res.locals.connection.query(sql, sql_params, function (err, result) {

							if (err) res.json({ res: false, message: "error", reason: "SQL error" });

							else{

								res.json({ res: true, message: "confirmed", reason: "OTP Successfully confirmed" });

							}

						});


			    }

			    else
			    {
			    	res.json({ res: false, message: "invalid", reason: "OTP is incorrect" });
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
