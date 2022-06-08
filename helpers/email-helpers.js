var db=require('../config/connection');
const email=require('../config/mail');
const nodemailer=require('nodemailer');
const mail = require('../config/mail');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path=require('path');
var collection=require('../config/collections');
const { ObjectId, ServerDescription } = require('mongodb');

const doc = new PDFDocument();

module.exports={

    sendInvoice:(invoice,userId)=>{

    },
    sendEmail:(userId,documentName)=>{
    
      return new Promise(async(resolve,reject)=>{

        let user=await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(userId)});

        console.log(user);
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

      })
    }
}