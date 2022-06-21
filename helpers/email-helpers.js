var db=require('../config/connection');
const email=require('../config/mail');
const nodemailer=require('nodemailer');
const mail = require('../config/mail');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path=require('path');
var collection=require('../config/collections');
const { ObjectId, ServerDescription } = require('mongodb');
const { resolveObjectURL } = require('buffer');

const doc = new PDFDocument();

module.exports={

    sendEmail:(userId,documentName)=>{
    
      return new Promise((resolve,reject)=>{

         db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(userId)}).then((user)=>{

         
          let transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: mail.email,
              pass: mail.password
            }
          });
             
          let  mailOptions = {
            from: mail.email,
            to:user.Email,
            subject: 'Invoice',
            text: 'Thank you for shopping in menspoint fashions.Following is your order Details',
            attachments: [
                {
                    filename: documentName, // <= Here: made sure file name match
                    path:path.join(__dirname+'../../invoices/'+documentName), // <= Here
                    contentType: 'application/pdf'
                }
            ]
          };
          transporter.sendMail(mailOptions, function(error, info){
            if (error) {
              console.log(error);
            } else {
              console.log('Email sent: ' + info.response);
            }
          });

          console.log('befor resolve email send');
         resolve();
 
         });

        
       
       
      })
    }
}