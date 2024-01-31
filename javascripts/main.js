/*
 *Configuratons
 */
var styles =   {"colors": ["#7393dd", "#ff8200", "#0064b5", "#80c6ff", "#00467f",
						   			  "#b35b00", "#290aa3", "#ffc180" , "#1d0772"],
				"socket_color": ["rgba(2, 61, 107, 0.3)", "rgba(179, 83, 0, 0.3)"],
				"task_height": 0}
				
var supercomputer_attributes = {"juwels": {"sockets": 2, "cores": 24, "task_per_cores": 2,
										   "affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
								"juwels-gpu": {"sockets": 2, "cores": 20, "task_per_cores": 2, 
											   "affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
								"juwels-booster" : {"sockets": 8, "cores": 6, "task_per_cores": 2,
													"affinity": "https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html"}, 
								"jureca-dc": {"sockets": 8, "cores": 16, "task_per_cores": 2, 
											  "affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"}, 
								"jureca-gpu": {"sockets": 8, "cores": 16, "task_per_cores": 2,
											   "affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
								"jureca-booster": {"sockets": 1, "cores": 68, "task_per_cores": 4, 
												   "affinity": "https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html"},
								"jusuf": {"sockets": 8, "cores": 16, "task_per_cores": 2, 
										  "affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/cluster/affinity.html"}, 
								"jusuf-gpu": {"sockets": 8, "cores": 16, "task_per_cores": 2, 
											  "affinity": "https://apps.fz-juelich.de/jsc/hps/jusuf/cluster/affinity.html"}}
var default_options =  {"supercomputer" : "JUWELS", 
					    "modus" : "task",
		                "hex2bin" : "0x",
					    "nodes" : 1,
					    "task" : 1,
					    "cpu_per_task" : 1,
					    "hint" : "",
					    "distribution_node" : "block",
					    "distribution_socket" : "cyclic",
		    		    "distribution_core" : "fcyclic"}

window.onload = function () {
	getAndCompleteURL(default_options);
	generateForm();
	switchMode(document.getElementById("modus").value);
}

/**
 * Onclick-Event to close alert
 */
function closeAlert(elem){
    var div = elem.parentElement;
    div.style.opacity = "0";
    setTimeout(function(){ div.style.display = "none"; }, 600);
} 

/**
 * Onclick-Event to zoom in/out
 */
function zoom(){
	//scale container to display width
	var src = document.getElementById('zoom').getAttribute("src");
	var svg = document.getElementById('content');
	var div_width = document.getElementById('output').clientWidth;
	var svg_width = document.getElementById('content').clientWidth;
	var scale = div_width/svg_width -0.01;
	//zoom out
	if(src == "images/minus.png"){
		document.getElementById('zoom').setAttribute("src", "images/plus.png");
		svg.style.transform = "scale("+scale+")";
		svg.style.transformOrigin  = "top left";
		svg.style.height  = height * scale + "px";
	//zoom in
	}else{
		document.getElementById('zoom').setAttribute("src", "images/minus.png");
		svg.style.transform = "scale(1)";
		svg.style.height  = task_height + "px";
	}
}	

/**
 * Onchange-Event to switch between Task-, Node- and Hex2Bin-Mode
 * Disables unnecessary selectors
 */					    
function switchMode(mode){
	//switch mode to task and disable mask and nodes
	if(mode == 'task'){
		document.getElementById("hex2bin").disabled = true;
				document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
				document.getElementById("cpu_bind").disabled = false;
		document.getElementById("hint").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		document.getElementById("distribution_core").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to node and disable mask
	}else if(mode == 'node'){
		document.getElementById("hex2bin").disabled = true;
				document.getElementById("nodes").disabled = false;
		document.getElementById("task").disabled = false;
		document.getElementById("cpu_per_task").disabled = false;
				document.getElementById("cpu_bind").disabled = false;
		document.getElementById("hint").disabled = false;
		document.getElementById("distribution_node").disabled = false;
		document.getElementById("distribution_socket").disabled = false;
		document.getElementById("distribution_core").disabled = false;
		switchCPUBind(document.getElementById("cpu_bind").value);
	//switch mode to hex2bin and disable all
	}else{
		document.getElementById('command').innerHTML = "";
		document.getElementById('output').innerHTML = "";
		document.getElementById("hex2bin").disabled = false;
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
		document.getElementById("task").disabled = true;
		document.getElementById("cpu_per_task").disabled = true;
		document.getElementById("cpu_bind").disabled = true;
		document.getElementById("hint").disabled = true;
		document.getElementById("distribution_node").disabled = true;
		document.getElementById("distribution_socket").disabled = true;
		document.getElementById("distribution_core").disabled = true;
		hex2Bin(document.getElementById("hex2bin").value);
	}
	}

/**
 * Onchange-Event to switch between different CPU-Bind options.
 * Disables unnecessary selectors
 */	
function switchCPUBind(cpu_bind){
	//disable distribution if cpu-bind is not threads or cores
	//document.getElementById('distribution_socket').disabled = (cpu_bind == 'threads' || cpu_bind == 'cores') ? false : true;
	document.getElementById('distribution_core').disabled = (cpu_bind == 'threads' || cpu_bind == 'cores') ? false : true;
}

/**
 * Onchange-Event to set affinity-link for choosen system
 */	
function setAffinityLink(supercomputer){
	var link = document.getElementById('affinity');
	link.href = supercomputer_attributes[supercomputer].affinity;
}

/**
 * Read out URL parameter to get selected options and 
 * completes URL with missing parameters
 */
function getAndCompleteURL(options){
	//read out parameters
    const help_parameters = (window.location.search.slice(1)).split('&');
	if(help_parameters[0] != ""){
		//set selects and inputs
		for (var i = 0; i<help_parameters.length; i++){
			var key = help_parameters[i].split('=')[0]
			var value = help_parameters[i].split('=')[1]
			options[key] = value
			var input = document.getElementById(key);
			input.value = value;
		}
	}
	//complete URL
	for (const [key, value] of Object.entries(options)) {
		const url = new URL(window.location);
		url.searchParams.set(key, value);
		window.history.replaceState({}, '', url);
	}
}

/**
 * Set URL parameter to selected options
 */
function setURL(){
	//create all options in URL
	//get all input and select elements
	var selects = document.getElementsByTagName('select')
	var inputs = document.getElementsByTagName('input')
	for (var i=0; i<selects.length; i++) {
		const url = new URL(window.location);
		url.searchParams.set(selects[i].id, selects[i].value.toLowerCase());
		window.history.replaceState({}, '', url);
	}
	for (var i=0; i<inputs.length; i++) {
		const url = new URL(window.location);
		url.searchParams.set(inputs[i].id, inputs[i].value.toLowerCase());
		window.history.replaceState({}, '', url);
	}
}

/**
 * Create command from configuration
 */
function createCommand(nodes, task, cpu_per_task, sockets, cores, threads_per_cores, cpu_bind, distribution_node, distribution_socket, distribution_core, hint){
	//create command line
	var command = document.getElementById('command');
	command.innerHTML = "";
	var p = document.createElement('code');
			p.innerHTML = '-N ' + nodes + ' -n ' + task + ' -c ' + cpu_per_task + ' --cpu-bind=' + cpu_bind + 
				 	' --distribution=' + distribution_node + ':' + distribution_socket + ':' + distribution_core;
		if(hint != '-') p.innerHTML +=  ' --hint=' + hint;
	
	p.style.textAlign = "center";
	command.appendChild(p);
	command.style.display = 'block';
}

/*
 * Generates HTML
 */

function generateForm() {
	//Get all parameter for supercomputer
	var supercomputer = document.getElementById('supercomputer').value;
	var sockets = supercomputer_attributes[supercomputer]['sockets']; 
	var cores = supercomputer_attributes[supercomputer]['cores']; 
	var threads_per_cores = supercomputer_attributes[supercomputer]['task_per_cores']; 
	
	//Get all parameter for tasks
	var task = document.getElementById('task').value; 
	var cpu_per_task = document.getElementById('cpu_per_task').value;
	var nodes = document.getElementById('nodes').value;
	var mode = document.getElementById("modus").value;
	
	//Get all parameter for bind options
	var cpu_bind = document.getElementById('cpu_bind').value;
	var distribution_node = document.getElementById('distribution_node').value; 
	var distribution_socket = document.getElementById('distribution_socket').value;
	var distribution_core = document.getElementById('distribution_core').value;
	var hint = document.getElementById('hint').value;
	
	var output = document.getElementById('output');
	
	setAffinityLink(supercomputer);
	setURL();
	
	//Validator
	var validator = new Validator(sockets, cores, threads_per_cores, task, cpu_per_task, nodes, cpu_bind, distribution_socket, distribution_core, hint);
	if(!validator.isValidOptions()){
		if(mode == 'task') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high</div>';
		if(mode == 'node') output.innerHTML = '<div id="warning">Output not possible. Possible Problems: <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of tasks is too high or <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of CPU \'s per task too high <br> <i class="fa fa-exclamation-triangle fa-fw"></i> Number of nodes too low</div>';
		return;
	}
	if(!validator.isValidDistribution()){
		output.innerHTML = "";		
		output.innerHTML = '<div id="warning"><i class="fa fa-cog fa-spin"></i> This version is currently not available</div>';
		return;
	}
	createCommand(nodes, task, cpu_per_task, sockets, cores, threads_per_cores, cpu_bind, distribution_node, distribution_socket, distribution_core, hint);
	switch(cpu_bind){
		case 'rank':
			var CPU_Bind = new Rank(nodes, sockets, cores, threads_per_cores, distribution_node, distribution_socket, hint, task, cpu_per_task);
			break;
		case 'rank_ldom':
			var CPU_Bind = new Rank_Ldom(nodes, sockets, cores, threads_per_cores, distribution_node, distribution_socket, hint, task);
			break;
		case 'threads':
			var CPU_Bind = new Threads(nodes, sockets, cores, threads_per_cores,
				distribution_node, distribution_socket, distribution_core, hint, task);
			break;
		case 'cores':
			var CPU_Bind = new Cores(nodes, sockets, cores, threads_per_cores,
				distribution_node, distribution_socket, distribution_core, hint, task, mode); //direkt array zurückliefern über funktion!!!
			break;
	}
	var tasks = createTasks(CPU_Bind, parseInt(task), parseInt(cpu_per_task), mode, hint);
	createContent(tasks, mode);
}


function createTasks(CPU_Bind, task_per_node, cpu_per_task, mode, hint){
	//create list with 0 and 1 for the task
	var nodes = parseInt(document.getElementById('nodes').value);
	var sockets = CPU_Bind.sockets; //Sockets 
	var cores = CPU_Bind.cores; // Cores
	var threads_per_cores = CPU_Bind.threads_per_cores; //virtuelle Cores
	
	if(mode == 'task'){ //Task-Mode
		//direkt bindet nutzen um doppelt erstellung zu vermeiden!!!
		//Create Task Array
		var tasks = new Array(task_per_node);
		for(var task=0; task<task_per_node; task++){ 
			tasks[task] = new Array(sockets);
			for(var socket=0; socket<sockets; socket++){
				var array_for_task = new Array(threads_per_cores);
				for(var thread=0; thread<threads_per_cores;thread++){
					array_for_task[thread] = new Array(cores);
				}
				tasks[task][socket] = array_for_task;
			}
		}
		//Fill the Task Array
		for(var task=0; task<task_per_node; task++){
			for(var cpu=0; cpu<cpu_per_task; cpu++){
				if(CPU_Bind.name == 'Cores' && hint=='-'){
					var [node, socket, x, core] = 
						CPU_Bind.getCoreToBind(task, cpu_per_task, cpu);
					for(var thread=0; thread<threads_per_cores; thread++){
						//if(tasks[task][socket][thread][core] != undefined){
						//	tasks[task][socket][thread][core] += "|" + task;
						//}else{
							tasks[task][socket][thread][core] = task;
						//}
					}
				}else{
					var [node, socket, thread, core] = 
						CPU_Bind.getCoreToBind(task, cpu_per_task, cpu);
					tasks[task][socket][thread][core] = task;
				}
				
			}
		}
	}else{ //Node-Mode
		//Create Task Array
		var tasks = new Array(nodes);
		for(var node=0; node<nodes; node++){
			tasks[node] = new Array(sockets);
			for(var socket=0; socket<sockets; socket++){
				var array_for_task = new Array(threads_per_cores);
				for(var thread=0; thread<threads_per_cores; thread++){
					array_for_task[thread] = new Array(cores);
				}
				tasks[node][socket] = array_for_task;
			}
		}
		
		//Fill the Task Array
		for(var task=0; task<task_per_node; task++){
			for(var cpu=0; cpu<cpu_per_task; cpu++){
				if(CPU_Bind.name == 'Cores' && hint=='-'){
					var [node, socket, x, core] = 
						CPU_Bind.getCoreToBind(task, cpu_per_task, cpu);
					for(var thread=0; thread<threads_per_cores; thread++){
						//if(tasks[node][socket][thread][core] != undefined){
						//	tasks[node][socket][thread][core] += "|" + task;
						//}else{
						tasks[node][socket][thread][core] = task;
						//}

					}
				}else{
					var [node, socket, thread, core] = 
						CPU_Bind.getCoreToBind(task, cpu_per_task, cpu);
					tasks[node][socket][thread][core] = task;
				}
				
			}
		}
	}
										
	return tasks;
}

/**
 * Create svg file to create content
 */
function createContent(tasks, mode){
	//get output div and empty
	var output = document.getElementById('output');
	output.innerHTML = "";
	
	//get needed width and height or a bit more
	var width = 30 + (tasks[0].length + (tasks[0].length*tasks[0][0][0].length))*22;
	var height = tasks.length * tasks[0][0].length * 90;
	// create the svg element
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    // set width and height
    svg.setAttribute("id", "content");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    
    if(tasks[0].length == 8) margin = 50; else margin = 20;
    for(var i=0; i<tasks.length; i++){ //Tasks/Nodes
		const headline = document.createElementNS("http://www.w3.org/2000/svg", "text");
	    headline.setAttribute("x", "10");
	    headline.setAttribute("y", margin + i*(tasks[i][0].length+2)*22);
	    headline.setAttribute("fill", "#023d6b");
	    headline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
	    if(mode == 'task') headline.textContent = 'Task '; else headline.textContent = 'Node ';
	    headline.textContent += i+':';
	    svg.appendChild(headline);
	    
		for(var j=0; j<tasks[i].length; j++){ //Sockets
			for(var k=0; k<tasks[i][j].length; k++){ //Threads
				for(var l=0; l<tasks[i][j][k].length; l++){ //Kerne
				    const core = document.createElementNS("http://www.w3.org/2000/svg", "rect");
				    core.setAttribute("x", 30 + j*(tasks[i][j][k].length+1)*22 + l*22);
				    core.setAttribute("y", margin + 10 + i*(tasks[i][j].length+2)*22 + k*22);
				    core.setAttribute("width", "20");
				    core.setAttribute("height", "20");
				    
				    const pin = document.createElementNS("http://www.w3.org/2000/svg", "text");
				    pin.setAttribute("x", 36 + j*(tasks[i][j][k].length+1)*22 + l*22);
				    pin.setAttribute("y", margin + 25 + i*(tasks[i][j].length+2)*22 + k*22);
				    pin.setAttribute("width", "30");
				    pin.setAttribute("height", "30");
				    
				    if(tasks[i][j][k][l] != undefined){
						pin.textContent = tasks[i][j][k][l];
						core.setAttribute("fill", styles.colors[parseInt(tasks[i][j][k][l])%9]);
						pin.setAttribute("fill", 'white');
					}else{
						if(tasks[i].length == 8){
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
	if(tasks[0].length == 8){
		var ids = [1, 0, 3, 2];
		for(var i=0; i<4; i++){
			const gpuheadline = document.createElementNS("http://www.w3.org/2000/svg", "text");
		    gpuheadline.setAttribute("x", 35 + (i*2+1)*(tasks[0][0][0].length+1)*22);
		    gpuheadline.setAttribute("y", 20);
		    gpuheadline.setAttribute("fill", "#023d6b");
		    gpuheadline.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		    gpuheadline.setAttribute("font-weight", "bold");
		    gpuheadline.textContent = 'Direct connection';
		    svg.appendChild(gpuheadline);
		    const gpuheadline2 = document.createElementNS("http://www.w3.org/2000/svg", "text");
		    gpuheadline2.setAttribute("x", 65 + (i*2+1)*(tasks[0][0][0].length+1)*22);
		    gpuheadline2.setAttribute("y", 40);
		    gpuheadline2.setAttribute("fill", "#023d6b");
		    gpuheadline2.setAttribute("font-family", "Arial, Helvetica, sans-serif");
		    gpuheadline2.setAttribute("font-weight", "bold");
		    gpuheadline2.textContent = 'to GPU '+ids[i];
		    svg.appendChild(gpuheadline2);
		    const gpurect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		    gpurect.setAttribute("x", 25 + (i*2+1)*(tasks[0][0][0].length+1)*22);
		    gpurect.setAttribute("y", margin);
		    gpurect.setAttribute("width", tasks[0][0][0].length*22 +8);
		    gpurect.setAttribute("height", tasks.length * 60 + (tasks.length-1)* 28);
		    gpurect.setAttribute("fill", "none");
		    gpurect.setAttribute("stroke", "#023d6b");
		    gpurect.setAttribute("stroke-width", "2");
		    svg.appendChild(gpurect);
		}
	}
    // attach container to document
    output.appendChild(svg);
}

/**
 * Create pinning from hex-mask
 */
function hex2Bin(hex){
	//zusammenführen um nicht zwei for scheifen zu haben ??!!!
	var supercomputer = document.getElementById('supercomputer').value;
	var sockets = supercomputer_attributes[supercomputer]['sockets']; //Sockets 
	var cores = supercomputer_attributes[supercomputer]['cores']; // Cores
	var threads_per_cores = supercomputer_attributes[supercomputer]['task_per_cores']; //virtuelle Cores
	//Create Task Array
	var tasks = new Array(1);
	tasks[0] = new Array(sockets);
	for(var socket=0; socket<sockets; socket++){
		var array_for_task = new Array(threads_per_cores);
		for(var thread=0; thread<threads_per_cores;thread++){
			array_for_task[thread] = new Array(cores);
		}
		tasks[0][socket] = array_for_task;
	}
	//hex to bin
	var all_cores = socket*cores*threads_per_cores;
	var sub = "0".repeat(all_cores);
	var dezi = BigInt(hex)
	var bin = ((sub + dezi.toString(2)).split("").reverse().join("")).substring(0,all_cores);
	//Fill Task Array
	var bit = 0;
	for(var thread=0; thread<threads_per_cores;thread++){
		for(var socket=0; socket<sockets; socket++){
			for(var core=0; core<cores; core++){
				if(bin[bit] == '1') tasks[0][socket][thread][core] = '0'
				bit++;
			}
		}
	}
	createContent(tasks, 'task');
	setURL();
}
