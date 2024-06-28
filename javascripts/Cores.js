class Cores {
	constructor(options){
		this.options = options;
		this.name = 'Cores';
		if(this.options["sockets"] == 8){
			this.socket_arr = [3, 1, 7, 5, 2, 0, 6, 4]
		}else{
			this.socket_arr = new Array(this.options["sockets"])
			for(var i=0; i<this.options["sockets"]; i++){
				this.socket_arr[i] = i;
			}
		}
		this.node_allocation = {}; //task->node
		var task_number = 0;
		for(var node=0; node<this.options["nodes"]; node++){
			for(var k=0; k < parseInt(this.options["task"]/this.options["nodes"]); k++){
				this.node_allocation[task_number] = node;
				task_number++;
			}
			if(node<(this.options["task"]%this.options["nodes"])){
				this.node_allocation[task_number] = node;
				task_number++;
			}
		}
	}

	getPinning() {
		if(this.options["mode"] == "node") var outer_level = this.options["nodes"]; 
		else var outer_level = this.options["task"]; //Tasks/Nodes

		//Create Task Array
		var tasks = new Array(outer_level);
		for(var outer=0; outer<outer_level; outer++){ 
			tasks[outer] = new Array(this.options["sockets"]);
			for(var socket=0; socket<this.options["sockets"]; socket++){
				var array_for_task = new Array(document.getElementById("threads_per_core").max);
				for(var thread=0; thread<document.getElementById("threads_per_core").max;thread++){
					array_for_task[thread] = new Array(this.options["cores"]);
				}
				tasks[outer][socket] = array_for_task;
			}
		}

		//Fill the Task Array
		for(var task=0; task<this.options["task"]; task++){
			for(var cpu=0; cpu<this.options["cpu_per_task"]; cpu++){
				var [outer_pos, socket, thread, core] = this.getCoreToBind(task, cpu);
				if (this.options["threads_per_core"] != 1) {
					for(var t = 0; t < this.options["threads_per_core"]; t++)
						tasks[outer_pos][socket][t][core] = task;
				} else {
					if(this.isBinded(tasks, outer_pos, socket, thread, core)){
						[outer_pos, socket, thread, core] = this.getNextUnbindedCore(tasks, task);
					}
					tasks[outer_pos][socket][thread][core] = task;
				}
				
			}
		}
		return tasks;
	}
	
	getCoreToBind(task, cpu){
		var outer_pos,node, socket, thread, core, start_index = 0, task_number;
		// Distributon-Node
		if(this.options["mode"] == 'Task' || this.options["distribution_node"] == 'block'){
			node = this.node_allocation[task]
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index
		}else{
			node = task%this.options["nodes"];
			task_number = parseInt(task/this.options["sockets"]);
		}
		var shift = parseInt(task_number/this.options["sockets"])
		
		// Distribution Socket Block
		if(this.options["distribution_socket"] == 'block'){
			if(this.options["threads_per_core"]==1){
				switch(this.options["distribution_core"]){
					case('block'):
						thread =(cpu+(task_number*this.options["cpu_per_task"]))%this.options["threads_per_core"];
						core = parseInt((cpu+(task_number*this.options["cpu_per_task"]))/this.options["threads_per_core"])%this.options["cores"];
						socket = this.socket_arr[parseInt((task_number*this.options["cpu_per_task"]+cpu)/
							(this.options["threads_per_core"]*this.options["cores"]))%this.options["sockets"]];
						break;
					case('cyclic'):
						thread = cpu%this.options["threads_per_core"]; 
						core = (task_number*parseInt(this.options["cpu_per_task"]/this.options["threads_per_core"]+0.5)
								+parseInt(cpu/this.options["threads_per_core"]))%this.options["cores"] 
						socket = this.socket_arr[parseInt((task_number*(this.options["cpu_per_task"]+this.options["cpu_per_task"]%
							this.options["threads_per_core"])+cpu)/(this.options["cores"]*this.options["threads_per_core"]))%this.options["sockets"]];
						break;
					case('fcyclic'):
						if(this.options["cores"]%this.options["cpu_per_task"]==0 || this.options["cpu_per_task"]%this.options["cores"]==0){
							core = (task_number*this.options["cpu_per_task"]+cpu)%this.options["cores"]; 
							thread = parseInt((task_number*this.options["cpu_per_task"]+cpu)/
										(this.options["cores"]*this.options["sockets"]))%this.options["threads_per_core"]
							socket = this.socket_arr[parseInt((task_number*this.options["cpu_per_task"]+cpu)/
										this.options["cores"])%this.options["sockets"]];
						}else{
							core = (task_number*this.options["cpu_per_task"]+cpu)%this.options["cores"]; 
							thread = parseInt((task_number*this.options["cpu_per_task"]+cpu)/
										this.options["cores"])%this.options["threads_per_core"];
							socket = this.socket_arr[parseInt((task_number*this.options["cpu_per_task"]+cpu)/
										(this.options["cores"]*this.options["sockets"]))%this.options["sockets"]];
						}
						break;
				}
			}else{
				core = (task_number*this.options["cpu_per_task"]+cpu)%this.options["cores"];
				thread = 0;
				socket = parseInt((task_number*this.options["cpu_per_task"]+cpu)/this.options["cores"])%this.options["sockets"];
			}
			
		// Distribution Socket Cyclic
		}else if(this.options["distribution_socket"] == 'cyclic'){
			socket = this.socket_arr[task_number%this.options["sockets"]] + 
					parseInt(((parseInt(task_number/this.options["sockets"])*this.options["cpu_per_task"])+cpu)/(this.options["cores"]*this.options["threads_per_core"]))%this.options["sockets"];
			if(this.options["threads_per_core"]!= 1){
				switch(this.options["distribution_core"]){
					case('block'):
						core = parseInt((cpu+(shift*this.options["cpu_per_task"]))/this.options["threads_per_core"])%this.options["cores"];
						thread = (cpu+(shift*this.options["cpu_per_task"]))%this.options["threads_per_core"];
						break;
					case('cyclic'):
						thread = cpu%this.options["threads_per_core"] ;
						core = (parseInt(task_number/this.options["sockets"])*parseInt(this.options["cpu_per_task"]/this.options["threads_per_core"]+0.5)
											+parseInt(cpu/this.options["threads_per_core"]))%this.options["cores"];
						break;
					case('fcyclic'):
						core = ((parseInt(task_number/this.options["sockets"])*this.options["cpu_per_task"])+cpu)%this.options["cores"];
						thread = parseInt(((parseInt(task_number/this.options["sockets"])*this.options["cpu_per_task"])+cpu)/(this.options["cores"]))%this.options["threads_per_core"];
						break;
				}
			}else{
				core = (parseInt(task_number/this.options["sockets"])*this.options["cpu_per_task"]+cpu)%this.options["cores"];
				socket = socket + parseInt(((parseInt(task_number/this.options["sockets"])*this.options["cpu_per_task"])+cpu)/(this.options["cores"]))%this.options["sockets"];
				thread = 0;
			}
		// Distribution Socket Fcyclic
		}else if(this.options["distribution_socket"] == 'fcyclic'){
			if(this.options["threads_per_core"]!=1){
				socket = this.socket_arr[(cpu+task_number)%this.options["sockets"]];
				switch(this.options["distribution_core"]){
					case('block'):
						core = parseInt(((task_number*this.options["cpu_per_task"])+cpu)/(this.options["threads_per_core"]*this.options["sockets"])) 
						thread = parseInt(((task_number*this.options["cpu_per_task"])+cpu)/this.options["sockets"])%this.options["threads_per_core"]
						break;
					case('fcyclic'):
						core = parseInt(((task_number*this.options["cpu_per_task"])+cpu)/(this.options["sockets"]))%this.options["cores"];
						thread = parseInt((parseInt(((task_number*this.options["cpu_per_task"])+cpu)/
								(this.options["sockets"]))/this.options["cores"])%this.options["threads_per_core"])%this.options["threads_per_core"];
						break;
				}
			}else{
				core = parseInt(((task_number*this.options["cpu_per_task"])+cpu)/(this.options["sockets"]))%this.options["cores"];
				thread = 0;
				socket = this.socket_arr[(cpu+task_number)%this.options["sockets"]];
			}
		}
		if(this.options["mode"] == "task") outer_pos = task; else outer_pos = node;
		return [outer_pos, socket, thread, core];
		
	}
	
	getNextUnbindedCore(tasks, task){
		if(this.options["distribution_node"] == 'block'){
			var node = this.node_allocation[task];
		}else{
			var node = task%this.options["nodes"];
		}
		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;
		for(var socket=0; socket<this.options["sockets"]; socket++){
			for(var core=0; core<this.options["cores"]; core++){
				if(!this.isBinded(tasks, outer_pos, this.socket_arr[socket], 0, core)){
					return [outer_pos, this.socket_arr[socket], 0, core];
				}
			}
			
		}
		
		return null;
	}
	
	isBinded(tasks, outer_pos, socket, thread, core){
		if (this.options["mode"] == "node") {
			return tasks[outer_pos][socket][thread][core]!= undefined
		} else {
			for(var task=0; task<this.options["task"]; task++){
				if (tasks[task][socket][thread][core] != undefined) return true;
			}
			return false;
		}
	}
}
