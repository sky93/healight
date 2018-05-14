"use strict";

$(window).bind("load", function()
{
	$(document).ready(function()
	{
		// modal
		setDefaultMmodal('در حال پردازش');
	});
});

function postProfileForm(ev)
{
	ev.preventDefault();
	var form = $(ev.target);
	$('#MModal').modal({show:true});
	$.ajax
	({
		url: form.attr('action'),
		type: 'POST',
		data: $(form).serialize(),		success: function (res)
		{
			if( res == "true" )
			{
				successMmodal("با موفقیت ثبت شد");
			}
			else if( res == "-2" )
			{
				failMmodal("خطای داخلی سیستم، در اسرع وقت سیستم درست میشود. متاسفیم");
			}
		},
		error: function(JXHR , status , err)
		{
			failMmodal("احتمال خطا از مرورگر شما");
		}
	});
}