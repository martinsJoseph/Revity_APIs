const path = require("path");
const fs = require("fs");
const express = require('express');
const randomstring = require("randomstring");
const multer = require("multer");
var $jwt = require('../utils/jwt_handler');
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

//load image from the server
router.get("/load", (req, res) => {

  const file_name = req.query.file;
  console.log(file_name)
    res.sendFile(path.join(__dirname, "../uploads/"+file_name), err => {
      if (err) {res.json({ res: false, message: "file_not_found", reason: 'This file was not found' }); return;}
      else { return;}
    });
    return;    

})
module.exports = router;