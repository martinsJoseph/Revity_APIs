var jwt = require('jsonwebtoken');

/*
*Author : SwitchCaseHub (community members)

* THis file would be used to handle everything JWT token validation and issuing,
* it's going to come with all necessary methods required to handle every jwt component
* needed for the scope of this app
*/


var $jwt = 
{
	sign: function(key, data)
	{
		console.log("Generating JWT Signature");
		return jwt.sign({data: data}, key, { expiresIn: '24h' });

	},
	verify: function(token, key)
	{

		try {
		  var decoded = jwt.verify(token, key);
		  console.log("Verifying JWT Signature");
		  console.log(decoded.data)
		  return decoded.data;
		} catch(err) {
		  // err
		  console.log(false); return false;
		}

	}
}

module.exports = $jwt;