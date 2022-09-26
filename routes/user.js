const { use } = require('bcrypt/promises');
var express = require('express');
const session = require('express-session');
const async = require('hbs/lib/async');
//const { response } = require('../app');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
var userHelpers=require('../helpers/user-helpers')
let referralCodeGenerator = require('referral-code-generator');
const emailHelpers = require('../helpers/email-helpers');
const invoiceHelpers = require("../helpers/invoice-helpers");
const { order } = require('paypal-rest-sdk');
const path=require('path')
/* GET home page. */
  
const verifyLogin=(req,res,next)=>{
  if(req.session.userloggedIn){
    next();
  }else{
    res.redirect('/login');
  }
}

router.get('/', async function(req, res, next) {
 let user=req.session.user;
  let cartcount=null;
  if(req.session.user){
    cartcount=await userHelpers.getCartCount(req.session.user._id)
  }
 productHelpers.getAllProducts().then((products)=>{
  res.render('user/view-products', {products,admin:false,user,cartcount:cartcount });
   });
});

router.get('/login',(req,res)=>{
  console.log('hiii');
 if(req.session.user_id){
    res.redirect('/');
    }else{
      console.log('its here');
  res.render('user/login',{logerror:req.session.logerror,loginPage:true});
  req.session.logerror=false;
    }
});

router.post('/login',(req,res)=>{
 
    userHelpers.doLogin(req.body).then((response)=>{
     if(response.status){
      if(!response.user.Status){
        req.session.logerror="Your account is blocked";
      res.redirect('/login');
      }else{
        req.session.userloggedIn=true;
        req.session.user=response.user;
        var cartcount=null;
        if(req.session.user){
          cartcount=  userHelpers.getCartCount(req.session.user._id);
        }
        req.session.cartcount=cartcount;
        res.redirect('/');
      }
      }else{
      req.session.logerror="invalid username or password"
      res.redirect('/login');
    }
  });

});


router.get('/signup',(req,res)=>{
  req.session.referal=req.query.referal;
  
 res.render('user/signup');
});

router.post('/signup',(req,res)=>{
  req.body.referal=req.session.referal;
 
  req.session.referal=null;
  console.log(req.body);
 userHelpers.doSignup(req.body).then((response)=>{
   res.redirect('/login');
  })
});



router.get('/cart',verifyLogin,async(req,res)=>{
  let products= await userHelpers.getCartProducts(req.session.user._id);
  let orderSummary=await userHelpers.getOrderSummary(req.session.user._id);
  let wallet=await userHelpers.getUserWallet(req.session.user._id);
 
  res.render('user/cart',{products:products,user:req.session.user,orderSummary:orderSummary });
});

router.get('/add-to-cart/:id',(req,res)=>{
  if(req.session.user_id){
    userHelpers.addToCart(req.params.id,req.session.user._id).then(()=>{
      res.json({status:true})
    });
  }else{
    res.redirect('/login');
  }

});

router.get('/product-details/:productid',async(req,res)=>{
  let product= await productHelpers.getProductDetails(req.params.productid);
  res.render('user/product-details',{product:product,user:req.session.user})
})

router.post('/change-product-quantity',(req,res)=>{
 userHelpers.changeProductQuantity(req.body.cart,req.body.product,req.body.count).then(async(response)=>{
  response.orderSummary=await userHelpers.getOrderSummary(req.body.userId);
  response.productId=req.body.product;
    res.json(response)
  })
})

router.get('/remove-cart-item/:cartId/:productId',(req,res)=>{
   userHelpers.removeFromCart(req.params.cartId,req.params.productId).then(()=>{
    res.redirect('/cart');
  })
  
})

router.get('/place-order',verifyLogin,async(req,res)=>{
  let products= await userHelpers.getCartProducts(req.session.user._id);
  let addresses=await userHelpers.getUserAddresses(req.session.user._id);
  let orderSummary=await userHelpers.getOrderSummary(req.session.user._id);
  let coupons=await userHelpers.getAvailableCoupons(req.session.user._id);
  let wallet=await userHelpers.getUserWallet(req.session.user._id);
  console.log(typeof(wallet));
  let walletpay=null
  if(wallet>=orderSummary.TotalAmount){
    walletpay=true
  }
  let walletover=null;
  if(wallet==0){
    walletover=true;
  }
  res.render('user/place-order',{products:products,addresses:addresses,user:req.session.user,userId:req.session.user._id,orderSummary:orderSummary,coupons:coupons,wallet,walletpay,walletover:true});
})

router.post('/place-order',verifyLogin,async(req,res)=>{
    console.log('/////////////////////nalkjdboisjdf bdsjf skjdfh sf\n '); 
    console.log(req.body);
     
  let order=await userHelpers.getOrderSummary(req.body.userId);
  let addressId=req.body.AddressId;
  if(addressId===''){
  let addressObj={
    HouseName:req.body.HouseName,
    Street:req.body.Street,
    City:req.body.City,
    State:req.body.State,
    Pin:req.body.Pin
  }
   addressId=await userHelpers.addAddress(addressObj,req.session.user._id);
   req.body.AddressId=addressId;
 }
    
    let orderId=await userHelpers.placeOrder(req.body.userId,req.body);
       let total=await userHelpers.getOrderAmount(orderId);
       
      if(req.body.PaymentMode==="COD"){
       let response={
         
          cod:true,
          paypal:false,
          razorpay:false
        }
       // res.json(response);
       let invoice= await userHelpers.generateInvoice(orderId);
       let path=orderId+".pdf"
      invoiceHelpers.createInvoice(invoice,path);
    
       await emailHelpers.sendEmail(req.session.user._id,path);
    
        res.json(response);  
    }else if(req.body.PaymentMode==="Wallet"){
     let response={
         
        cod:false,
        paypal:false,
        razorpay:false,
        wallet:true
      }
      let invoice= await userHelpers.generateInvoice(orderId);
      let path=orderId+".pdf"
     invoiceHelpers.createInvoice(invoice,path);
   
      await emailHelpers.sendEmail(req.session.user._id,path);
   
      res.send(response);
    }else if(req.body.PaymentMode==="Razorpay"){
      //here 1 is meant to be total of ie order amount
     let razobj= await userHelpers.generateRazorpay(orderId,total);
     
        console.log('this is a check');
         let response={
          
          razorpay:true,
          razobj:razobj
         }
        //  let invoice= await userHelpers.generateInvoice(orderId);
        //  let path=orderId+".pdf"
        //  invoiceHelpers.createInvoice(invoice,path);
        //   emailHelpers.sendEmail(req.session.user._id,path).then(()=>{
        //     console.log('after email send');
        //     console.log(response);
        //   });
          res.send(response); 
  
    }else if(req.body.PaymentMode==="Paypal"){
       
    let paypalobj=await  userHelpers.generatePaypal(orderId,total);
        let response={
          //status:false,
          cod:false,
         paypal:true,
         razorpay:false,
         paypalobj:paypalobj
        }
       // res.json(response);
       let invoice= await userHelpers.generateInvoice(orderId);
       let path=orderId+".pdf"
       invoiceHelpers.createInvoice(invoice,path);
    
       await emailHelpers.sendEmail(req.session.user._id,path);
    
        res.send(response)
     
       
    }
  
    
})

router.get('/profile',async(req,res)=>{
 let userProfile=await userHelpers.getUser(req.session.user._id);
  console.log(userProfile);
 res.render('user/user-profile',{userProfile:userProfile[0],user:req.session.user});
});

router.get('/edit-user-details',verifyLogin,(req,res)=>{
  res.render('user/edit-user2',{userDetails:req.session.user,user:req.session.user})
})

router.post('/edit-user-details',async (req,res)=>{
  if(req.session.user.Name===req.body.Name&&req.session.user.Email===req.body.Email){
    res.redirect('/profile')
  }else{
    await userHelpers.editUser(req.session.user._id,req.body.Name,req.body.Email);
    let user=await userHelpers.getUser(req.session.user._id);
    req.session.user=user[0];
    res.redirect('/profile')

  }
})

router.get('/address-management',verifyLogin,(req,res)=>{
  userHelpers.getUserAddresses(req.session.user._id).then((addresses)=>{
    res.render('user/address-management2',{user:req.session.user,addresses})
  })
  
})
router.get('/add-address',verifyLogin,(req,res)=>{
  res.render('user/add-address',{user:req.session.user})
})

router.post('/add-address',verifyLogin,async(req,res)=>{
  await userHelpers.addAddress(req.body,req.session.user._id);
  res.redirect('address-management');

})

router.get('/edit-address/:addressId',verifyLogin,(req,res)=>{
  userHelpers.getAddress(req.params.addressId).then((address)=>{
     res.render('user/edit-address',{address:address});

  })
})

router.post('/edit-address/:addressId',verifyLogin,(req,res)=>{
  
  userHelpers.editAddress(req.params.addressId,req.body).then(()=>{
   res.redirect('/address-management');

  })
})

router.get('/delete-address/:addressId',verifyLogin,(req,res)=>{
  userHelpers.deleteAddress(req.params.addressId).then(()=>{
   res.redirect('/address-management');
  })
})

router.get('/change-password',verifyLogin,(req,res)=>{
  let changePasswordStatus=req.session.changePasswordStatus;
  res.render('user/change-password2',{user:req.session.user,changePasswordStatus:changePasswordStatus})
  req.session.changePasswordStatus=null;
})

router.post('/change-password',(req,res)=>{
  userHelpers.updatePassword(req.session.user._id,req.body.CurrentPassword,req.body.NewPassword).then((status)=>{
    if(status){
      res.redirect('/profile');
    }else{
      req.session.changePasswordStatus='You entered Current Password  incorrectly'
      res.redirect('/change-password')
    }

  })
})

router.get('/orders',verifyLogin,async(req,res)=>{

  let totalOrders=await userHelpers.getTotalUserOrders(req.session.user._id);
 console.log(totalOrders);
  let perPage=5;//total page=>perpage
  let totalpages=Math.ceil(totalOrders/perPage);//perpage=>totalpages
 
  let pageNumber=(req.query.page==null)?1:req.query.page;
  let startIndex=perPage*(pageNumber-1);
  let startFrom=(pageNumber-1)*perPage;
  let orders=await userHelpers.getUserOrders(req.session.user._id,startFrom,perPage)

 if(totalpages==1){
   totalpages=null;
 }
 console.log(orders);
  res.render('user/orders',{orders:orders,user:req.session.user,totalpages:totalpages,startIndex})
})
/*router.get('/delivered-order/:orderId',(req,res)=>{
  userHelpers.updateOrderDelivered(req.params.orderId);
  res.redirect('/orders')
})*/


router.get('/cancel-order/:orderId',(req,res)=>{
  console.log('canel order reached123456778');
  userHelpers.cancelOrder(req.params.orderId,req.session.user._id).then((response)=>{
    res.redirect('/orders');
  })

})

router.post('/verify-payment',(req,res)=>{
  
  userHelpers.verifyPayment(req.body).then(()=>{
    //if payment success change order status
  
    userHelpers.changePaymentStatus(req.body['order[receipt]']).then(()=>{
    
      res.json({status:true})
    })
  }).catch((err)=>{
    res.json({status:false,errMsg:"failed"})
  })
})

router.get('/offers-coupons',verifyLogin,async(req,res)=>{
  let coupons=await userHelpers.getAvailableCoupons(req.session.user._id);

  res.render('user/offers-coupons2',{user:req.session.user,coupons:coupons});
})

router.get('/view-orderitems',verifyLogin,(req,res)=>{
 
  userHelpers.viewOrderedItems(req.query.orderId).then((items)=>{
    console.log(items);
    //let p=__dirname+'./'+'\\invoices\\'+req.query.orderId+".pdf"
    //let p=path.join(__dirname,'../','invoices',req.query.orderId);
    //p=p+'.pdf'
   //let p="C:\Users\user\Desktop\Week6\ShoppingCart\invoices\62ad7cda2053bc88d55b93d5.pdf";
  
    let p="C:\\Users\\user\\Desktop\\Week6\\ShoppingCart\\receipts\\62ad7cda2053bc88d55b93d5.pdf";
    console.log(p);
    res.render('user/view-order-items',{user:req.session.user,items,path:p})
  })
  
})

router.get('/logout',(req,res)=>{
  req.session.destroy();
  res.redirect('/');
});
module.exports = router;
