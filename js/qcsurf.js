var debug=0;
var indexSelected=0;

var localhost="localhost";
var dbroot="http://"+localhost+"/interact/php/interact.php";
var myOrigin={appName:"QCSurf"};
var myIP;

var W;
var H;
var container;
var overlay;
var camera, scene, renderer, trackball;
var mesh;

function configure_subjects() {

	// Add table header
	$("#subjects table").append([
		"<tr>",
		"	<th> </th>",
		"	<th>SubjectID</th>",
		"	<th>QC</th>",
		"	<th>Comment</th>",
		"</tr>"
	].join("\n"));

	// Add subjects to subject table
	var i;
	for(i=0;i<sub.length;i++) {
		$("#subjects table").append([
			"<tr>",
			"	<td>"+(i+1)+"</td>",
			"	<td>"+sub[i].id+"</td>",
			"	<td class='editable'>"+(sub[i].qc||"")+"</td>",
			"	<td class='editable'>"+(sub[i].comment||"")+"</td>",
			"</tr>"
		].join("\n"));
	}
	
	// Turn content editable in editable fields
	$(".editable").attr("contentEditable",true);
	
	// Update brain display on row selection
	$("tr").click(function() {
		var i=parseInt($($(this).find("td")[0]).text())-1;
		indexSelected=i;
		$("tr").removeClass('selected');
		$($("tr")[indexSelected+1]).addClass('selected');			
		try {
			loadMesh();
		} catch(ex) {
			$($($("tr")[indexSelected+1]).find("td")[2]).text("0");
			$($($("tr")[indexSelected+1]).find("td")[3]).text("NO DATA");
		}
	});
	$($("tr")[indexSelected+1]).addClass('selected');
}
function init_gui() {	
	// Listen to keyboard events
	$(window).keydown(function(e)
	{
		if(e.which==38) {
			indexSelected-=1;
			if(indexSelected<0)
				indexSelected=sub.length-1;
			$($("tr")[indexSelected+1]).click();
			$($("tr")[indexSelected+1]).focus();
			e.preventDefault();
		} else if(e.which==40) {
			indexSelected+=1;
			if(indexSelected>=sub.length)
				indexSelected=0;
			$($("tr")[indexSelected+1]).click();
			$($("tr")[indexSelected+1]).focus();
			e.preventDefault();
		}		
		return true;
	});
	// Connect button functions
	$("#left").click(selectHemisphere);
	$("#right").click(selectHemisphere);
	$("#pial").click(selectSurface);
	$("#white").click(selectSurface);		
	$("#save").click(function(){
		interactSave().then(function() {
			$("#save").text("Successfully saved");
			setTimeout(function(){$("#save").text("Save")},1000);
		});
	});
}
function init_3d() {

	overlay = document.getElementById('overlay');
	container = document.getElementById('container');

	W = $("#container").width();
	H = $("#container").height();

	camera = new THREE.PerspectiveCamera( 50, W / H, 1, 2000 );
	camera.position.z = 200;
	scene = new THREE.Scene();

	// RENDERER
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( W, H );
	renderer.domElement.style.position = "relative";
	container.appendChild( renderer.domElement );
	trackball = new THREE.TrackballControls(camera,renderer.domElement);

	// EVENTS
	window.addEventListener( 'resize', onWindowResize, false );
}
function selectHemisphere() {
	$("#hemisphere .button").removeClass("selected");
	$(this).addClass("selected");
	loadMesh();
}
function selectSurface() {
	$("#surface .button").removeClass("selected");
	$(this).addClass("selected");
	loadMesh();
}
function loadMesh() {
	var loader = new THREE.CTMLoader();
	var hemisphere=($("#hemisphere .selected").attr('id')=="left")?"lh":"rh";
	var surface=($("#surface .selected").attr('id')=="pial")?"pial":"white";
	$("#overlay").html("Loading...");
	loader.load( "fs/"+sub[indexSelected].id+"/surf/"+hemisphere+"."+surface+".ctm",   
		function( geometry ) {
			var material=new THREE.MeshNormalMaterial();
			mesh = new THREE.Mesh( geometry, material );
			while(scene.children.length>0)
				scene.remove(scene.children[0]);
			scene.add( mesh );
			$("#overlay").html(
				sub[indexSelected].id+"<br/>"+
				((hemisphere=="lh")?"Left Hemisphere":"Right Hemisphere")+"<br/>"+
				((surface=="pial")?"Pial Surface":"White Matter Surface")+"<br/>"
			);
		},
		{useWorker: true,callbackProgress:function(obj){
			var pct=parseInt(100*obj.loaded/obj.total);
			if(pct<100)
				$("#overlay").html(pct+"%");
			else
				$("#overlay").html("Decompressing...");
		}}
	);
}
function onWindowResize( event ) {
	W = $("#container").width();
	H = $("#container").height();
	renderer.setSize( W, H );
	camera.aspect = W/H;
	camera.updateProjectionMatrix();
}	
function animate() {
	requestAnimationFrame( animate );
	render();
}
function render() {
	renderer.render( scene, camera );
	trackball.update();
}

/*
Annotation storage
*/
function interactIP() {
/*
	Get my IP
*/
	if(debug) console.log("> interactIP promise");

	console.log("<br />Connecting to database...");
	return $.get(dbroot,{
		"action":"remote_address"
	}).success(function(data) {
		console.log("< interactIP resolve: success");
		myIP=data;
	}).error(function(jqXHR, textStatus, errorThrown) {
		console.log("< interactIP resolve: ERROR, "+textStatus+", "+errorThrown);
		console.log("<br />Error: Unable to connect to database.");
	});
}
function interactSave() {
/*
	Save QC to Interact DB
*/
	if(debug) console.log("> save promise");

	var i;
	var	key;
	var value;
	var origin;

	// key
	key="QCSurf";

	// configure value to be saved
	value=[];
	for(i=0;i<sub.length;i++)
	{
		var el={};
		el.id=sub[i].id;
		el.qc=$($($("tr")[i+1]).find("td")[2]).text();
		el.comment=$($($("tr")[i+1]).find("td")[3]).text();
		value.push(el);
	}
	return $.ajax({
		url:dbroot,
		type:"POST",
		data:{
			"action":"save",
			"origin":JSON.stringify(myOrigin),
			"key":key,
			"value":JSON.stringify(value)
		},
		success: function(data) {
			console.log("< interactSave resolve: Successfully saved QC");
			$("#footer").html("Last saved "+new Date());
		},
		error: function(jqXHR, textStatus, errorThrown) {
			console.log("< interactSave resolve: ERROR: " + textStatus + " " + errorThrown);
		}
	});
}
function interactLoad() {
/*
	Load QC from Interact DB
*/
	if(debug==debug) console.log("> interactLoad promise");

	var	def=$.Deferred();
	var	key="QCSurf";

	$.get(dbroot,{
		"action":"load_last",
		"origin":JSON.stringify(myOrigin),
		"key":key
	}).success(function(data) {
		var	obj=JSON.parse(data);
		if(obj) {
			var time=obj.myTimestamp;
			$("#footer").html("Last saved "+time);
			
			var val=JSON.parse(obj.myValue);
			if(val) {
				var i,arr=$("tr");
				for(i=0;i<arr.length;i++)
					arr[i].remove();
				sub=val;
				configure_subjects();
			}
		}
		if(debug==debug) console.log("< interactLoad resolve success");
		def.resolve();
	}).error(function(jqXHR, textStatus, errorThrown) {
		console.log("< interactLoad resolve ERROR: " + textStatus + " " + errorThrown);
	});

	return def.promise();
}

function loginChanged() {
	if(debug) console.log("> loginChanged");

	updateUser();
}
function updateUser() {
	if(debug) console.log("> updateUser");

	if(MyLoginWidget.username)
		myOrigin.user=MyLoginWidget.username;
	else {
		var username={};
		username.IP=myIP;
		username.hash=navigator.userAgent.split("").reduce(function(a,b){
			a=((a<<5)-a)+b.charCodeAt(0);return a&a
		},0).toString(16);
		myOrigin.user=username;
	}
}
