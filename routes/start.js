"use strict";

let express = require("express");
let router = express.Router({mergeParams: true});

router.route('/')
.all(function(req , res)
{
	//detect lan and redirect
	// if lang == fa
	res.redirect('/fa/home');
	// else ...
});

module.exports = router;
