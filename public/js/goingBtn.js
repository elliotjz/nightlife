
$(document).ready(function() {

	$(".going-btn").on("click", function() {
		$(this).attr("class", "green-venue");

		let params = { venueId: $(this).val() };
		$.post('/going', params, function(data){
			console.log("done");
			console.log(data);
		})
	});
})