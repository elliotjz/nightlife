
$(document).ready(function() {

	if (window.location.pathname == "/search") {
		$("#search-bar").val(sessionStorage.getItem('lastSearch'));
	}

	let justLoggedIn = sessionStorage.getItem('twitterLoggingIn');
	if (justLoggedIn == "yes") {
		$("#search-bar").val(sessionStorage.getItem('lastSearch'));
		sessionStorage.setItem('twitterLoggingIn', "no");
		$("#search-form").trigger("submit");
	}

	$("#sign-in-btn").on("click", function(event) {
		sessionStorage.setItem('twitterLoggingIn', "yes");
	})

	$("#search-form").submit(function(event) {
		let lastSearch = $("#search-bar").val();
		sessionStorage.setItem('lastSearch', lastSearch);
	});

	$(".going-btn").on("click", function() {
		$(this).attr("class", "btn-success");

		let params = { venueId: $(this).val() };
		$.post('/going', params, function(data){
			console.log("done");
			console.log(data);
		})
	});

	$('[data-toggle="tooltip"]').tooltip()
})