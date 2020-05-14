var colors = ['#7393dd', '#ff8200', '#0064b5', '#80c6ff', '#00467f',  '#b35b00', '#290aa3', '#ffc180' , '#1d0772']

var supercomputer_attributes = {'JUWELS': {'sockets': 2, 'cores': 24, 'task_per_cores': 2},
							    'JUWELS-GPU': {'sockets': 2, 'cores': 20, 'task_per_cores': 2},
							    'JURECA': {'sockets': 2, 'cores': 12, 'task_per_cores': 2}, 
							    'JURECA-BOOSTER': {'sockets': 1, 'cores': 68, 'task_per_cores': 4},
							    'JUSUF': {'sockets': 2, 'cores': 64, 'task_per_cores': 2},
							    'JUSUF-GPU': {'sockets': 2, 'cores': 64, 'task_per_cores': 2}}

window.onload = function () {
    const parameter = (window.location.search.slice(1)).toUpperCase();
	var supercomputer = document.getElementById('supercomputer');
	var opts = supercomputer.options;
	for (var opt, j = 0; opt = opts[j]; j++) {
	    if (opt.value == parameter) {
			supercomputer.selectedIndex = j;
	      	break;
	    }
	}
	generateNodeLayout();
}	

//when mode change, disabled changes					    
function switchMode(){
	if(document.getElementById("myonoffswitch").checked){
		document.getElementById("nodes").value = 1;
		document.getElementById("nodes").disabled = true;
	}else{
		document.getElementById("nodes").disabled = false;
	}
}

//when mode change, disabled changes	
function switchCPU_Bind(){
	var cpu_bind = document.getElementById('cpu_bind').value;
	document.getElementById('distribution_socket').disabled = (cpu_bind == 'threads' || cpu_bind == 'cores') ? false : true;
	document.getElementById('distribution_core').disabled = (cpu_bind == 'threads' || cpu_bind == 'cores') ? false : true;
}

function createLink(){
	var supercomputer = document.getElementById('supercomputer').value;
	var link = document.getElementById('affinity');
	
	switch(supercomputer){
		case('JUWELS'):
		case('JUWELS-GPU'):
			link.href = 'https://apps.fz-juelich.de/jsc/hps/juwels/affinity.html';
			break;
		case('JURECA'):
		case('JURECA-BOOSTER'):
			link.href = 'https://apps.fz-juelich.de/jsc/hps/jureca/affinity.html';
			break;
		case('JUSUF'):
		case('JUSUF-GPU'):
			link.href = 'https://apps.fz-juelich.de/jsc/hps/jusuf/cluster/affinity.html';
			break;
			
	}
	
}

//Generate visual simulation
function generateNodeLayout() {
	createLink();
	var task = document.getElementById('task').value; //Aufgaben
	var cpu_per_task = document.getElementById('cpu_per_task').value; //Kerne pro Aufgabe
	var nodes = document.getElementById('nodes').value;
	var supercomputer = document.getElementById('supercomputer').value;
	var sockets = supercomputer_attributes[supercomputer]['sockets']; //Sockets 
	var cores = supercomputer_attributes[supercomputer]['cores']; // Cores
	var threads_per_cores = supercomputer_attributes[supercomputer]['task_per_cores']; //virtuelle Cores
	var cpu_bind = document.getElementById('cpu_bind').value;
	var distribution_node = document.getElementById('distribution_node').value; 
	var distribution_socket = document.getElementById('distribution_socket').value;
	var distribution_core = document.getElementById('distribution_core').value;
	var mode = document.getElementById("myonoffswitch").checked;
	var hint = document.getElementById('hint').value;
	var output = document.getElementById('output');
	
	if(((((sockets*cores*nodes)/cpu_per_task) < task) && (hint=='nomultithread'))
		|| ((((sockets*cores*threads_per_cores*nodes)/cpu_per_task) < task) && (hint=='-'))){
		output.innerHTML = "";	
		if(mode) output.innerHTML = '<div id="warning">Output not possible. What you can do: <br> - Reduce number of tasks <br> - Reduce CPU \'s per task</div>';
		if(!mode) output.innerHTML = '<div id="warning">Output not possible. What you can do: <br> - Reduce number of tasks <br> - Reduce CPU \'s per task <br> - Raise number of nodes</div>';
	}else if((distribution_socket == "fcyclic") && (distribution_core == "cyclic")){
		output.innerHTML = "";		
		output.innerHTML = '<div id="warning">This version is currently not available</div>';
	}else{	
		createCommand(nodes, task, cpu_per_task, sockets, cores, threads_per_cores, cpu_bind, distribution_node, distribution_socket, distribution_core, hint);
		switch(cpu_bind){
			case 'rank':
				var CPU_Bind = new Rank(nodes, sockets, cores, threads_per_cores, distribution_node, hint, task);
				break;
			case 'rank_ldom':
				var CPU_Bind = new Rank_Ldom(nodes, sockets, cores, threads_per_cores, distribution_node, hint, task);
				break;
			case 'threads':
				var CPU_Bind = new Threads(nodes, sockets, cores, threads_per_cores,
					distribution_node, distribution_socket, distribution_core, hint, task);
				break;
			case 'cores':
				var CPU_Bind = new Cores(nodes, sockets, cores, threads_per_cores,
					distribution_node, distribution_socket, distribution_core, hint, task, mode);
				break;
		}
		var tasks = createTasks(CPU_Bind, parseInt(task), parseInt(cpu_per_task), mode, hint);
		createTableContent(tasks, mode);
	}
	
	
	
}

//create list with 0 and 1 for the task
function createTasks(CPU_Bind, task_per_node, cpu_per_task, mode, hint){
	var nodes = parseInt(document.getElementById('nodes').value);
	var sockets = CPU_Bind.sockets; //Sockets 
	var cores = CPU_Bind.cores; // Cores
	var threads_per_cores = CPU_Bind.threads_per_cores; //virtuelle Cores
	
	if(mode){ //Task-Mode
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
						if(tasks[task][socket][thread][core] != undefined){
							tasks[task][socket][thread][core] += "|" + task;
						}else{
							tasks[task][socket][thread][core] = task;
						}
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
						if(tasks[node][socket][thread][core] != undefined){
							tasks[node][socket][thread][core] += "|" + task;
						}else{
							tasks[node][socket][thread][core] = task;
						}

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

function createCommand(nodes, task, cpu_per_task, sockets, cores, threads_per_cores, cpu_bind, distribution_node, distribution_socket, distribution_core, hint){
	var command = document.getElementById('command');
	command.innerHTML = "";
	var p = document.createElement('code');
	p.innerHTML = '-N ' + nodes + ' -n ' + task + ' -c ' + cpu_per_task + ' --cpu-bind=' + cpu_bind + 
				 ' --distribution=' + distribution_node + ':' + distribution_socket + ':' + distribution_core;
	if(hint != '-') p.innerHTML +=  ' --hint=' + hint;
	
	p.style.textAlign = "center";
	command.appendChild(p);
	command.style.display = 'block';
	command.style.background = '#f0f0f0';
}

//create the table for the task
function createTableContent(tasks, mode){
	var ScreenWidth = window.innerWidth;
	var output = document.getElementById('output');
	output.innerHTML = "";
	for(var i=0; i<tasks.length; i++){
		var task = tasks[i];
		var h5 = document.createElement("h5");
		if(mode) h5.innerHTML = 'Task '+ i + ':<br>'; else h5.innerHTML = 'Node '+ i + ':<br>';
		h5.style.positon = 'absolute';
		h5.style.margin = '0px';
		var div = document.createElement('div');
		div.setAttribute('class', 'task');
		div.style.marginLeft = '10px';
		//div.style.float = 'right';
		div.appendChild(h5);
		for(var j=0; j<task.length; j++){
			var socket = task[j];
			var table = document.createElement('table');
			for(var k=0; k<socket.length; k++){
				var row = table.insertRow();
				for(var l=0; l<socket[k].length; l++){
					var cell = row.insertCell(l);
					if(socket[k][l] != undefined){
						cell.innerHTML = socket[k][l];
						cell.style.backgroundColor = colors[parseInt(socket[k][l])%9];
						cell.style.color = 'white';
					}else{
						cell.innerHTML = 'x';
					}
				}
			}
			if(j==0){
				table.style.marginLeft = '20px';
			}else{
				table.style.paddingLeft = '10px';
			}
			div.appendChild(table);
		}
		output.appendChild(div);

	}
	
}
