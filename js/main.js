var key_color = [51, 0, 85];
var cu_color = [226, 188, 144];
var silk_color = [255, 255, 255];
var drl_color = [40, 40, 40];
var alpha_color = [0, 0, 0];

var pcb_image_urls = new Object();

var shared_alpha_channel;

var camera, scene, renderer, controls, light, hemiLight;
var mesh = new Object();
var material = new Object();
var default_opacity = 0.6;
var default_z_spacing = 40;

var controller, gui, onGUIChange;

function main()
{
	fillUrlFromQueryString();
	// fillUrlForDebug(); // use for local testing

	three_init();

	// creating the edge alpha channel will then process the other primary channels.. 
	// ..which will then create their respective individual alpha channels (ugly)
	isolate("edge", alpha_color, true, false, 0);

	animate();

	// GUI
	controller = 
	{
		z_spacing: default_z_spacing,
		layer_opacity: default_opacity,
		auto_rotate: controls.autoRotate
	};

	onGUIChange = function () 
	{
		for (mesh_child in mesh)
		{
			mesh[mesh_child].material.opacity = controller.layer_opacity;
			mesh[mesh_child].position.set(0, mesh[mesh_child].position.y, controller.z_spacing * mesh[mesh_child].z_index);
		}
		controls.autoRotate = controller.auto_rotate;
	};
	gui = new dat.GUI();
	gui.add( controller, 'z_spacing', 1, 80 ).onChange ( onGUIChange );
	gui.add( controller, 'layer_opacity', 0.1, 1 ).onChange ( onGUIChange );
	gui.add( controller, 'auto_rotate' ).onChange( onGUIChange ); 


}

function fillUrlForDebug()
{
	pcb_image_urls["f.cu"] = 	"/pcb/f.cu.png";
	pcb_image_urls["b.cu"] = 	"/pcb/b.cu.png";
	pcb_image_urls["f.silk"] = 	"/pcb/f.silk.png";
	pcb_image_urls["b.silk"] = 	"/pcb/b.silk.png";
	pcb_image_urls["f.mask"] = 	"/pcb/f.mask.png";
	pcb_image_urls["b.mask"] = 	"/pcb/b.mask.png";
	pcb_image_urls["drl"] =		"/pcb/drl.png";
	pcb_image_urls["edge"] =	"/pcb/edge.png";
}

function fillUrlFromQueryString()
{
	// doesn't check if it's really a URL
	params = getQueryParams();
	//cors_proxy = "https://crossorigin.me/";
	//cors_proxy = "https://cors.io/?";
	cors_proxy = "https://cors-anywhere.herokuapp.com/";

	if (params["f.cu"] === undefined)
	{
		alert("This page should be loaded from the bookmarklet on OSHPark - https://oshpark.com/uploads/xxxxxx/approval/new");
		window.location = "https://github.com/jglim/PurpleVisualizer";
		throw new Error("ugh!");
	}

	pcb_image_urls["f.cu"] = 	cors_proxy + params["f.cu"];
	pcb_image_urls["b.cu"] = 	cors_proxy + params["b.cu"];
	pcb_image_urls["f.silk"] = 	cors_proxy + params["f.silk"];
	pcb_image_urls["b.silk"] = 	cors_proxy + params["b.silk"];
	pcb_image_urls["f.mask"] = 	cors_proxy + params["f.mask"];
	pcb_image_urls["b.mask"] = 	cors_proxy + params["b.mask"];
	pcb_image_urls["drl"] =		cors_proxy + params["drl"];
	pcb_image_urls["edge"] =	cors_proxy + params["edge"];
}

function getQueryParams(qs) {
    qs = document.location.search.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }

    return params;
}


function createKeyedImages()
{
	isolate("f.cu", 	cu_color, 	true, 	false, 1);
	isolate("b.cu", 	cu_color, 	true, 	false, -1);
	isolate("f.silk",  	silk_color, true, 	false, 3);
	isolate("b.silk",  	silk_color, true, 	false, -3);
	isolate("f.mask",  	key_color, 	false, 	false, 2);
	isolate("b.mask",  	key_color, 	false, 	false, -2);
	isolate("drl", 		drl_color, 	false, 	false, 0);
}

// MDN: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas

function isolate(output_id, new_color, invert_color, is_bump_map, z_index)
{
	var hidden_canvas = document.createElement('canvas');
	var img = new Image();

	const src = pcb_image_urls[output_id];
	const options = {
		headers: {
			'Origin': 'http://localhost' // browser SHOULD fix this automatically
		}
	};

	fetch(src, options)
		.then(res => res.blob())
		.then(blob => {

		//img.src = pcb_image_urls[output_id];
		img.src = URL.createObjectURL(blob);
		img.onload = function() {
			hidden_canvas.width = img.width;
			hidden_canvas.height = img.height;

		  	draw(this, hidden_canvas, new_color, invert_color, is_bump_map, output_id, z_index);
		};
	});

}

function color_match(channel_in, channel_base, tolerance = 30)
{
	if ((channel_in <= channel_base + tolerance) && (channel_in >= channel_base - tolerance))
	{
		return true;
	}
	return false;
}

function draw(img, canvas, new_color, invert_color, is_bump_map, output_id, z_index) 
{
	var ctx = canvas.getContext('2d');
	ctx.drawImage(img, 0, 0);

	// if edge, flood fill first
	if (output_id == "edge")
	{
		// boards are usually radiused
		flood_fill(canvas, 0, 0);
		flood_fill(canvas, canvas.width - 1, 0);
		flood_fill(canvas, 0, canvas.height - 1);
		flood_fill(canvas, canvas.width - 1, canvas.height - 1);
	}

	img.style.display = 'none';
	var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	var data = imageData.data;

	for (var i = 0; i < data.length; i += 4) 
	{
		if (color_match(data[i], key_color[0]) && color_match(data[i + 1], key_color[1]) && color_match(data[i + 2], key_color[2]))
		{
			if (invert_color)
			{
				data[i + 3] = 0;
			}
			else 
			{
				if (output_id != "edge")
				{
					data[i + 3] = 255 & shared_alpha_channel[i + 3];
				}
			}
		}
		else 
		{
			if (invert_color)
			{				
				if (output_id != "edge")
				{
					data[i + 3] = 255 & shared_alpha_channel[i + 3];
				}
			}
			else 
			{
				data[i + 3] = 0;
			}
		}
		data[i]     = new_color[0];
		data[i + 1] = new_color[1];
		data[i + 2] = new_color[2];
		if (is_bump_map)
		{
			data[i]     = data[i + 3];
			data[i + 1] = data[i + 3];
			data[i + 2] = data[i + 3];
			data[i + 3] = 255;
		}
	}
	ctx.putImageData(imageData, 0, 0);

	// if we're working on alpha channel, store it (uint8clampedarray) for remaining ops
	if (output_id == "edge")
	{
		shared_alpha_channel = imageData.data;
		createKeyedImages();
		return;
	}

	var new_image_url = canvas.toDataURL();
	var new_img = document.createElement('img');
	new_img.src = new_image_url;
	new_img.style = "display: none;";
	if (is_bump_map)
	{
		new_img.id = "bump_" + output_id;
		new_img.onload = function() {
			mesh[output_id].material.alphaMap =  THREE.ImageUtils.loadTexture( new_img.src );
		};
	}
	else 
	{
		new_img.id = output_id;
		new_img.onload = function() {
			var temp_material = new THREE.MeshBasicMaterial();
			temp_material.side = THREE.DoubleSide;
			temp_material.transparent = true;
			temp_material.opacity = default_opacity;
			temp_material.map = THREE.ImageUtils.loadTexture( new_img.src );

			mesh[output_id] =  new THREE.Mesh( new THREE.PlaneGeometry( canvas.width, canvas.height) , temp_material );
			mesh[output_id].z_index = z_index;
			mesh[output_id].position.set(0, canvas.height / 2, default_z_spacing * mesh[output_id].z_index);
			scene.add( mesh[output_id] );


			isolate(output_id, img.src, new_color, invert_color, true, z_index);
		};
	}

	document.body.appendChild( new_img );
}

// three.js

function three_init() {
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 2000 );
	camera.position.set( 0, 200, 800 );

	scene = new THREE.Scene();

	scene.background = new THREE.Color().setHSL( 0.6, 0, 0.95 );
	scene.fog = new THREE.Fog( scene.background, 1, 5000 );

	// ground
	/*
	var gnd_mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2000, 2000 ), new THREE.MeshPhongMaterial( { color: 0x999999, depthWrite: false } ) );
	gnd_mesh.rotation.x = - Math.PI / 2;
	gnd_mesh.receiveShadow = true;
	scene.add( gnd_mesh );
	*/
	var grid = new THREE.GridHelper( 2000, 20, 0x000000, 0x000000 );
	grid.material.opacity = 0.2;
	grid.material.transparent = true;
	scene.add( grid );
	

	light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0, 200, 100 );
	light.castShadow = true;
	light.shadow.camera.top = 180;
	light.shadow.camera.bottom = -100;
	light.shadow.camera.left = -120;
	light.shadow.camera.right = 120;
	scene.add( light );

	hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
	hemiLight.color.setHSL( 0.6, 1, 0.6 );
	hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
	hemiLight.position.set( 0, 50, 0 );
	scene.add( hemiLight );


	controls = new THREE.OrbitControls( camera );
	controls.target.set( 0, 100, 0 );
	controls.autoRotate = true;
	//controls.enableDamping = true;
	//controls.autoRotateSpeed = 1.0;
	controls.update();


	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight);
	document.body.appendChild( renderer.domElement );
	window.addEventListener( 'resize', onWindowResize, false );
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	requestAnimationFrame( animate );
	controls.update();
	renderer.render( scene, camera );
}

// board edge: floodfill

function flood_fill(the_canvas, x, y) {
	/*
	var x = 1;
	var y = 1;
	*/
	var color = {r:key_color[0],
				g:key_color[1],
				b:key_color[2],
				a:255};
	

    var the_canvas_context = the_canvas.getContext( "2d" )
    pixel_stack = [{x:x, y:y}] ;
    pixels = the_canvas_context.getImageData( 0, 0, the_canvas.width, the_canvas.height ) ;
    var linear_cords = ( y * the_canvas.width + x ) * 4 ;
    original_color = {r:pixels.data[linear_cords],
                      g:pixels.data[linear_cords+1],
                      b:pixels.data[linear_cords+2],
                      a:pixels.data[linear_cords+3]} ;

    while( pixel_stack.length>0 ) {
        new_pixel = pixel_stack.shift() ;
        x = new_pixel.x ;
        y = new_pixel.y ;

        //console.log( x + ", " + y ) ;
  
        linear_cords = ( y * the_canvas.width + x ) * 4 ;
        while( y-->=0 &&
               (pixels.data[linear_cords]==original_color.r &&
                pixels.data[linear_cords+1]==original_color.g &&
                pixels.data[linear_cords+2]==original_color.b &&
                pixels.data[linear_cords+3]==original_color.a) ) {
            linear_cords -= the_canvas.width * 4 ;
        }
        linear_cords += the_canvas.width * 4 ;
        y++ ;

        var reached_left = false ;
        var reached_right = false ;
        while( y++<the_canvas.height &&
               (pixels.data[linear_cords]==original_color.r &&
                pixels.data[linear_cords+1]==original_color.g &&
                pixels.data[linear_cords+2]==original_color.b) ) {
            pixels.data[linear_cords]   = color.r ;
            pixels.data[linear_cords+1] = color.g ;
            pixels.data[linear_cords+2] = color.b ;
            pixels.data[linear_cords+3] = color.a ;

            if( x>0 ) {
                if( pixels.data[linear_cords-4]==original_color.r &&
                    pixels.data[linear_cords-4+1]==original_color.g &&
                    pixels.data[linear_cords-4+2]==original_color.b ) {
                    if( !reached_left ) {
                        pixel_stack.push( {x:x-1, y:y} ) ;
                        reached_left = true ;
                    }
                } else if( reached_left ) {
                    reached_left = false ;
                }
            }
        
            if( x<the_canvas.width-1 ) {
                if( pixels.data[linear_cords+4]==original_color.r &&
                    pixels.data[linear_cords+4+1]==original_color.g &&
                    pixels.data[linear_cords+4+2]==original_color.b ) {
                    if( !reached_right ) {
                        pixel_stack.push( {x:x+1,y:y} ) ;
                        reached_right = true ;
                    }
                } else if( reached_right ) {
                    reached_right = false ;
                }
            }
            
            linear_cords += the_canvas.width * 4 ;
        }
    }
    the_canvas_context.putImageData( pixels, 0, 0 ) ;
}



//

$("document").ready(function()
{
	main();
});


// oshpark bookmarklet
// this doesn't actually run here - execute on the oshpark approval page to load

function oshpark_load()
{
	var mappings = [
				["Drills", "drl"],
				["Top Silk Screen", "f.silk"],
				["Board Outline", "edge"],
				["Bottom Silk Screen", "b.silk"],
				["Top Layer", "f.cu"],
				["Bottom Layer", "b.cu"],
				["Top Solder Mask", "f.mask"],
				["Bottom Solder Mask", "b.mask"]
			];
	var jg_remarks = "any https-enabled page is okay, reusing one of my old pages";
	var fullUrl = "https://ecg.sn.sg/purple/?";

	for (var i = 0; i < mappings.length; i++)
	{
		var el = jQuery( "img[title='" + mappings[i][0] + "']" )[0];
		if (el === undefined)
		{
			alert("Aborting due to missing layer: " + mappings[i][0]);
			return;
		}
		else 
		{
			fullUrl += mappings[i][1] + "=" + encodeURIComponent(el.src) + "&";
		}
	}
	$(document.getElementById("header")).append('<iframe id="jg_frame" src="' + fullUrl + '" class="" style="border: 0; width: 100%; min-width:500px; min-height:500px; background-color: #eee; border-radius: 15px; margin-top: 40px; margin-bottom: 60px;"></iframe>');
	return fullUrl;
}

// bookmarklet edition
// javascript:eval(atob('ZnVuY3Rpb24gb3NocGFya19sb2FkKCkKewoJdmFyIG1hcHBpbmdzID0gWwoJCQkJWyJEcmlsbHMiLCAiZHJsIl0sCgkJCQlbIlRvcCBTaWxrIFNjcmVlbiIsICJmLnNpbGsiXSwKCQkJCVsiQm9hcmQgT3V0bGluZSIsICJlZGdlIl0sCgkJCQlbIkJvdHRvbSBTaWxrIFNjcmVlbiIsICJiLnNpbGsiXSwKCQkJCVsiVG9wIExheWVyIiwgImYuY3UiXSwKCQkJCVsiQm90dG9tIExheWVyIiwgImIuY3UiXSwKCQkJCVsiVG9wIFNvbGRlciBNYXNrIiwgImYubWFzayJdLAoJCQkJWyJCb3R0b20gU29sZGVyIE1hc2siLCAiYi5tYXNrIl0KCQkJXTsKCXZhciBqZ19yZW1hcmtzID0gImFueSBodHRwcy1lbmFibGVkIHBhZ2UgaXMgb2theSwgcmV1c2luZyBvbmUgb2YgbXkgb2xkIHBhZ2VzIjsKCXZhciBmdWxsVXJsID0gImh0dHBzOi8vZWNnLnNuLnNnL3B1cnBsZS8/IjsKCglmb3IgKHZhciBpID0gMDsgaSA8IG1hcHBpbmdzLmxlbmd0aDsgaSsrKQoJewoJCXZhciBlbCA9IGpRdWVyeSggImltZ1t0aXRsZT0nIiArIG1hcHBpbmdzW2ldWzBdICsgIiddIiApWzBdOwoJCWlmIChlbCA9PT0gdW5kZWZpbmVkKQoJCXsKCQkJYWxlcnQoIkFib3J0aW5nIGR1ZSB0byBtaXNzaW5nIGxheWVyOiAiICsgbWFwcGluZ3NbaV1bMF0pOwoJCQlyZXR1cm47CgkJfQoJCWVsc2UgCgkJewoJCQlmdWxsVXJsICs9IG1hcHBpbmdzW2ldWzFdICsgIj0iICsgZW5jb2RlVVJJQ29tcG9uZW50KGVsLnNyYykgKyAiJiI7CgkJfQoJfQoJJChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaGVhZGVyIikpLmFwcGVuZCgnPGlmcmFtZSBpZD0iamdfZnJhbWUiIHNyYz0iJyArIGZ1bGxVcmwgKyAnIiBjbGFzcz0iIiBzdHlsZT0iYm9yZGVyOiAwOyB3aWR0aDogMTAwJTsgbWluLXdpZHRoOjUwMHB4OyBtaW4taGVpZ2h0OjUwMHB4OyBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlOyBib3JkZXItcmFkaXVzOiAxNXB4OyBtYXJnaW4tdG9wOiA0MHB4OyBtYXJnaW4tYm90dG9tOiA2MHB4OyI+PC9pZnJhbWU+Jyk7CglyZXR1cm4gZnVsbFVybDsKfQ==''));
// <a href="javascript:eval(atob('ZnVuY3Rpb24gb3NocGFya19sb2FkKCkKewoJdmFyIG1hcHBpbmdzID0gWwoJCQkJWyJEcmlsbHMiLCAiZHJsIl0sCgkJCQlbIlRvcCBTaWxrIFNjcmVlbiIsICJmLnNpbGsiXSwKCQkJCVsiQm9hcmQgT3V0bGluZSIsICJlZGdlIl0sCgkJCQlbIkJvdHRvbSBTaWxrIFNjcmVlbiIsICJiLnNpbGsiXSwKCQkJCVsiVG9wIExheWVyIiwgImYuY3UiXSwKCQkJCVsiQm90dG9tIExheWVyIiwgImIuY3UiXSwKCQkJCVsiVG9wIFNvbGRlciBNYXNrIiwgImYubWFzayJdLAoJCQkJWyJCb3R0b20gU29sZGVyIE1hc2siLCAiYi5tYXNrIl0KCQkJXTsKCXZhciBqZ19yZW1hcmtzID0gImFueSBodHRwcy1lbmFibGVkIHBhZ2UgaXMgb2theSwgcmV1c2luZyBvbmUgb2YgbXkgb2xkIHBhZ2VzIjsKCXZhciBmdWxsVXJsID0gImh0dHBzOi8vZWNnLnNuLnNnL3B1cnBsZS8/IjsKCglmb3IgKHZhciBpID0gMDsgaSA8IG1hcHBpbmdzLmxlbmd0aDsgaSsrKQoJewoJCXZhciBlbCA9IGpRdWVyeSggImltZ1t0aXRsZT0nIiArIG1hcHBpbmdzW2ldWzBdICsgIiddIiApWzBdOwoJCWlmIChlbCA9PT0gdW5kZWZpbmVkKQoJCXsKCQkJYWxlcnQoIkFib3J0aW5nIGR1ZSB0byBtaXNzaW5nIGxheWVyOiAiICsgbWFwcGluZ3NbaV1bMF0pOwoJCQlyZXR1cm47CgkJfQoJCWVsc2UgCgkJewoJCQlmdWxsVXJsICs9IG1hcHBpbmdzW2ldWzFdICsgIj0iICsgZW5jb2RlVVJJQ29tcG9uZW50KGVsLnNyYykgKyAiJiI7CgkJfQoJfQoJJChkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgiaGVhZGVyIikpLmFwcGVuZCgnPGlmcmFtZSBpZD0iamdfZnJhbWUiIHNyYz0iJyArIGZ1bGxVcmwgKyAnIiBjbGFzcz0iIiBzdHlsZT0iYm9yZGVyOiAwOyB3aWR0aDogMTAwJTsgbWluLXdpZHRoOjUwMHB4OyBtaW4taGVpZ2h0OjUwMHB4OyBiYWNrZ3JvdW5kLWNvbG9yOiAjZWVlOyBib3JkZXItcmFkaXVzOiAxNXB4OyBtYXJnaW4tdG9wOiA0MHB4OyBtYXJnaW4tYm90dG9tOiA2MHB4OyI+PC9pZnJhbWU+Jyk7CglyZXR1cm4gZnVsbFVybDsKfQ==''));" style="padding: 20px; margin: 20px; background-color: #330055; display: inline-block; border-radius: 5px; color: #FFF; text-decoration: none; ">Purple Visualizer</a>
