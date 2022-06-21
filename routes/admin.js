var express = require('express');
const req = require('express/lib/request');
const { redirect } = require('express/lib/response');
const res = require('express/lib/response');
var router = express.Router();
var productHelpers=require('../helpers/product-helpers');
var userHelpers=require('../helpers/user-helpers')
const flash=require('connect-flash');
const e = require('connect-flash');
const async = require('hbs/lib/async');


const verifyLogin=(req,res,next)=>{
  if(req.session.admin){
    next();
  }else{
    res.redirect('/admin');
  }
}

router.get('/', function(req, res, next) {
 if(req.session.user){
    res.redirect('/admin/adminhome')
  }else{
    message=req.session.message;
    res.render('admin/adminlogin',{message,loginPage:true})
  
  }
});

router.post('/', function(req, res, next) {
   if(req.body.Email=="admin@gmail.com"&&req.body.Password=="aaa"){
    req.session.user="admin";
    req.session.admin=true;
    res.redirect('admin/adminhome');
   }else{
    req.session.message="invalid email or password";
    res.redirect('/admin');
  }
});

router.get('/adminhome',verifyLogin,async function(req, res) {
  let totalSales=await userHelpers.getTotalSalesAmount();
  let paymentCounts=await userHelpers.getPaymentCounts();
  let totalOrders=await userHelpers.getTotalOrders();
  let users=await userHelpers.getAllUsers();
  let result=await productHelpers.getRevenuePerDay();
  console.log(result);
  console.log(typeof(result.revenue[0]));
  console.log(result.days[1])
   res.render('admin/admin-home',{admin:true,totalSales:totalSales,adminHome:true,paymentCounts,totalOrders,users:users.length,days:result.days,revenue:result.revenue});
});

router.get('/product-management',verifyLogin, function(req, res, next) {
  productHelpers.getAllProducts().then((products)=>{
  res.render('admin/product-management',{admin:true,products});
  });
});

router.get('/add-product',verifyLogin,async(req,res,next)=>{
  let categories=await productHelpers.getAllCategory();
 
  res.render('admin/add-product',{admin:true,categories});
});

router.post('/add-product',async(req,res)=>{

  await productHelpers.updateCategoryCount(req.body.Category,1);

  
 productHelpers.addProduct(req.body).then((id)=>{
  let image=req.files.imagepath;
  image.mv('./public/product-images/'+id+'.jpg',(err,done)=>{
    if(!err){
      res.redirect('/admin/product-management');
    }else{
      console.log(err);
    }
  })
 })
});

router.get('/delete-product',verifyLogin,async(req,res,next)=>{
 let productId=req.query.id;
 let CategoryName=await productHelpers.getProductCategory(productId);
  await productHelpers.updateCategoryCount(CategoryName,-1);
  productHelpers.deleteProduct(productId).then((response)=>{
    res.redirect('/admin/product-management');
  })
});

router.get('/edit-product',verifyLogin, async (req,res,next)=>{
 let productId=req.query.id;
 let product=await productHelpers.getProductDetails(productId);
 res.render('admin/edit-product',{product,admin:true});
});

router.post('/edit-product/:productId',(req,res)=>{
 productHelpers.updateProduct(req.params.productId,req.body).then(()=>{
  res.redirect('/admin/product-management');
   
    if(req.files!=null){
      let image=req.files.imagepath;
      image.mv('./public/product-images/'+req.params.productId+'.jpg');
    }
  })
}); 

router.get('/user-management',(req,res)=>{
  userHelpers.getAllUsers().then(async(allUsers)=>{
    let perPage=5;//total page=>perpage
    let totalpages=Math.ceil(allUsers.length/perPage);//perpage=>totalpages
   
    let pageNumber=(req.query.page==null)?1:req.query.page;
    let startIndex=perPage*(pageNumber-1);
    let startFrom=(pageNumber-1)*perPage;
    let users=await userHelpers.getLimitedUsers(startFrom,perPage);
    if(totalpages==1){
      totalpages=null;
    }
    res.render('admin/user-management',{admin:true,users,totalpages,startIndex});
   });
});

router.get('/block', async (req,res,next)=>{
 let userId=req.query.id;
 userHelpers.blockUser(userId).then(()=>{
  res.redirect('/admin/user-management')
 })
 
 
});

router.get('/unblock', async (req,res,next)=>{
 let userId=req.query.id;
 userHelpers.unblockUser(userId).then(()=>{
  res.redirect('/admin/user-management')
 })
});

router.get('/orders',verifyLogin,async(req,res)=>{
  
  let totalOrders=await userHelpers.getTotalOrders();
  
  let perPage=5;//total page=>perpage
  let totalpages=Math.ceil(totalOrders/perPage);//perpage=>totalpages
 
  let pageNumber=(req.query.page==null)?1:req.query.page;
  let startIndex=perPage*(pageNumber-1);
  let startFrom=(pageNumber-1)*perPage;
  let orders=await userHelpers.getAllOrders(startFrom,perPage);
  
  if(totalpages==1){
    totalpages=null;
  }
  res.render('admin/orders',{orders:orders,admin:true,totalpages:totalpages,startIndex})
})

router.get('/dispatch-order/:orderId',(req,res)=>{
  userHelpers.updateOrderDispatch(req.params.orderId);
  res.redirect('/admin/orders')
})
router.get('/delivered-order/:orderId',(req,res)=>{
  userHelpers.updateOrderDelivered(req.params.orderId);
  res.redirect('/admin/orders')
})

router.get('/add-category',(req,res)=>{
  res.render('admin/add-category',{admin:true});
})

router.post('/add-category',(req,res)=>{

 productHelpers.addCategory(req.body);
 res.redirect('/admin/show-category');
})

router.get('/show-category',async(req,res)=>{
  let categories= await productHelpers.getAllCategory();
  res.render('admin/show-category',{categories:categories,admin:true});
})
router.get('/add-offer/:CategoryName',async(req,res)=>{
  let category=await productHelpers.getCategoryDetails(req.params.CategoryName);
  res.render('admin/add-categoryOffer',{category:category,admin:true});
})

router.post('/add-categoryOffer',async(req,res)=>{
  
  
  let offer={
    Status:true,
    Value:req.body.OfferValue
  }
  
  await productHelpers.updateCategoryOffer(req.body.CategoryName,offer);
  await productHelpers.updateProductsOffer(req.body.CategoryName,offer);
  res.redirect('/admin/show-category');
})

router.get('/withdraw-offer/:CategoryName',async(req,res)=>{

  let offer={
    Status:false,
    Value:0
  }
  await productHelpers.updateCategoryOffer(req.params.CategoryName,offer);
  await productHelpers.updateProductsOffer(req.params.CategoryName,offer);
  res.redirect('/admin/show-category');
})

router.get('/add-coupon',verifyLogin,(req,res)=>{
  let mindate=new Date().toISOString().split('T')[0];

  res.render('admin/add-coupon',{admin:true,mindate:mindate});
})

router.post('/add-coupon',async(req,res)=>{

  await productHelpers.addCoupon(req.body);
  res.redirect('/admin/adminhome')

})

router.get('/sales-report',verifyLogin,(req,res)=>{
  let reportObj=null
  if(req.session.reportObj){
    reportObj=req.session.reportObj;
  }
  req.session.reportObj=null;
res.render("admin/sales-report",{admin:true,reportObj})
})

router.post('/sales-report',async(req,res)=>{

  let reportObj=await userHelpers.getSalesReport(req.body);
  req.session.reportObj=reportObj;
  console.log(reportObj);
  res.redirect('/admin/sales-report');
  /*res.render('admin/sales-report',{admin:true,reportObj})*/
  

})

router.get('/coupons',async(req,res)=>{
  let result=await productHelpers.getAllCoupons(0,0);
  let totalCoupons=result.length;
  console.log('tatal coupons='+totalCoupons);
  let perPage=6;
  let totalpages=Math.ceil(totalCoupons/perPage);
  let pageNumber=req.query.page?req.query.page:1;
  let startFrom=(pageNumber-1)*perPage;
  let coupons=await productHelpers.getAllCoupons(startFrom,perPage);
  let startIndex=perPage*(pageNumber-1);
  res.render('admin/coupons',{coupons,admin:true,totalpages,startIndex})
})

router.get('/delete-coupon/:couponId',async(req,res)=>{
  console.log('reached here');
  let status=await productHelpers.dnpmeleteCoupon(req.params.couponId);
  res.json(status);
})

router.get('/view-order-details/:orderId',async(req,res)=>{
  let order=await userHelpers.viewOrderedItems(req.params.orderId);
  console.log(order);
  let user=await userHelpers.getUser(order.User);
  console.log(user);
  res.render('admin/view-order-details',{admin:true,items:order,user:user[0]})
})



router.get('/logout',(req,res)=>{
  req.session.destroy();
  res.redirect('/admin');
});



module.exports = router;
