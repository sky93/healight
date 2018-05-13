"use strict";

let DBMain = require(consV.methods.db.main);
let ObjectID = require('mongodb').ObjectID;
let express = require("express");
let async = require('async');
let router = express.Router({mergeParams: true});

router.route('/')
.post(function (req , res)
{
	DBMain.deleteUser(req.body.nodeId, function (err, result)
	{
		if(err)
		{
			res.send( consV.codes.db.Error.toString() );
		}
		else
		{
			res.json( result );
		}
	});
});

module.exports = router;
