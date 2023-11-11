// var express = require('express');
// var ejs = require('ejs');
// var bodyParser = require('body-parser');
// var mysql = require('mysql');

// mysql.createConnection({
//     host: 'localhost',
//     user: 'root',
//     password: "",
//     database: 'food_industry_project'
// })
// var app = express();
// app.use(express.static('public'));
// app.set('view engine', 'ejs');

// app.listen(8080);
// app.use(bodyParser.urlencoded({extended:true}));
// app.get('/', function(req, res){
//    var con =  mysql.createConnection({
//         host: 'localhost',
//         user: 'root',
//         password: "",
//         database: 'food_industry_project'
//     })
//     con.query("SELECT * products",(err,result)=>{
//         res.render('pages/index',{result:result});
//     })
  
// });

var express = require('express');
var ejs = require('ejs');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
// Create a MySQL connection pool for reusing connections
var pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'food_industry_project'
});

var app = express();
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.listen(8081);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({secret:"secret"}));

function isProductInCart(cart,id){
for(var i=0; i<cart.length; i++){
    if(cart[i].id == id){
        return true;
    }
}
return false;
}
// function calculateTotal(cart,quantity,res){
//     total = 0;
//     for(var i=0; i<cart.length; i++){
//    // if we are offering a discount price
//       if(cart[i].sale_price){
//         total = total + (cart[i].sale_price* cart[i]*quantity * quantity);
//       }  else{
//         total = total + (cart[i].price * cart[i].quantity * quantity);

//       }
//     }
//     res.session.total = total;
//     return total;

// }
function calculateTotal(cart, quantity, res) {
    var total = 0; // Declare 'total' variable and 'quantity' variable here
    
    for (var i = 0; i < cart.length; i++) {
        // if we are offering a discount price
        if (cart[i].sale_price) {
            total = total + (cart[i].sale_price * cart[i].quantity * quantity);
        } else {
            total = total + (cart[i].price * cart[i].quantity * quantity);
        }
    }
    res.session.total = total;
    return total;
}

app.get('/', function (req, res) {
    
    pool.getConnection(function (err, connection) {
        if (err) {
            console.error('Error connecting to MySQL:', err);
            return res.status(500).send('Database connection error');
        }

        
        connection.query('SELECT * FROM products', function (err, result) {
            
            connection.release();

            if (err) {
                console.error('Error executing SQL query:', err);
                return res.status(500).send('Database query error');
            }

            res.render('pages/index', { result: result });
        });
    });
});


app.post('/add_to_cart',function (req, res) {
    var id = req.body.id;
    var name = req.body.name;
    var price = req.body.price; 
    var quantity = req.body.quantity;
    var image = req.body.image;
    var sale_price = req.body.sale_price; 
    var product = {id:id, name:name, price:price, sale_price:sale_price, quantity:quantity, image:image};

    if(req.session.cart){
        var cart = req.session.cart;
        if(isProductInCart(cart,id)){
            cart.push(product);
        }
    }else{
        req.session.cart = [product];
        var cart = req.session.cart;
    }
   calculateTotal(cart,quantity,req); 
   res.redirect('/cart');
});

app.get('/cart',function(req,res){
var cart = req.session.cart;
var total = req.session.total;
res.render('pages/cart',{cart:cart,total:total});
});

app.post('/edit_product_quantity',function(req,res){
  console.log(req.body);
  var id = req.body.id;
  var quantity = req.body.quantity;
  var increase_btn = req.body.increase_product_quantity;
  var decrease_btn = req.body.decrease_product_quantity;

   var cart = req.session.cart;
   if(increase_btn){
    for(let i=0; i<cart.length;i++)
    {
        if(cart[i].id == id){
            if(cart[i].quantity > 0){
                cart[i].quantity = parseInt(cart[i].quantity)+1;
            }
        }
    }
   }
   if(decrease_btn){
    for(let i=0; i<cart.length;i++)
    {
        if(cart[i].id == id){
            if(cart[i].quantity > 1){
                cart[i].quantity = parseInt(cart[i].quantity)-1;
            }
        }
    }
   }
   calculateTotal(cart,quantity,req);
   res.redirect('/cart');
})
              


app.post('/checkout', function(req, res)
{
    var total = req.session.total

 res.render('pages/checkout',{total: total});
})

app.post('/place_order',function(req, res)
{
var name = req.body.name;
var email = req.body.email;
var phone = req.body.phone;
var city = req.body.city;
var address = req.body.address;
var cost = req.session.total;
var status = "not paid";
var date = new Date();
var products_ids ="";
var cart = req.session.cart;
for(let i=0; i<cart.length; i++){
    products_ids = products_ids + "," +cart[i].id;
}
pool.getConnection(function (err, connection) {
    if (err) {
      console.log(err);
      return res.status(500).send('Error acquiring connection from pool');
    }

    var query = "INSERT INTO orders (cost, name, email, status, city, address, phone, date , products_ids) VALUES ?";
    var values = [
      [cost, name, email, status, city, address, phone, date ,products_ids]
    ];

    connection.query(query, [values], function (err, result) {
      if (err) {
        console.log(err);
        return res.status(500).send('Error executing SQL query');
      }

      res.redirect('/payment');
      connection.release(); 
    });
  });
});

app.get('/payment', function (req, res) {
  res.render('pages/payment');
});