/*
 *Configuratons
 */
 let styles =   {"colors": ["#7393dd", "#ff8200", "#0064b5", "#80c6ff", "#00467f",
							"#b35b00", "#290aa3", "#ffc180" , "#1d0772"],
				"socket_color": ["rgba(2, 61, 107, 0.3)", "rgba(179, 83, 0, 0.3)"]};

let supercomputer_attributes = {
	"juwels": {"sockets": 2, "cores": 24, "threads": 2, "gpus": [],
	  		"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"juwels-gpu": {"sockets": 2, "cores": 20, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"juwels-booster" : {"sockets": 8, "cores": 6, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
	"jureca-dc": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"}, 
	"jureca-gpu": {"sockets": 8, "cores": 16, "threads": 2,"gpus": [3,1,7,5],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
	"jusuf": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"}, 
	"jusuf-gpu": {"sockets": 8, "cores": 16, "threads": 2, "gpus": [3],
			"affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/affinity.html"}};

window.addEventListener("DOMContentLoaded", () => {
	getAndCompleteURL();
	switchMode(document.getElementById("modus").value);
	switchSystem(document.getElementById("supercomputer").value);
	
	//Event Handler
	//document.querySelector(".alert .closebtn").addEventListener("click", function() {closeAlert(this);});
	document.getElementById("supercomputer").addEventListener("change", function() {switchSystem(this.value);});
	document.getElementById("modus").addEventListener("change", function() {switchMode(this.value);});
	document.getElementById("hex2bin").addEventListener("change", function() {hex2Bin(this.value);});
	document.getElementById("nodes").addEventListener("change", function() {generateForm();});
	document.getElementById("task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_per_task").addEventListener("change", function() {generateForm();});
	document.getElementById("cpu_bind").addEventListener("change", function() {switchCPUBind(this.value);});
	document.getElementById("threads_per_core").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_node").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_socket").addEventListener("change", function() {generateForm();});
	document.getElementById("distribution_core").addEventListener("change", function() {generateForm();});
	document.getElementById("zoom").addEventListener("click", function() {switchZoom(this.getAttribute("src"));});
})

/**
* Click-Event to close alert
*/
function closeAlert(elem){
	let div = elem.parentElement;
	div.style.opacity = "0";
	setTimeout(function(){ div.style.display = "none"; }, 600);
} 

/**
* Click-Event to zoom in/out
*/
function switchZoom(src){
	let svg = document.getElementById('content');
	let div_width = document.getElementById('output').clientWidth;
	let svg_width = document.getElementById('content').clientWidth;
	let scale = div_width/svg_width -0.01;
	//zoom out
	if(src === "images/minus.png"){
		document.getElementById('zoom').setAttribute("src", "images/plus.png");
		svg.style.transform = "scale("+scale+")";
		svg.style.transformOrigin  = "top left";
	//zoom in
	}else{
		document.getElementById('zoom').setAttribute("src", "images/minus.png");
		svg.style.transform = "scale(1)";
	}
}

/**
* Change-Event to switch between Task-, Node- and Hex2Bin-Mode
* Disables unnecessary selectors
*/					    
function switchMode(mode){
	//switch mode to task and disable mask and nodes
	if(mode === 'task'){
		document.getElementById("hex2bin").disabled = true;
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
		document.getElementById("cpu_bind").disabled = false;
		document.getElementById("threads_per_core").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to node and disable mask
	}else if(mode === 'node'){
		document.getElementById("hex2bin").disabled = true;
		document.getElementById("nodes").disabled = false;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
		document.getElementById("cpu_bind").disabled = false;
		document.getElementById("threads_per_core").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to hex2bin and disable all
	}else{
		document.getElementById("hex2bin").disabled = false;
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = true;
		document.getElementById("cpu_per_task").disabled = true;
		document.getElementById("cpu_bind").disabled = true;
		document.getElementById("threads_per_core").disabled = true;
		document.getElementById("distribution_node").disabled = true;
		document.getElementById("distribution_socket").disabled = true;
		document.getElementById("distribution_core").disabled = true;
		hex2Bin(document.getElementById("hex2bin").value);
	}
}

/**
* Change-Event to switch between systems
*/					    
function switchSystem(system){
	let link = document.getElementById('affinity');
	link.href = supercomputer_attributes[system].affinity;
	document.getElementById("threads_per_core").max = supercomputer_attributes[system]['threads'];
	if (document.getElementById("modus").value === "hex2bin"){
		hex2Bin(document.getElementById("hex2bin").value);
	} else {
		generateForm();
	}
}

/**
* Change-Event to switch between different CPU-Bind options.
* Disables unnecessary selectors
*/	
function switchCPUBind(cpu_bind){
	document.getElementById('distribution_core').disabled = (cpu_bind === 'threads' || cpu_bind === 'cores') ? false : true;
	generateForm();
}

/**
* Read out URL parameter to get selected options and 
* completes URL with missing parameters
*/
function getAndCompleteURL(){
	//read out parameters
	const help_parameters = (window.location.search.slice(1)).split('&');
	if(help_parameters[0] !== ""){
		//set selects and inputs
		for (let i = 0; i<help_parameters.length; i++){
			let key = help_parameters[i].split('=')[0];
			let value = decodeURIComponent(help_parameters[i].split('=')[1]);
			let input = document.getElementById(key);
			input.value = value;
		}
	}
	//complete URL
	setURL();
}

/**
* Set URL parameter to selected options
*/
function setURL(){
	//create all options in URL
	//get all input and select elements
	let selects = document.getElementsByTagName('select');
	let inputs = document.getElementsByTagName('input');
	for (let i=0; i<selects.length; i++) {
		const url = new URL(window.location);
		url.searchParams.set(selects[i].id, selects[i].value.toLowerCase());
		window.history.replaceState({}, '', url);
	}
	for (let i=0; i<inputs.length; i++) {
		const url = new URL(window.location);
		url.searchParams.set(inputs[i].id, inputs[i].value.toLowerCase().replace(/\s+/g, ''));
		window.history.replaceState({}, '', url);
	}
}

/**
* Create command from configuration
*/
function createCommand(options){
	//create command line
	let command = document.getElementById('command');
	command.innerHTML = "";
	let p = document.createElement('code');
	if (options["mode"] === "hex2bin") {
		p.innerHTML = '--cpu-bind=mask_cpu:' + options["hex2bin"];
	} else {
		p.innerHTML = '-N ' + options["nodes"] + ' -n ' + options["task"] + ' -c ' + options["cpu_per_task"] + ' --cpu-bind=' + options["cpu_bind"] + 
		' --distribution=' + options["distribution_node"] + ':' + options["distribution_socket"] + ':' + options["distribution_core"] +
		' --threads-per-core=' + options["threads_per_core"];
	}

	p.style.textAlign = "center";
	command.appendChild(p);
	command.style.display = 'block';
}

/**
* Get selected options
*/
function getOptions() {
	let options = {};
	//Get all parameter for supercomputer
	options["supercomputer"] = document.getElementById('supercomputer').value;
	options["sockets"] = supercomputer_attributes[options["supercomputer"]]['sockets']; 
	options["cores"] = supercomputer_attributes[options["supercomputer"]]['cores']; 
	options["threads_per_cores"] = supercomputer_attributes[options["supercomputer"]]['task_per_cores']; 

	//Get all parameter for tasks
	options["task"] = parseInt(document.getElementById('task').value); 
	options["cpu_per_task"] = parseInt(document.getElementById('cpu_per_task').value);
	options["nodes"] = parseInt(document.getElementById('nodes').value);
	options["mode"] = document.getElementById("modus").value;

	//Get all parameter for bind options
	options["cpu_bind"] = document.getElementById('cpu_bind').value;
	options["distribution_node"] = document.getElementById('distribution_node').value; 
	options["distribution_socket"] = document.getElementById('distribution_socket').value;
	options["distribution_core"] = document.getElementById('distribution_core').value;
	options["threads_per_core"] = parseInt(document.getElementById('threads_per_core').value);

	//Get all parameter for hex2bin
	options["hex2bin"] = document.getElementById('hex2bin').value.replace(/\s+/g, '');

	return options;
}

/*
* Change-Event to create pinning with given options
*/
function generateForm() {
	let options = getOptions();
	let output = document.getElementById('output');
	setURL();

	//Validator
	let validator = new Validator(options);
	if(!validator.isValidOptions()){
		if(options["mode"] === 'task') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high</div>';
		if(options["mode"] === 'node') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of nodes too low</div>';
		return;
	}
	if(!validator.isValidDistribution()){
		output.innerHTML = '<div id="warning"><i class="fa fa-cog fa-spin"></i> This version is currently not available</div>';
		return;
	}
	createCommand(options);
	let CPU_Bind;
	switch(options["cpu_bind"]){
		case 'rank':
			CPU_Bind = new Rank(options);
			break;
		case 'rank_ldom':
			CPU_Bind = new Rank_Ldom(options);
			break;
		case 'threads':
			CPU_Bind = new Threads(options);
			break;
		case 'cores':
			CPU_Bind = new Cores(options); 
			break;
	}
	tasks = CPU_Bind.getPinning();
	createContent(tasks, options["mode"]);
}

/**
* Create svg file to create pinning-content
*/
function createContent(tasks, mode){
	//get output div and empty
	let output = document.getElementById('output');
	output.innerHTML = "";

	//get needed width and height or a bit more
	let width = 30 + (tasks[0].length + (tasks[0].length*tasks[0][0][0].length))*22;
	let height = tasks.length * tasks[0][0].length * 90;
	// create the svg element
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	// set width and height
	svg.setAttribute("id", "content");
	svg.setAttribute("width", width);
	svg.setAttribute("height", height);
	//create pinning-mask
	if(tasks[0].length === 8) margin = 50; else margin = 20;
	for(let i=0; i<tasks.length; i++){ //Tasks/Nodes
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		headline.setAttribute("x", "10");
		headline.setAttribute("y", margin + i*(tasks[i][0].length+2)*22);
		headline.setAttribute("fill", "#023d6b");
		headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		headline.textContent = (mode === "task") ? "Task" : "Node";
		headline.textContent += i+':';
		svg.appendChild(headline);

		for(let j=0; j<tasks[i].length; j++){ //Sockets
			for(let k=0; k<tasks[i][j].length; k++){ //Threads
				for(let l=0; l<tasks[i][j][k].length; l++){ //Kerne
					const core = document.createElementNS("http://www.w3.org/2000/svg", "rect");
					core.setAttribute("x", 30 + j*(tasks[i][j][k].length+1)*22 + l*22);
					core.setAttribute("y", margin + 10 + i*(tasks[i][j].length+2)*22 + k*22);
					core.setAttribute("width", "20");
					core.setAttribute("height", "20");

					const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
					if (tasks[i][j][k][l]>99) {
						xoffset = 6;
						yoffset = 1;
						fontsize = "0.7em";
					} else if (tasks[i][j][k][l]>9) {
						xoffset = 4;
						yoffset = 1;
						fontsize = "0.9em";
					} else {
						xoffset = 0;
						yoffset = 0;
						fontsize = "1.0em";
					}
					pin.setAttribute("x", 36 - xoffset + j*(tasks[i][j][k].length+1)*22 + l*22);
					pin.setAttribute("y", margin + 25 - yoffset + i*(tasks[i][j].length+2)*22 + k*22);
					pin.setAttribute("width", "30");
					pin.setAttribute("height", "30");
					pin.setAttribute("font-size", fontsize);

					if(tasks[i][j][k][l] !== undefined){
						pin.textContent = tasks[i][j][k][l];
						core.setAttribute("fill", styles.colors[parseInt(tasks[i][j][k][l])%9]);
						pin.setAttribute("fill", 'white');
					}else{
						if(tasks[i].length === 8){
							core.setAttribute("fill", styles.socket_color[parseInt(j/4)]);
						}else{
							core.setAttribute("fill", styles.socket_color[j]);
						}
						pin.setAttribute("fill", '#023d6b');
						pin.textContent = 'x';
					}

					svg.appendChild(core);
					svg.appendChild(pin);
				}
			}
		}
	}

	// add gpu
	let gpus = supercomputer_attributes[document.getElementById('supercomputer').value]['gpus'];
	for(let i=0; i<gpus.length; i++){
		const gpuheadline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		gpuheadline.setAttribute("x", 35 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpuheadline.setAttribute("y", 20);
		gpuheadline.setAttribute("fill", "#023d6b");
		gpuheadline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		gpuheadline.setAttribute("font-weight", "bold");
		gpuheadline.textContent = 'Direct connection';
		svg.appendChild(gpuheadline);
		const gpuheadline2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
		gpuheadline2.setAttribute("x", 65 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpuheadline2.setAttribute("y", 40);
		gpuheadline2.setAttribute("fill", "#023d6b");
		gpuheadline2.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		gpuheadline2.setAttribute("font-weight", "bold");
		gpuheadline2.textContent = 'to GPU '+i;
		svg.appendChild(gpuheadline2);
		const gpurect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		gpurect.setAttribute("x", 25 + gpus[i]*(tasks[0][0][0].length+1)*22);
		gpurect.setAttribute("y", margin);
		gpurect.setAttribute("width", tasks[0][0][0].length*22 +8);
		gpurect.setAttribute("height", tasks.length * 60 + (tasks.length-1)* 28);
		gpurect.setAttribute("fill", "none");
		gpurect.setAttribute("stroke", "#023d6b");
		gpurect.setAttribute("stroke-width", "2");
		svg.appendChild(gpurect);
	}
	
	//keep zoom
	let src = document.getElementById('zoom').getAttribute("src");
	let div_width = output.clientWidth;
	let scale = div_width/width -0.01;
	if(src === "images/plus.png"){
		svg.style.transform = "scale("+scale+")";
		svg.style.transformOrigin  = "top left";
	}else{
		svg.style.transform = "scale(1)";
	}

	// attach container to document
	output.appendChild(svg);
}

/**
* Change-Event to create pinning from hex-mask
*/
function hex2Bin(hex){
	hex = hex.replace(/\s+/g, '');
	hex = hex.split(",");
	let options = getOptions();
	setURL();
	createCommand(options);

	//Create Task Array
	let tasks = new Array(hex.length);
	for (let h=0; h < hex.length; h++){
		tasks[h] = new Array(options["sockets"]);
		for(let socket=0; socket<options["sockets"]; socket++){
			let array_for_task = new Array(options["threads_per_core"]);
			for(let thread=0; thread<document.getElementById("threads_per_core").max;thread++){
				array_for_task[thread] = new Array(options["cores"]);
			}
			tasks[h][socket] = array_for_task;
		}
	}

	//hex to bin
	let all_cores = options["sockets"]*options["cores"]*options["threads_per_core"];
	let sub = "0".repeat(all_cores);
	for (let i = 0; i < hex.length; i++) {
		let dezi = BigInt(hex[i]);
		let bin = ((sub + dezi.toString(2)).split("").reverse().join("")).substring(0,all_cores);
		//Fill Task Array
		let bit = 0;
		for(let thread=0; thread<options["threads_per_core"];thread++){
			for(let socket=0; socket<options["sockets"]; socket++){
				for(let core=0; core<options["cores"]; core++){
					if(bin[bit] === '1') tasks[i][socket][thread][core] = '0';
					bit++;
				}
			}
		}
	}
	createContent(tasks, 'task');
}
