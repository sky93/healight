"use strict";

// Events
$(window).bind("load", function()
{
	$(document).ready(function()
	{
		// modal
		setDefaultMmodal('در حال پردازش');
		getSlideShowInfo();
	});
});

// Functions
function postSlideShowInfo(ev)
{
	$('#MModal').modal('show');
	ev.preventDefault();

	let form = ev.target;
	let formData = new FormData( $(form)[0] );

	$.ajax
	({
		url: $(form).attr('action'),
		type: 'POST',
		enctype: 'multipart/form-data',
		processData: false,
		contentType: false,
		// cache: false,
		data: formData,
		success: function (res)
		{
			if( res == "-6" )
			{
				failMmodal("اطلاعات حداقل پر نشده است");
			}
			else if(res == "-2")
			{
				failMmodal("خطای داخلی سیستم، در اسرع وقت سیستم درست میشود. متاسفیم");
			}
			else if(res)
			{
				successMmodal("با موفقیت ثبت شد");
			}
		},
		error: function(JXHR , status , err)
		{
			failMmodal("احتمال خطا از مرورگر شما");
		}
	});
}

function getSlideShowInfo()
{
	$.ajax
	({
		url: '/' + lang + '/panel/pagesStuff/getSlideShow',
		type: 'POST',
		data:
		{
			slideShowFormPage: getSlideShowFormPage(),
			slideShowFormSN: getSlideShowFormSN(),
			slideShowFormLang: getSlideShowFormLang()
		},
		success: function (res)
		{
			if( res == "-6" )
			{
				console.log("اطلاعات حداقل پر نشده است");
			}
			else if( res == "-2" )
			{
				console.log("خطای داخلی سیستم، در اسرع وقت سیستم درست میشود. متاسفیم");
			}
			else if(res)
			{
				setSlideShowFromData(res);
			}
		},
		error: function(JXHR , status , err)
		{
			console.log(`#Ajax. Error in getSlideShowInfo get request. message: ${err}`);
		}
	});
}