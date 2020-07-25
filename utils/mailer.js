var nodemailer = require('nodemailer');
/*
*Author : SwitchCaseHub (community members)

* THis file would be used to handle everything sending of mails
* From single mails to bulk mails
*/
function sendMail(to,subject,msg) {

    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: '....', // generated ethereal user
            pass: '....' // generated ethereal password
        }
    });

    const mailOptions = {
      from: '...', // sender address
      to: [to], // list of receivers
      subject: subject, // Subject line
      html: msg// plain text body
    };

    transporter.sendMail(mailOptions, function (err, info) {
       if(err)
         console.log(err)
       else
         console.log(info);
    });
	
}

module.exports = sendMail;
