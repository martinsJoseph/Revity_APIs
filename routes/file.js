const path = require("path");
const fs = require("fs");
const express = require('express');
const randomstring = require("randomstring");
const multer = require("multer");
var $jwt = require('../utils/jwt_handler');
var $encryption = require('../utils/encryption');
var validate = require('../utils/validate');
const router = express.Router();

const handleError = (err, res) => {
  res.json({ res: false, message: "error", reason: err });
};

const upload = multer({
  dest: "../uploads"
});

router.post("/upload/profile/:token", upload.single("profile_pic"), (req, res) => {

  var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user

  if (token_decoded == false) { 

    res.json({res: false, message: 'invalid_token', reason: 'Invalid token'})
    return;

  }

  else {

    const tempPath = req.file.path;

    const encrypted_img = randomstring.generate(16);
    const salt_encrypted_img = randomstring.generate(16);
    const img_name = "profile/"+encrypted_img+salt_encrypted_img+".png";

    const targetPath = path.join(__dirname, "../uploads/"+img_name);

    if (path.extname(req.file.originalname).toLowerCase() === ".png" || path.extname(req.file.originalname).toLowerCase() === ".jpg" || path.extname(req.file.originalname).toLowerCase() === ".jpeg") {

          //check if user exist even if the token is verified
          res.locals.connection.query(("SELECT * FROM User WHERE email = ? AND company = ?"), [token_decoded.email, token_decoded.company], function (err, result, fields) {

            if (err) { res.json({ res: false, message: "error", reason: err }); return; }

            else if(result.length > 0) {

                var old_image_file = result[0].p_pix;
                //update the profile picture column on the db, 
                var sql = "UPDATE User SET p_pix = ? WHERE email = ?";
                res.locals.connection.query(sql, [img_name, token_decoded.email], function (err, result_) {

                  if (err) {res.json({ res: false, message: "error", reason: err }); return;}

                  else {

                    //save file into database
                    fs.rename(tempPath, targetPath, err => {
                      if (err) return handleError(err, res);

                      else{

                        //check if user has already uploaded an image before
                        if (old_image_file != '' && old_image_file != 'profile/default.png') {

                          //delete old profile picture from the system
                          fs.unlink(path.join(__dirname, "../uploads/"+old_image_file), err => {
                            console.log(err)
                          });

                        }
                        res.json({ res: true, data: img_name, message: "true", reason: 'Uploaded successfully' });
                        return;

                      }

                    });

                  }

                });
            }

          });

    } else {

      //if an error occured, then kick the image outta memory
      fs.unlink(tempPath, err => {
        if (err) return handleError(err, res);

        res.json({ res: false, message: "invalid", reason: 'Only .png/.jpg/.jpeg files are allowed!' });
        return;

      });

    }
  }
});


//send FILE AS message
router.post("/upload/chat/:token", upload.single("message_pic"), (req, res) => {

  	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
	var receiver_id = req.body.receiver_id || null;
	var message = req.body.message || null;

   if (token_decoded == false) { 
   	res.json({res: false, message: 'invalid_token', reason: 'Invalid token'})
   	return;
	}

	else if (validate('id', receiver_id) == false || receiver_id == null || token_decoded.id_ == receiver_id) res.json({res: false, message: 'error', reason: 'Invalid receiver'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

  else {

    const tempPath = req.file.path;

    const encrypted_img = randomstring.generate(16);
    const salt_encrypted_img = randomstring.generate(16);
    const img_name = "message/"+encrypted_img+salt_encrypted_img+".png";

    const targetPath = path.join(__dirname, "../uploads/"+img_name);

    if (path.extname(req.file.originalname).toLowerCase() === ".png" || path.extname(req.file.originalname).toLowerCase() === ".jpg" || path.extname(req.file.originalname).toLowerCase() === ".jpeg") {

          //check if user exist even if the token is verified
          res.locals.connection.query("SELECT * FROM User WHERE id = ? AND company = ?", [receiver_id, token_decoded.company], function (err, result, fields) {

            if (err) { res.json({ res: false, message: "error", reason: err }); return; }

            else if(result.length > 0) {

					  	var msg_salt = randomstring.generate(16);
					 	var msgDate = (new Date().toISOString().slice(0, 19).replace('T', ' '));

                	//Upload image and save file part to db
					   var sql = "INSERT INTO Messages (sender_id, receiver_id, message, is_file, is_seen, is_Team, full_date, parent_company, alts, team_name, reported, file_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
					   res.locals.connection.query(sql, [token_decoded.id_, receiver_id, ($encryption.encrypt(message, msg_salt)), true, false, false, msgDate, token_decoded.company, msg_salt, '', false, img_name], function (err, result) {

                  if (err) {res.json({ res: false, message: "error", reason: err }); return;}

                  else {

                    //save file into database
                    fs.rename(tempPath, targetPath, err => {
                      if (err) return handleError(err, res);

                      else{

					  	  		var message_Data = {id: result.insertId, sender_id: token_decoded.id_, message: message, is_file: false, team_name: "", full_date: msgDate, fullname: token_decoded.fullname, email: token_decoded.email}

						  	  	req.io.emit("msg_recv", {recv: receiver_id, msg: message, sender: token_decoded.id_, company: token_decoded.company})

						  	  	res.json({ res: true, message: "true", data: message_Data, reason: "Successfully sent message"});
                        return;

                      }

                    });

                  }

                });
            }

            else {
            	console.log(result)
            	res.json({ res: false, message: 'user_not_exist', reason: 'User does not exist' });
            }

          });

    } else {

      //if an error occured, then kick the image outta memory
      fs.unlink(tempPath, err => {
        if (err) return handleError(err, res);

        res.json({ res: false, message: "invalid", reason: 'Only .png/.jpg/.jpeg files are allowed!' });
        return;

      });

    }
  }
});


//send FILE AS message
router.post("/upload/chat/:team/:token", upload.single("message_pic"), (req, res) => {

  	var token_decoded = $jwt.verify(req.params.token, res.locals.key);//get all details of current logged user
  	var team_name = req.params.team || null;
	var message = req.body.message || null;

   if (token_decoded == false) { 
   	res.json({res: false, message: 'invalid_token', reason: 'Invalid token'})
   	return;
	}

	else if (validate('name', team_name) == false || team_name == null) res.json({res: false, message: 'invalid_teamname', reason: 'Invalid team name'});

	else if (validate('message', message) == false || message == null) res.json({res: false, message: 'invalid_message', reason: 'Invalid message'});

  else {

    const tempPath = req.file.path;

    const encrypted_img = randomstring.generate(16);
    const salt_encrypted_img = randomstring.generate(16);
    const img_name = "message/"+encrypted_img+salt_encrypted_img+".png";

    const targetPath = path.join(__dirname, "../uploads/"+img_name);

    if (path.extname(req.file.originalname).toLowerCase() === ".png" || path.extname(req.file.originalname).toLowerCase() === ".jpg" || path.extname(req.file.originalname).toLower