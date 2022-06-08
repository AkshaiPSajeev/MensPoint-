var db=require('../config/connection');
var collection=require('../config/collections');
const async = require('hbs/lib/async');
const bcrypt=require('bcrypt');
const { response } = require('express');
const { promise, reject } = require('bcrypt/promises');
const { USER_COLLECTION } = require('../config/collections');
const { ObjectId, ServerDescription } = require('mongodb');
const Razorpay = require('razorpay');
const { resolve } = require('path');
const paypal=require('paypal-rest-sdk');


var instance = new Razorpay({
    key_id: 'rzp_test_xyQeGOAtqBltrb',
    key_secret: 'xNG49kyCzlxc54paJByyfiOQ',
  });
 
  paypal.configure({
    'mode': 'sandbox', //sandbox or live
    'client_id': 'AY60GpuzDa4_L-xwL0FhC6NrVgqMy3P94G4Owyv_cP5NgrNIpifWWWu9u3dM_LA6jNX-kE8BxdsRgJH5',
    'client_secret': 'EHRZqBG3lOmtW6j0MhZuC0y5gCNB66jPjJbc_nn9fkjr6gd4oSOLWtHVNH4D3mcXYmw4rEJulIiGaN5F'
  });

module.exports={

    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            userData.Password=await bcrypt.hash(userData.Password,10);
            userData.Status=true;
            if(userData.referal){
                let user=await db.get().collection(collection.USER_COLLECTION).find({_id:ObjectId(userData.referal)},{Wallet:1}).toArray();
                console.log(user[0].Wallet);
                if(user[0].Wallet){
                    await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userData.referal)},
                    
                        {$inc:{Wallet:100}}
                    )
                }else{
                    await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userData.referal)},
                    [{
                        $addFields:{"Wallet":{$toInt:100}}
                    }])
                }
            }
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
                resolve(data.insertedId.toString())
            });
        })
    },

    doLogin:(userData)=>{
        
        return new Promise(async(resolve,reject)=>{
            
            let loginStatus=false;
            let response={};
            let user= await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email});
          
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                       
                        response.user=user;
                        response.status=true;
                        resolve(response);
                    }else{
                        
                        resolve({status:false});
                    }
                })
            }else{
                
                resolve({status:false});
            }
        })
    },
    getAllUsers:()=>{

        return new Promise(async (resolve,reject)=>{

            let users= await db.get().collection(collection.USER_COLLECTION).find().toArray();
            resolve(users);

        })

    },
    getLimitedUsers:(skipnum,limitnum)=>{
        return new Promise(async(resolve,reject)=>{
            let users=await db.get().collection(collection.USER_COLLECTION).find({}).skip(skipnum).limit(limitnum).toArray();
            resolve(users);
        })

    },
    getUser:(userId)=>{
        return new Promise(async (resolve,reject)=>{

            let user= await db.get().collection(collection.USER_COLLECTION).find({_id:ObjectId(userId)}).toArray();
               
                resolve(user)
           
           
        })
    },
    editUser:(userId,name,email)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:ObjectId(userId)},{
                $set:{
                    Name:name,
                    Email:email


                }
            }).then((response)=>{
                resolve();
            })
        })
    },
    blockUser:(userId)=>{

        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:ObjectId(userId)},{
                $set:{
                    Status:false


                }
            }).then((response)=>{
                resolve();
            })
        })

    },
    unblockUser:(userId)=>{

        return new Promise((resolve,reject)=>{
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:ObjectId(userId)},{
                $set:{
                    Status:true


                }
            }).then((response)=>{
                resolve();
            })
        })

    },
    addToCart:(productId,userId)=>{
        let productObject={
            item:ObjectId(productId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({'user':ObjectId(userId)})
            console.log(userCart);
            if(userCart){

                let productExist=userCart.products.findIndex(product=>product.item==productId)
                
                if(productExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({'products.item':ObjectId(productId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }).then(()=>{
                        resolve();
                    })
                }else{
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:ObjectId(userId)},
                    {
                        $push:{
                            products:productObject
                        }
                    }).then((response)=>{
                        resolve();
                    })
                }

               
            }else{
                let cartObj={
                    user:ObjectId(userId),
                    products:[productObject]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }

        })
    },
    getCartProducts:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}

                    }
                }
               
            
            ]).toArray();
            
          
           resolve(cartItems);
          
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count =0;
            let cart =await db.get().collection(collection.CART_COLLECTION).findOne({user:ObjectId(userId)});
            if(cart){
                count=cart.products.length
            }
           
            resolve(count)
        })
    },
    changeProductQuantity:(cartId,productId,count)=>{
        count=parseInt(count);
        return new Promise(async (resolve,reject)=>{
          await  db.get().collection(collection.CART_COLLECTION).updateOne({_id:ObjectId(cartId),'products.item':ObjectId(productId)},
            {
                $inc:{'products.$.quantity':count}
            }).then((response)=>{
               
                resolve({Status:true});
            })
        })
    },
    removeFromCart:(cartId,productId)=>{
        
        return new Promise(async (resolve,reject)=>{
          await  db.get().collection(collection.CART_COLLECTION).updateOne({_id:ObjectId(cartId)},
            {
                $pull:{ products:{item:ObjectId(productId)}}
               
            }).then((response)=>{
               
                resolve();
            })
        })
    },
    getOrderSummary:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    
                    }
                }
              
              
            
            ]).toArray();
            
   
          
                let TotalAmount=0;
                const products=[]
               
               
           for(let i=0;i<cartItems.length;i++){
            let productobj={
                _id:cartItems[i]._id,
                Name:cartItems[i].product.Name,
                Category:cartItems[i].product.Category,
                Price:cartItems[i].product.Price,
                Quantity:cartItems[i].quantity,
                Offer:cartItems[i].product.Offer,
                DiscountedPrice:cartItems[i].product.DiscountedPrice,

            }
          
            if(cartItems[i].product.Offer.Status){
                productobj.TotalProductPrice=cartItems[i].product.DiscountedPrice*cartItems[i].quantity;
                productobj.ReducedPrice=cartItems[i].product.Price-cartItems[i].product.DiscountedPrice;
            }else{
                productobj.TotalProductPrice=cartItems[i].product.Price*cartItems[i].quantity;
                productobj.ReducedPrice=0;
            }
             products.push(productobj);
              
            }
            for(let i=0;i<products.length;i++){
                if(products[i].Offer.Status){
                 
                    TotalAmount=TotalAmount+(products[i].DiscountedPrice*products[i].Quantity);
                }else{
                   
                    TotalAmount=TotalAmount+(products[i].Price*products[i].Quantity);
                }
            }
         
            let orderSummaryobj={
               Products:products,
               TotalAmount:TotalAmount
    
            }
    
            resolve(orderSummaryobj);
        })
       

    },
    getTotalCartAmount:(userId)=>{
        return new Promise(async (resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    
                    }
                }
              
              
            
            ]).toArray();
    
           
                let TotalAmount=0;
             
            for(i=0;i<cartItems.length;i++){
                TotalAmount=TotalAmount+cartItems[i].quantity*cartItems[i].product.Price;
            }
            resolve(TotalAmount);
        })
    },
    addAddress:(addressObj,userId)=>{
        return new Promise(async(resolve,reject)=>{
            let address={
                HouseName:addressObj.HouseName,
                Street:addressObj.Street,
                City:addressObj.City,
                State:addressObj.State,
                Pin:addressObj.Pin,
                user:ObjectId(userId)
              }
            db.get().collection(collection.ADDRESS_COLLECTION).insertOne(address).then((response)=>{
                
           
                resolve(response.insertedId.toString())
            })
        })
    },
    
    getUserAddresses:(userId)=>{
        return new Promise(async (resolve,reject)=>{
          let result=  await db.get().collection(collection.USER_COLLECTION).aggregate([
              {
                $match:{_id:ObjectId(userId)}
              },
                {
                    $lookup:{
                        from:collection.ADDRESS_COLLECTION,
                        localField:"_id",
                        foreignField:"user",
                        as:"addresses"
                    }
                }
            ]).toArray()
            
            let addresses=result[0].addresses;
           resolve(addresses);
        })
    },
    getAddress:(addressId)=>{

        return new Promise(async(resolve,reject)=>{
            let address= await db.get().collection(collection.ADDRESS_COLLECTION).findOne({_id:ObjectId(addressId)});
        
            resolve(address);
        })
    },
    editAddress:(addressId,address)=>{

        return new Promise(async(resolve,reject)=>{
             await db.get().collection(collection.ADDRESS_COLLECTION).updateOne({_id:ObjectId(addressId)},
            {
                $set:{
                    HouseName:address.HouseName,
                    Street:address.Street,
                    City:address.City,
                    Pin:address.Pin
                }
            }
            );
        
            resolve();
        })
    },
    deleteAddress:(addressId)=>{

        return new Promise(async(resolve,reject)=>{
             await db.get().collection(collection.ADDRESS_COLLECTION).remove({_id:ObjectId(addressId)});
        
            resolve();
        })
    },
    updatePassword:(userId,currentPassword,newPassword)=>{

        return new Promise(async(resolve,reject)=>{
            
          
            let status=false;
            let user= await db.get().collection(collection.USER_COLLECTION).findOne({_id:ObjectId(userId)});
            
            bcrypt.compare(currentPassword,user.Password).then(async(status)=>{
                    if(status){
                        let encryptedPassword=await bcrypt.hash(newPassword,10);
                        await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId)},
                        {
                            $set:{
                                Password:encryptedPassword
                            }
                        })
                         status=true;
                        resolve(status);
                    }else{
                        resolve(status);
                    }
               })
            
        })
    },
    placeOrder:(userId,orderRequest)=>{

      
        

        return new Promise(async(resolve,reject)=>{

          

            let addressObj={
                HouseName:orderRequest.HouseName,
                Street:orderRequest.Street,
                City:orderRequest.City,
                State:orderRequest.State,
                Pin:orderRequest.Pin
            }

            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:ObjectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
    
                    }
                }
            ]).toArray();
       
            let products=[];
            let productObj={};
            let TotalAmount=0;
            for (let i=0;i<cartItems.length;i++){
                productObj=cartItems[i].product
                productObj.quantity=cartItems[i].quantity;
                products.push(productObj);
            }
            for(let i=0;i<products.length;i++){
                if(products[i].Offer.Status){
                    TotalAmount=TotalAmount+(products[i].DiscountedPrice*products[i].quantity);
                }else{
                    TotalAmount=TotalAmount+(products[i].Price*products[i].quantity);
                }
            }
            let PaymentStatus='';
            let PaymentMode={
                COD:false,
                Razorpay:false,
                Paypal:false
            }
            if(orderRequest.PaymentMode==="COD"){
                PaymentStatus=false;
                PaymentMode.COD=true;
            }else if(orderRequest.PaymentMode==='Razorpay'){
                PaymentMode.Razorpay=true;
                PaymentStatus=false;
            }else if(orderRequest.PaymentMode==='Paypal'){
                PaymentMode.Paypal=true;
                PaymentStatus=false;
            }
            if(orderRequest.couponId){
                let coupon=await db.get().collection(collection.COUPON_COLLECTION).findOne({_id:ObjectId(orderRequest.couponId)});
                TotalAmount=(100-coupon.OfferValue)*TotalAmount/100;
                let userusedcoupons=await db.get().collection(collection.USED_COUPON_COLLECTION).findOne({user:ObjectId(userId)});
                if(userusedcoupons){
                    await db.get().collection(collection.USED_COUPON_COLLECTION).updateOne({user:ObjectId(userId)},
                    {
                        $push:{
                            coupon:ObjectId(orderRequest.couponId)
                        }
                    })
                }else{
                    let usedCoupon={
                        coupon:[ObjectId(orderRequest.couponId)],
                        user:ObjectId(userId)
                    }
                    db.get().collection(collection.USED_COUPON_COLLECTION).insertOne(usedCoupon);
                }
        
            }
            let order={
                User:ObjectId(userId),
                Address:addressObj,
                Products:products,
                TotalAmount:TotalAmount,
                PaymentMode:PaymentMode,
                PaymentStatus:PaymentStatus,
                Status:{
                    placed:true,
                    dispatched:false,
                    delivered:false,
                    cancelled:false
                },
                Date:new Date()
            }

            db.get().collection(collection.ORDERS_COLLECTION).insertOne(order).then((response)=>{
               
                db.get().collection(collection.CART_COLLECTION).remove({user:ObjectId(userId)}).then(()=>{
                    resolve(response.insertedId.toString());
                })

            })

        })

     

        
        
    },
    getUserOrders:(userId,startFrom,perPage)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDERS_COLLECTION).find({User:ObjectId(userId)}).sort({Date:-1}).skip(startFrom).limit(perPage).toArray();
            resolve(orders);
        })
    },
    cancelOrder:(orderId,userId)=>{

        return new Promise(async(resolve,reject)=>{
        
            let order=await db.get().collection(collection.ORDERS_COLLECTION).find({_id:ObjectId(orderId)},{_id:0,TotalAmount:1}).toArray();
            let amount=parseInt(order[0].TotalAmount)
            let user=await db.get().collection(collection.USER_COLLECTION).find({_id:ObjectId(userId)}).toArray();
            if(user[0].Wallet){
                await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId)},
                
                    {$inc:{Wallet:amount}}
                )
            }else{
                await db.get().collection(collection.USER_COLLECTION).updateOne({_id:ObjectId(userId)},
                [{
                    $addFields:{"Wallet":amount}
                }])
            }
          
            await db.get().collection(collection.ORDERS_COLLECTION).updateOne({_id:ObjectId(orderId)},
            {
                $set:{Status:{placed:false,dispatched:false,cancelled:true,delivered:false}}
            });
            resolve();
        })
    },
    getAllOrders:(startFrom,perPage)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{}
                },
                {
                    $sort:{Date:-1}
                },
                {
                   
                    $lookup:{
                        from:collection.USER_COLLECTION,
                        localField:'User',
                        foreignField:'_id',
                        as:'userDetails'
                    }
                },
              
            ]).skip(startFrom).limit(perPage).toArray();
          
            resolve(orders);
        })
    },
    updateOrderDispatch:(orderId)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.ORDERS_COLLECTION).update({_id:ObjectId(orderId)},
            {
                $set:{
                    Status:{dispatched:true,placed:false,cancelled:false,delivered:false}
                }

            }).then((response)=>{
                //resolve();
            })
        })
    },
    updateOrderDelivered:(orderId)=>{
        return new Promise((resolve,reject)=>{

            db.get().collection(collection.ORDERS_COLLECTION).update({_id:ObjectId(orderId)},
            {
               
                $set:{PaymentStatus:true,Status:{dispatched:false,delivered:true,cancelled:false,placed:false}}

            }).then((response)=>{
                //resolve();
            })
        })
    },
    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{
           // var instance = new Razorpay({ key_id: 'YOUR_KEY_ID', key_secret: 'YOUR_SECRET' })

           var options={
               amount:total*100,//here total
               currency:"INR",
               receipt:orderId
           };
            instance.orders.create(options,function(err,order){
                if(err){
                    console.log(err);
                }else{
                    console.log('Neworder',order);
                    resolve(order)
                }
               
            })
         })
    },
    verifyPayment:(details)=>{
        return new Promise((resolve,reject)=>{
            const crypto=require('crypto');
            let hmac=crypto.createHmac('sha256','xNG49kyCzlxc54paJByyfiOQ');
            hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
            hmac=hmac.digest('hex');
            if(hmac==details['payment[razorpay_signature]']){
                resolve()
            }else{
                reject()
            }
        })
    },
    changePaymentStatus:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDERS_COLLECTION).updateOne({_id:ObjectId(orderId)},{

                $set:{
                    PaymentStatus:true
                }
            }).then(()=>{
                resolve()
            })
        })
    },
    generatePaypal:(orderId,total)=>{
        return new Promise((resolve,reject)=>{

            var create_payment_json = {
                "intent": "sale",
                "payer": {
                    "payment_method": "paypal"
                },
                "redirect_urls": {
                    "return_url": "http://localhost:3000/orders",
                    "cancel_url": "http://localhost:3000/"
                },
                "transactions": [{
                    "item_list": {
                        "items": [{
                            "name": orderId,
                            "sku": "item",
                            "price": total,
                            "currency": "USD",
                            "quantity": 1
                        }]
                    },
                    "amount": {
                        "currency": "USD",
                        "total": total
                    },
                    "description": "This is the payment description."
                }]
            };

            paypal.payment.create(create_payment_json, function (error, payment) {
                if (error) {
                    throw error;
                } else {
                   
                    resolve(payment)
                }
            });
        })
    },

    getTotalSalesAmount:()=>{
        return new Promise(async(resolve,reject)=>{
          
        let totalSalesObj=await  db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{PaymentStatus:true}
                },
                {
                 $group:{_id:{},totalSales:{$sum:'$TotalAmount'}}
                }
            ]).toArray()

          
            resolve(totalSalesObj[0].totalSales);
           
            
           
           

        })
    },
    getAvailableCoupons:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let userUsedCoupons=await db.get().collection(collection.USED_COUPON_COLLECTION).find({user:ObjectId(userId)}).toArray();
           if(userUsedCoupons.length==0){
                let coupons=await db.get().collection(collection.COUPON_COLLECTION).find({}).toArray();
                resolve(coupons);
            }else{
               
                let coupons=await db.get().collection(collection.USED_COUPON_COLLECTION).aggregate([
                    {
                        $match:{user:ObjectId(userId)}
                    }
                ]).toArray()
                let used=coupons[0].coupon;
                let unUsedCoupons=await db.get().collection(collection.COUPON_COLLECTION).find({_id:{$nin:used}}).toArray();
                resolve(unUsedCoupons);
            }
        })
    },
    getOrderAmount:(orderId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDERS_COLLECTION).findOne({_id:ObjectId(orderId)}).then((order)=>{
              
                resolve(order.TotalAmount);
            
            })
        })
    },
    getTotalUserOrders:(userId)=>{

        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDERS_COLLECTION).find({User:ObjectId(userId)}).count().then((total)=>{
                resolve(total);
            })
        })

    },
    getTotalOrders:()=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.ORDERS_COLLECTION).find({}).count().then((total)=>{
                resolve(total);
            })
        })
    },
    viewOrderedItems:(orderId)=>{
        return new Promise((resolve,reject)=>{
            
            db.get().collection(collection.ORDERS_COLLECTION).findOne({_id:ObjectId(orderId)}).then((items)=>{
                
                resolve(items)
            })
        })
    },
    generateInvoice:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
          
            let order=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{_id:ObjectId(orderId)}
                },
                {
                    $lookup:{
                        from:'users',
                        localField:'User',
                        foreignField:'_id',
                        as:'User'
                    }
                }
            ]).toArray();
   
            const invoice = {
                shipping: {
                  name: order[0].User[0].Name,
                  address: order[0].Address.HouseName,
                  city: order[0].Address.City,
                  state: order[0].Address.State,
                  country: "India",
                  postal_code:order[0].Address.Pin
                },
                items: [...order[0].Products],
                subtotal: order[0].TotalAmount,
               
                invoice_nr: orderId
              };
            
              resolve(invoice)
        })
        

    },
    getPaymentCounts:()=>{
        return new Promise(async(resolve,reject)=>{
           
            let paypal=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{'PaymentMode.Paypal':true}
                }
            ]).toArray();
            let cod=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{'PaymentMode.COD':true}
                }
            ]).toArray();
            let razorpay=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{'PaymentMode.Paypal':true}
                }
            ]).toArray();
            let counts=[paypal.length,cod.length,razorpay.length];
            resolve(counts);

        })
    },
    getSalesReport:(range)=>{
        return new Promise(async(resolve,reject)=>{
      
            let from=new Date(range.From);
            let to=new Date(range.To);
            let orders=await db.get().collection(collection.ORDERS_COLLECTION).aggregate(
                [
                    {
                        $match:{Date:{$gte:from,$lte:to}}
                    },
                    {
                        $match:{PaymentStatus:true}
                    },
                    {
                        $group:{_id:{},totalSales:{$sum:'$TotalAmount'}}
                    }
                ]
            ).toArray();
            let totalOrders=await db.get().collection(collection.ORDERS_COLLECTION).aggregate(
                [
                    {
                        $match:{Date:{$gte:from,$lte:to}}
                    },
                    {
                        $match:{PaymentStatus:true}
                    },
                    {
                       $count:'totalOrdersDelivered'
                    }
                ]
            ).toArray();
           
            let totalrevenue=orders[0].totalSales;
            let totalOrdersDelivered=totalOrders[0].totalOrdersDelivered;
            let salesReport={
                from:new Date(from),
                to:new Date(to),
                revenueGenerated:totalrevenue,
                ordersDelivered:totalOrdersDelivered

            }
        
            resolve(salesReport);

        })
    }

}