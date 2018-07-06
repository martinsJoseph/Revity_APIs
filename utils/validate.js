// Validates that the input string is a valid date formatted as "mm/dd/yyyy"
function isValidDate(dateString)
{
    // First check for the pattern
    if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateString))
        return false;

    // Parse the date parts to integers
    var parts = dateString.split("/");
    var day = parseInt(parts[1], 10);
    var month = parseInt(parts[0], 10);
    var year = parseInt(parts[2], 10);

    // Check the ranges of month and year
    if(year < 1000 || year > 3000 || month == 0 || month > 12)
        return false;

    var monthLength = [ 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 ];

    // Adjust for leap years
    if(year % 400 == 0 || (year % 100 != 0 && year % 4 == 0))
        monthLength[1] = 29;

    // Check the range of the day
    return day > 0 && day <= monthLength[month - 1];
};


//validator
function validate(key, value) {
	// body...
	var name = /([A-z]+)/;
	var email = /([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+/;
	var password = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
	var bizname = /^(?!\s)(?!.*\s$)(?=.*[a-zA-Z0-9])[a-zA-Z0-9 '~?!]{2,}$/;
	var address = /(\S+)/;
	var message = /(\S+)/;
	var number = /(\d+)/;
	var date = /^((19|20)\\d\\d)[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/;

	if (key == "name") {

		if (name.test(value))
			return true;

		return false;

	}
	else if (key == "email") {

		if (email.test(value))
			return true;
		
		return false;

	}
	else if (key == "id") {

		if (number.test(value))
			return true;
		
		return false;

	}
	else if (key == "company") {

		if (bizname.test(value))
			return true;
		
		return false;

	}
	else if (key == "date") {

		if (isValidDate(value))
			var date = new Date(value)
			date.setHours(0); date.setMinutes(0); date.setSeconds(0); date.setMilliseconds(0); 
			console.log(date.getTime());
			return true;
		
		// console.log(isValidDate(value))
		return false;

	}
	else if (key == "participant") {

		// value = eval(value);//convert to array form
		console.log(typeof(value));
		console.log(value);

		if (value != null) {//check if value is null
			if (value.length > 0) {//check if value is empty
				for (var i = value.length - 1; i >= 0; i--) {
					console.log(value[i].email)
					console.log(value[i].role)
					if (email.test(value[i].email) && name.test(value[i].role)){
						console.log("Passed participant")
					}
					else return false;
					
					
				}
				return true;
			}
			return false;
		}
		return false;

	}
	else if (key == "address") {

		if (address.test(value))
			return true;
		
		return false;

	}
	else if (key == "message") {

		if (message.test(value))
			return true;
		
		return false;

	}
	else if (key == "category") {

		var categories = ["H","t","y"]
		return categories.indexOf(value) > -1;

	}
	else if (key == "password") {

		if (password.test(value))
			return true;

		return false;

	}
}

module.exports = validate;