/*const { json } = require("body-parser")*/
/*const e = require("connect-flash")*/



function addToCart(productId){
  
  
    $.ajax({
        
      url:'/add-to-cart/'+productId,
      method:'get',
      success:(response)=>{
          if(response.status){
            swal("Item added to cart", "", "success");
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

   console.log(response.orderSummary  )
    document.getElementById(productId).value=quantity+count
    console.log('1');
    document.getElementById(response.productId+'QuantitySummary').innerHTML=quantity+count;
    console.log('2')
    let Price=parseInt(document.getElementById( response.productId+'ProductPriceSummary').innerHTML);
    console.log('3')
    let totalPrice=(quantity+1)*Price;
    
    document.getElementById( response.productId+'TotalPriceSummary').innerHTML=totalPrice;
    console.log('4')
    alert(response.orderSummary.TotalAmount)
    document.getElementById('total').innerHTML=response.orderSummary.TotalAmount;
    console.log('5')


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
     document.getElementById('walletadded').innerHTML=amounttopay;
    
     document.getElementById('wallet').innerHTML=parseInt(document.getElementById('wallet').innerHTML)+total-amounttopay;
   }else{
     document.getElementById('error').innerHTML='invalid coupon code'
   }

 }

 function deleteCoupon(id){
     
  swal({
      title: "Are you sure?",
      text: "Want to delete this coupon?",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
 .then((willDelete) => {
  if (willDelete) {
    $.ajax({
    url:'/admin/delete-coupon/'+id,
    method:'get',
    success:(Status)=>{
    if(Status){
        swal("Coupon deleted!", {
            icon: "success",
        });
        setTimeout(()=>{
          location.reload();
        },1500)
        
    }

  }
  })
  }
 });
}

function addDeliveryAddress(housename, street, city, state, pin, adddressId) {
  //enableDelivery();
  
  document.getElementById('housename').disabled = false;
  document.getElementById('street').disabled = false;
  document.getElementById('city').disabled = false;
  document.getElementById('state').disabled = false;
  document.getElementById('pin').disabled = false;

  document.getElementById('housename').value = housename;
  document.getElementById('street').value = street;
  document.getElementById('city').value = city;
  document.getElementById('state').value = state;
  document.getElementById('pin').value = pin;
  document.getElementById('addressId').value = adddressId;
}

function enableDelivery() {
  document.getElementById('housename').disabled = false;
  document.getElementById('street').disabled = false;
  document.getElementById('city').disabled = false;
  document.getElementById('state').disabled = false;
  document.getElementById('pin').disabled = false;
}

function placeOrder(){
   
  $.ajax({
    url: '/place-order',
    method: 'post',
   
    data: $('#formPlaceOrder').serialize(),
    success: (response) => {
    
      if (response.cod||response.wallet) {
        location.href = '/orders'
      } else if (response.razorpay) {
      

        razorpayPayment(response.razobj)

      } else if (response.paypal) {
        paypalPayment(response.paypalobj)
      }

    }
  })
}

function razorpayPayment(order) {

  var options = {
    "key": "rzp_test_xyQeGOAtqBltrb", // Enter the Key ID generated from the Dashboard
    "amount": order
    .amount, // Amount is in currency subunits. Default currency is INR. Hence, 50000 refers to 50000 paise
    "currency": "INR",
    "name": "Shoppify",
    "description": "Test Transaction",
    "image": "https://example.com/your_logo",
    "order_id": order.id, //This is a sample Order ID. Pass the `id` obtained in the response of Step 1
    "handler": function (response) {
      //alert(response.razorpay_payment_id);
      //alert(response.razorpay_order_id);
      //alert(response.razorpay_signature); 
      verifyPayment(response, order);

    },
    "prefill": {
      "name": "Shoppify",
      "email": "shoppify@gmail.com",
      "contact": "9999999999"
    },
    "notes": {
      "address": "Razorpay Corporate Office"
    },
    "theme": {
      "color": "#3399cc"
    }

  };
  var rzp1 = new Razorpay(options);
  rzp1.open();


}

function paypalPayment(data) {

  for (let i = 0; i < data.links.length; i++) {
    if (data.links[i].rel === 'approval_url') {
      window.location.href = (data.links[i].href);

    }
  }
}

function verifyPayment(payment, order) {

  $.ajax({
    url: '/verify-payment',
    data: {
      payment,
      order
    },
    method: 'post',
    success: (response) => {
      if (response.status) {

        location.href = '/orders'
      } else {
        alert('payment failed')
      }
    }
  })
}

