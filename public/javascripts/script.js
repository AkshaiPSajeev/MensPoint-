/*const { json } = require("body-parser")*/
/*const e = require("connect-flash")*/



function addToCart(productId){
  
  
    $.ajax({
        
      url:'/add-to-cart/'+productId,
      method:'get',
      success:(response)=>{
          if(response.status){
            let count=$('#cart-count').html()
            count=parseInt(count)+1
            
            $('#cart-count').html(count)
          } 
       
      
      }
    })
  }

  function changeQuantity(cartId,productId,userId,count){
 
    let quantity=parseInt(document.getElementById(productId).value)
    if(quantity<=1){
      document.getElementById('minusbutton'+productId).disabled=true;
     
    }else{
      document.getElementById('minusbutton'+productId).disabled=false;
    }
    if(quantity<=1&& count==-1){
      return;
    }
   $.ajax({
      
      url:'/change-product-quantity/',
   data:{
     cart:cartId,
     product:productId,
     count:count,
     userId:userId
   },
   method:'post',
   success:(response)=>{

   /* alert(response.orderSummary.Products.length)*/
    document.getElementById(productId).value=quantity+count
    document.getElementById(productId+'QuantitySummary').innerHTML=quantity+count;
    let Price=parseInt(document.getElementById(productId+'ProductPriceSummary').innerHTML);
    let totalPrice=(quantity+1)*Price;
    
    document.getElementById(productId+'TotalPriceSummary').innerHTML=totalPrice;
    alert(response.orderSummary.TotalAmount)
    document.getElementById('total').innerHTML=response.orderSummary.TotalAmount;

   }
   })
  
 }


 function addSubCategory(){
   let counter=Date.now();
   let html='<div class="form-group">\
   <label for="">Enter SubCategory</label>\
   <input type="text" class="form-control w-50" name="SubCategory'+counter+'"  id="SubCategory'+counter+'">\
</div>'
var form=document.getElementById('addSubCategory');
form.innerHTML+=html;


 }

 function populateSubCategory(categories){
 
  let categoryselected=document.getElementById('CategorySelected').value
  let cat=JSON.parse(categories);
  alert('sfdsgdbf')
  let subcategories=[];
  for(let i=0;i<categories.length;i++){
    if(categories[i].CategoryName==categoryselected){
      for(let j=0;i<categories[i].Subcategory.length();i++){
        subcategories.push(categories[i].Subcategory[j])
      }
    }
  }
  

 }

 function checkCoupon(){
  
   let couponcode=document.getElementById('coupon').value;
   let coupons=document.getElementById('coupons').value;
   let couponvalid=false;
  
    coupons=JSON.parse(coupons);
  let discount=0;
   for(i=0;i<coupons.length;i++){
      
     if(coupons[i].CouponCode==couponcode){
   
       document.getElementById('couponid').value=coupons[i]._id;
       discount=coupons[i].OfferValue;
       couponvalid=true;
       break;
     }
   }
   if(couponvalid){
    
      document.getElementById('discountdisplaytag').style.display='block';
      document.getElementById('discountdisplayamount').style.display='block';
     document.getElementById('discountedAmount').innerHTML=discount;
     let total=parseInt(document.getElementById('total').innerHTML);
     let amounttopay=total*(100-discount)/100;
     document.getElementById('amounttopay').innerHTML=amounttopay;
   }else{
     document.getElementById('error').innerHTML='invalid coupon code'
   }

 }
 

