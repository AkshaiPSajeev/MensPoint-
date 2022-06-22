var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs=require('express-handlebars');
var fileupload=require('express-fileupload');
var db=require('./config/connection');
var session=require('express-session');
const {v4:uuidv4}=require("uuid");
require('dotenv').config();




var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
const { cookie } = require('express/lib/response');

var app = express();
app.use(session({
  secret :uuidv4(),//initializing the session
  resave:false,
  saveUninitialized:true
}));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout',partialsDir:__dirname+'/views/partials',
helpers:{
  getFinalValue(Price,Discount){
    return Price-(Price*Discount/100);
  },
  getTotal(price,quantity){
    return price*quantity;
  },
  counter(num){
    return num+1;
  },
  convertJsonStringify(s){
    return JSON.stringify(s);
  },
  times(n,block){
    let acc='';
    for(let i=1;i<=n;i++){
      acc+=block.fn(i);
    }
    return acc;
  },
  counterPagination (num1,num2){
    num2+=1;
    return num1+num2;
  },
  convertDate(d){
    let day=d.getDay();
    let str=d.toLocaleDateString();
    if(day==0){
      str=str+" Sunday"
    }else if(day==1){
      str=str+" Monday"
    }else if(day==2){
      str=str+" Tuesday"
    }else if(day==3){
      str=str+" Wednesday"
    }else if(day==4){
      str=str+" Thursday"
    }else if(day==5){
      str=str+" Friday"
    }else if(day==6){
      str=str+" Saturday"
    }
    return str;
  },
  placedOrDispatched(s1,s2){
  
    return s1||s2;
  },
  calculateWallet(wallet,orderTotal){
    if(wallet>=orderTotal){
      return wallet-orderTotal;
    }else{
      return 0;
    }
  },
  calculateAmountToPay(wallet,orderTotal){
    return orderTotal-wallet;
  }
}})); 
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileupload());

db.connect((err)=>{
  if(err)
  console.log("connection error "+err);
  else
  console.log("data base connection created");
});

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
