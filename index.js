const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const multer = require("multer");
const storage = multer.diskStorage({
  //this is for multer
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, "public");
    return cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    req.image = `${Date.now()}${file.originalname}`;
    return cb(null, `${Date.now()}${file.originalname}`);
  },
});
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB, adjust the size limit as needed
  },
});
const nodemailer = require("nodemailer");
const transporter = nodemailer.createTransport({
  host: "smtp.ethereal.email",
  port: 587,
  secure: false, // `true` for port 465, `false` for all other ports
  auth: {
    user: "maddison53@ethereal.email",
    pass: "jn7jnAPss4f63QBp6D",
  },
});
//////for razorpay
const Razorpay = require("razorpay");
var instance = new Razorpay({
  key_id: "rzp_test_PlxVDRwT83pnDt",
  key_secret: "XInbEYIZ516IMJhATTGGF5Mg",
});

const crypto = require("crypto");

function hmac_sha256(data, key) {
  const hmac = crypto.createHmac("sha256", key);
  hmac.update(data);
  return hmac.digest("hex");
}
///////
mongoose.connect(
  "mongodb+srv://shekharsudhanshu018:ytCvlSHh7HpmGKKI@cluster0.g6knmyq.mongodb.net/Ecommerce"
);
const User = mongoose.model("User", {
  email: String,
  password: String,
  name: String,
  address: {
    type: String,
    default: "",
  },
  gender: {
    type: String,
    default: "",
  },
  phoneNumber: {
    type: String,
    default: "1234567899",
  },
  image: {
    type: String,
    default: "../Assets/user.png",
  },
  cart: [
    {
      productName: String,
      productCompany: String,
      productPrice: Number,
      productDescription: String,
      productImage: String,
      productFreq: {
        type: Number,
        default: 1,
      },
    },
    [],
  ],
  productListed: [
    {
      productName: String,
      productCompany: String,
      productPrice: Number,
      productDescription: String,
      productImage: String,
    },
  ],
  puchasedProducts: [
    {
      productName: String,
      productCompany: String,
      productPrice: Number,
      productDescription: String,
      productImage: String,
      productFreq: {
        type: Number,
        default: 1,
      },
    },
    [],
  ],
});
const product_schema = mongoose.model("product_schema", {
  productCompany: String,
  productName: String,
  productDescription: String,
  productPrice: Number,
  productImage: String,
  productReview: [
    {
      username: String,
      comment: String,
    },
  ],
});

const app = express();
const PORT = 3000;
const JWT_KEY = "1234567";
app.use(express.json());
app.use(cors({ origin: "https://mern-front-end-ecommerce.vercel.app" }));

////////////////////////////////////////////MIDDLEWARES///////////////////////////////////////////////
async function isUserExistSignIn(req, res, next) {
  const user_email = req.headers.email;
  const user_password = req.headers.password;
  const existingUser = await User.findOne({
    email: user_email,
    password: user_password,
  });
  if (existingUser) next();
  else {
    res.status(400).end();
  }
}
async function isUserExistSignUp(req, res, next) {
  const user_email = req.headers.email;
  const existingUser = await User.findOne({
    email: user_email,
  });
  if (existingUser) res.status(400).end();
  else {
    next();
  }
}
async function isUserExistForgotPassword(req, res, next) {
  const user_email = req.query.email;
  const existingUser = await User.findOne({
    email: user_email,
  });
  if (existingUser) {
    next();
  } else {
    res.status(404).end();
  }
}

//token verification
function token_verification(req, res, next) {
  const token = req.headers.authorization;
  const decoded_value = jwt.verify(token, JWT_KEY);
  if (decoded_value == null) {
    res.status(401).end();
  } else {
    req.userName = decoded_value.name;
    req.userEmail = decoded_value.email;
    next();
  }
}
////////////////////////////////////////////ROUTES////////////////////////////////////////////////////
app.get("/sign_in", isUserExistSignIn, async function (req, res) {
  const user_email = req.headers.email;
  const user_password = req.headers.password;
  const existingUser = await User.findOne({
    email: user_email,
  });
  const username = existingUser.name;
  const user = { name: username, email: user_email };
  let token = jwt.sign(user, JWT_KEY);
  res.status(200).json({ token: token });
});

app.post("/sign_up", isUserExistSignUp, function (req, res) {
  const user_email = req.headers.email;
  const user_password = req.headers.password;
  const user_name = req.headers.name;
  User.create({
    email: user_email,
    password: user_password,
    name: user_name,
  });
  res.status(200).end();
});

app.post(
  "/forgot_password",
  isUserExistForgotPassword,
  async function (req, res) {
    const user_email = req.query.email;
    const subject = "Password Reset";
    const text = "hello this is me";
    // Send email
    try {
      await transporter.sendMail({
        from: "randhirias@gmail.com",
        user_email,
        subject,
        text,
      });
      res.status(200).end();
    } catch (error) {
      console.error(error);
      res.status(500).end();
    }
  }
);

app.get("/user/cart", token_verification, async function (req, res) {
  res.status(200).end();
});

app.post("/product_overview", token_verification, async function (req, res) {
  const productName = req.body.productName;
  const product_datail = await product_schema.findOne({
    productName: productName,
  });
  res.status(200).json(product_datail);
});

app.post("/sell", token_verification, async function (req, res) {
  console.log(req.body);
  try {
    const productName = req.body.productName;
    const productCompany = req.body.productCompany;
    const productPrice = req.body.productPrice;
    const productDescription = req.body.productDescription;
    const productImage = req.body.productImage;

    // Use await to make sure the document is saved before sending the response
    await product_schema.create({
      productName: productName,
      productCompany: productCompany,
      productPrice: productPrice,
      productDescription: productDescription,
      productImage: productImage,
    });
    const name = req.userName;
    const email = req.userEmail;
    const user_detail = await User.findOne({
      name: name,
      email: email,
    });
    pDetails = {
      productName: productName,
      productCompany: productCompany,
      productPrice: productPrice,
      productDescription: productDescription,
      productImage: productImage,
    };
    user_detail.productListed.push(pDetails);
    user_detail.save();
    res.status(200).end();
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
app.post("/reviewSubmit", token_verification, async function (req, res) {
  console.log(req.userName);
  try {
    const productName = req.body.productName;
    const productReview = req.body.reviewData;
    const username = req.userName;
    const review = {
      username: username,
      comment: productReview,
    };
    const product = await product_schema.findOne({
      productName: productName,
    });
    product.productReview.push(review);
    console.log(product.productReview);
    product.save();
    res.status(200).json(product.productReview);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

///seller verification
app.get("/sellerDashboard", token_verification, async function (req, res) {
  res.status(200).end();
});
////seller info
app.get("/sellerInfo", token_verification, async function (req, res) {
  const name = req.userName;
  const email = req.userEmail;
  const user_detail = await User.findOne({
    name: name,
    email: email,
  });
  res.status(200).json(user_detail);
});
///userinfo it will return the cart length
app.get("/userinfo", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  res.status(200).json({ cart: user_detail.cart.length });
});
/////delete product
app.post("/deleteProduct", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const productName = req.body.productName;
  const productCompany = req.body.productCompany;
  console.log(username, useremail, productName, productCompany);

  try {
    const user_detail = await User.findOne({
      name: username,
      email: useremail,
    });

    if (!user_detail) {
      return res.status(404).json({ error: "User not found" });
    }

    let plist = user_detail.productListed;
    let s = [];

    for (let i = 0; i < plist.length; i++) {
      if (
        plist[i].productName === productName &&
        plist[i].productCompany === productCompany
      ) {
        continue;
      }
      s.push(plist[i]);
    }

    user_detail.productListed = s;
    await user_detail.save();

    res.status(200).json(user_detail.productListed);
  } catch (error) {
    console.error("Error deleting product:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
//getting everything about user info
app.get("/userInfo2", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  res.status(200).json({ user: user_detail });
});
//updating the cart
app.post("/addToCart", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  let flag = 0;
  for (let i = 0; i < user_detail.cart.length; i++) {
    if (
      user_detail.cart[i].productName == req.body.productName &&
      user_detail.cart[i].productCompany == req.body.productCompany
    ) {
      user_detail.cart[i].productFreq += 1;
      flag = 1;
    }
  }
  if (flag == 0) {
    user_detail.cart.push(req.body);
  }
  user_detail.save();
  res.status(200).json({ cart: user_detail.cart.length });
});
//increase the cart items increaseCartElement
app.post("/increaseCartElement", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  for (let i = 0; i < user_detail.cart.length; i++) {
    if (
      user_detail.cart[i].productName == req.body.productName &&
      user_detail.cart[i].productCompany == req.body.productCompany
    ) {
      user_detail.cart[i].productFreq += 1;
    }
  }
  user_detail.save();
  res.status(200).json({ user: user_detail });
});
//decrease the cart items decreaseCartElement
app.post("/decreaseCartElement", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  for (let i = 0; i < user_detail.cart.length; i++) {
    if (
      user_detail.cart[i].productName == req.body.productName &&
      user_detail.cart[i].productCompany == req.body.productCompany
    ) {
      user_detail.cart[i].productFreq -= 1;
    }
  }
  let cartt = [];
  for (let i = 0; i < user_detail.cart.length; i++) {
    if (user_detail.cart[i].productFreq == 0) {
      continue;
    } else {
      cartt.push(user_detail.cart[i]);
    }
  }
  user_detail.cart = cartt;
  user_detail.save();
  res.status(200).json({ user: user_detail });
});
//get the cart items
app.get("/getCartItems", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  res.status(200).json({ user: user_detail });
});
///remove from the cart
app.post("/removeFromCart", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const { productName, productCompany } = req.body;
  console.log(req.body);
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  const pro = [];
  for (let i = 0; i < user_detail.cart.length; i++) {
    if (
      user_detail.cart[i].productName == productName &&
      user_detail.cart[i].productCompany == productCompany
    )
      continue;
    else {
      pro.push(user_detail.cart[i]);
    }
  }
  user_detail.cart = pro;
  user_detail.save();
  res.status(200).json({ user: user_detail });
});

/////search functionality
app.post("/searchproduct", token_verification, async function (req, res) {
  item = req.body.item;
  const item_details = await product_schema.find({
    $or: [
      { productName: { $regex: new RegExp(item, "i") } },
      { productCompany: { $regex: new RegExp(item, "i") } },
    ],
  });
  res.status(200).json({ item: item_details });
});

//////create razorpay order
app.post("/createOrder", token_verification, function (req, res) {
  var options = {
    amount: req.body.totalAmount * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: "order_rcptid_11",
  };
  instance.orders.create(options, function (err, order) {
    console.log(order);
    res.status(200).json({ order: order });
  });
});
app.post("/api/payment/verify", function (req, res) {
  generated_signature = hmac_sha256(
    req.body.response.razorpay_order_id +
      "|" +
      req.body.response.razorpay_payment_id,
    "XInbEYIZ516IMJhATTGGF5Mg"
  );

  if (generated_signature == req.body.response.razorpay_signature) {
    res.status(200).json({ message: "singnatureValid" });
  } else {
    res.status(500).json({ message: "singnatureInvalid" });
  }
});
app.post("/setpurchasedProduct", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  for (let i = 0; i < user_detail.cart.length; i++) {
    user_detail.puchasedProducts.push(user_detail.cart[i]);
  }
  user_detail.cart = [];
  user_detail.save();
  res.status(200).end();
});
app.post("/updateAccount", token_verification, async function (req, res) {
  const username = req.userName;
  const useremail = req.userEmail;
  const user_detail = await User.findOne({
    name: username,
    email: useremail,
  });
  user_detail.phoneNumber = req.body.phoneNumber;
  console.log(user_detail.phoneNumber);
  user_detail.gender = req.body.gender;
  user_detail.address = req.body.address;
  user_detail.save();
  res.status(200).end();
});
///upload profile pic
app.post(
  "/profilePicUpload",
  token_verification,
  upload.single("avatar"),
  async function (req, res, next) {
    const username = req.userName;
    const useremail = req.userEmail;
    const user_detail = await User.findOne({
      name: username,
      email: useremail,
    });
    user_detail.image = String(req.image);
    user_detail.save();
    console.log("done");
    res.status(200).json({ user: user_detail });
  }
);
////////////////////////////////////////////ROUTES ENDS///////////////////////////////////////////
app.listen(PORT);
