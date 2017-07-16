
$(document).ready(function() {

	$(".authenticated-going-btn").on("click", function() {
		$(this).attr("class", "green-venue");

		let params = { venueId: $(this).val() };
		$.post('/going', params, function(data){
			console.log("done");
			console.log(data);
		})
	});

	$(".unauthenticated-going-btn").on("click", function() {
		$.get("/signin", function(data) {
			console.log("logging in");
		});
	})

	$('[data-toggle="tooltip"]').tooltip();
})