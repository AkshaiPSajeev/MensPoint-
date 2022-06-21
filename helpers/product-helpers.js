var db=require('../config/connection');
var collection=require('../config/collections');
const async = require('hbs/lib/async');
const { ObjectId } = require('mongodb');
const { reject } = require('bcrypt/promises');

module.exports={

    addProduct:(product)=>{
        
        return new Promise((resolve,reject)=>{
            product.Offer={
                Status:false,
                Value:0
            }
            db.get().collection('products').insertOne(product).then((data)=>{
            
                resolve(data);
            });

        })
       
    
    },
    
    getAllProducts:()=>{
        return new Promise(async(resolve,reject)=>{
            let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray();
            resolve(products);
        })
    },
    
    deleteProduct:(productId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).remove({_id:ObjectId(productId)}).then((response)=>{
               
                resolve(response);
            });
        });

    },

    getProductDetails:(productId)=>{

      
        return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)}).then((product)=>{
                resolve(product);
                
            });
        });
    },
    updateProduct:(productId,productDetails)=>{
       
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:ObjectId(productId)},{
                $set:{
                    Name:productDetails.Name,
                    Description:productDetails.Description,
                    Price:productDetails.Price,
                    Category:productDetails.Category


                }
            }).then((response)=>{
                resolve();
            })
        })
    },
    
    addCategory:(category)=>{

        return new Promise((resolve,reject)=>{
          
          let categoryObj={
              CategoryName:category.CategoryName,
              Offer:{
                  Status:false,
                  value:0
              },
              Total:0
          }
          db.get().collection(collection.CATEGORY_COLLECTION).insertOne(categoryObj).then((data)=>{
            
            //resolve(data);
        });

        })
        
    },
    getAllCategory:()=>{

        return new Promise(async (resolve,reject)=>{
            let categories=await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray();
            
            resolve(categories);
        })
    },
    updateCategoryCount:(categoryName,count)=>{
        return new Promise(async(resolve,reject)=>{
            let categories=await db.get().collection(collection.CATEGORY_COLLECTION).updateOne({CategoryName:categoryName},{$inc:{Total:count}});
            resolve();
        })
    },
    getProductCategory:(productId)=>{
        return new Promise(async (resolve,reject)=>{
            let product=await db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:ObjectId(productId)});
            resolve(product.Category);
            
        })
    },
    getCategoryDetails:(categoryName)=>{
        return new Promise(async(resolve,reject)=>{
            let category=await db.get().collection(collection.CATEGORY_COLLECTION).find({CategoryName:categoryName}).toArray();
           
            resolve(category[0]);
        })
    },
    updateCategoryOffer:(categoryName,offer)=>{
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.CATEGORY_COLLECTION).updateOne({CategoryName:categoryName},
                {
                    $set:{Offer:{Status:offer.Status,Value:offer.Value}}
                });
                resolve();
        })
    },
    updateProductsOffer:(categoryName,offer)=>{
      
        return new Promise(async(resolve,reject)=>{
            await db.get().collection(collection.PRODUCT_COLLECTION).update({Category:categoryName},
                {
                    $set:{Offer:{Status:offer.Status,Value:offer.Value}}
                },{multi:true});
              
                let m=(offer.Status)?(100-(parseInt(offer.Value)))/100:0;
               
                await db.get().collection(collection.PRODUCT_COLLECTION).update({Category:categoryName},
                    [{
                        $addFields:{
                            "DiscountedPrice":{$multiply:[{$toInt:"$Price"},m]}
                        }
                     } ],
                    {multi:true})
            
                resolve();
        })
    },
    addCoupon:(coupon)=>{
        return new Promise((resolve,reject)=>{
            coupon.Status=true;
            db.get().collection(collection.COUPON_COLLECTION).insertOne(coupon).then(()=>{
                
                resolve();
            })
        })
    },
    getAllCoupons:(skipnum,limitnum)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).find({}).skip(skipnum).limit(limitnum).toArray().then((coupons)=>{
                ;console.log('its here');
                console.log(coupons.length);
                resolve(coupons);
            })
        })
    },
    getRevenuePerDay:()=>{
        return new Promise(async(resolve,reject)=>{
            let result=await db.get().collection(collection.ORDERS_COLLECTION).aggregate([
                {
                    $match:{PaymentStatus:true},
                    
                },
                {
                    $match:{
                        'Status.delivered':true
                    }
                },
                {
                    $sort:{Date:1}
                },
                {
                    $group:{_id:{$dateToString:{format:'%d-%m-%Y',date:'$Date'}},TotalRevenue:{$sum:'$TotalAmount'}}
                }
            ]).toArray()
            let days=[],revenue=[];
            for(let i=0;i<result.length;i++){
                days.push(result[i]._id);
                revenue.push(result[i].TotalRevenue)
            }
            let response={
                days:days,
                revenue:revenue
            }
            console.log(response);
            resolve(response)
        })
    },
    deleteCoupon:(couponId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.COUPON_COLLECTION).updateOne({_id:ObjectId(couponId)},{$set:
            {
                Status:false,StartDate:"",EndDate:""
            }}).then((result)=>{
                resolve(result);
            })
        })
    }

}