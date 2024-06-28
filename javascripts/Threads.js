class Threads {
	constructor(options){
		this.options = options;
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
				var [outer_pos, socket, thread, core] = this.getCoreToBind(tasks, task, cpu);
				if(this.isBinded(tasks, outer_pos, socket, thread, core)){
					[outer_pos, socket, thread, core] = this.getNextUnbindedCore(tasks, task);
				}
				tasks[outer_pos][socket][thread][core] = task;
			}
		}
		return tasks;
	}
	
	getCoreToBind(tasks, task, cpu){
		var node, socket, thread, core, start_index = 0, task_number, current, tasks_in_node;
		// Distributon-Node
		if(this.options["distribution_node"] == 'block'){
			node = this.node_allocation[task]
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index
		}else{
			node = task%this.options["nodes"];
			task_number = parseInt(task/this.options["nodes"]);
		}
		var shift = parseInt(task_number/this.options["sockets"])
		current = task_number*this.options["cpu_per_task"]+cpu;
		tasks_in_node = Math.floor(this.options["task"]/this.options["nodes"]);
		if (node < this.options["task"]%this.options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}
		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;

		
		// Distribution Socket Block
		var number_of_cores = Math.ceil(tasks_in_node * this.options["cpu_per_task"] / this.options["threads_per_core"]);
		if(this.options["distribution_socket"] == 'block'){
			switch(this.options["distribution_core"]){
				case('block'):
					thread =current%this.options["threads_per_core"];
					core = Math.floor(current/this.options["threads_per_core"])%this.options["cores"];
					socket = Math.floor(current/(this.options["threads_per_core"]*this.options["cores"]))%this.options["sockets"];
					break;
				case('cyclic'):
					thread = cpu%this.options["threads_per_core"]; 
					core = (task_number*Math.round(this.options["cpu_per_task"]/this.options["threads_per_core"])+Math.floor(cpu/this.options["threads_per_core"]))%this.options["cores"] 
					socket = Math.floor((task_number*(this.options["cpu_per_task"]+this.options["cpu_per_task"]%this.options["threads_per_core"])+cpu)/(this.options["cores"]*this.options["threads_per_core"]))%this.options["sockets"];
					if (socket == Math.floor(number_of_cores / this.options["cores"]) && core >= number_of_cores % this.options["cores"]) 
						return this.getNextUnbindedCore(tasks, task);
					break;
				case('fcyclic'):
					if(this.options["cores"]%this.options["cpu_per_task"]==0 || this.options["cpu_per_task"]%this.options["cores"]==0){
						thread = Math.floor(current/number_of_cores)%this.options["threads_per_core"];
						if (number_of_cores % this.options["cpu_per_task"] == 0 || this.options["cpu_per_task"] % number_of_cores == 0) {
							socket = Math.floor((current - thread * number_of_cores) / this.options["cores"]);
							core = (current - thread * number_of_cores) % this.options["cores"]; 
						} else {
							socket = Math.floor(current/this.options["cores"])%this.options["sockets"];
							var cores_in_socket = (socket < Math.floor(number_of_cores/this.options["cores"])) ? this.options["cores"] : number_of_cores%this.options["cores"]
							core = current%number_of_cores; 
						}
					}else{
						socket = Math.floor(current/(this.options["cores"]*this.options["sockets"]))%this.options["sockets"];
						var cores_in_socket = (socket < Math.floor(number_of_cores/this.options["cores"])) ? this.options["cores"] : number_of_cores%this.options["cores"]
						var current_in_socket = current - socket * this.options["cores"] * this.options["threads_per_core"]
						core = current_in_socket%cores_in_socket; 
						thread = Math.floor(current_in_socket/cores_in_socket)%this.options["threads_per_core"];
					}
					break;
			}
		// Distribution Socket Cyclic 
		}else if(this.options["distribution_socket"] == 'cyclic'){
			socket = task_number%this.options["sockets"];
			switch(this.options["distribution_core"]){
				case('block'):
					core = Math.floor((cpu+shift*this.options["cpu_per_task"])/this.options["threads_per_core"])%this.options["cores"];
					thread = (cpu+shift*this.options["cpu_per_task"])%this.options["threads_per_core"];
					break;
				case('cyclic'): 
					thread = cpu%this.options["threads_per_core"];
					core = (shift*Math.round(this.options["cpu_per_task"]/this.options["threads_per_core"])+Math.floor(cpu/this.options["threads_per_core"]));
					
					var full_tasks = Math.floor(number_of_cores/Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"]))
					var cores_per_socket = this.getCoresPerSocket()
					
					if (core >= cores_per_socket[socket]) {
						if ((tasks_in_node - full_tasks) * this.options["cpu_per_task"] > full_tasks || task_number < full_tasks) {
							socket = (socket + 1) % this.options["sockets"]
						}
						for (var s = socket; s < socket + this.options["sockets"]; s++) {
							for(var core=0; core<cores_per_socket[s%this.options["sockets"]]; core++){
								for(var thread=0; thread<this.options["threads_per_core"]; thread++){
									if(!this.isBinded(tasks,outer_pos, this.socket_arr[s%this.options["sockets"]], thread, core)){
										return [outer_pos, this.socket_arr[s%this.options["sockets"]], thread, core];
									}
								}
							}
						}
					}
					break;
				case('fcyclic'):
					var full_tasks = Math.floor(number_of_cores/Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"]))
					var cores_per_socket = this.getCoresPerSocket()
					if (cores_per_socket[socket] == 0) {
						[node, socket, thread, core] = this.getNextUnbindedCore(tasks, task)
						break
					}
					let task_in_socket = Math.floor(task_number / this.options["sockets"])
					let cpu_in_socket = task_in_socket * this.options["cpu_per_task"]+ cpu
					thread = Math.floor(cpu_in_socket / cores_per_socket[socket]) % this.options["threads_per_core"]
					core = cpu_in_socket % cores_per_socket[socket]
					break;
			}
		// Distribution Socket Fcyclic
		}else if(this.options["distribution_socket"] == 'fcyclic'){
			socket = current%this.options["sockets"];
			switch(this.options["distribution_core"]){
				case('block'): 
					core = Math.floor(current/(this.options["threads_per_core"]*this.options["sockets"])) 
					thread = Math.floor(current/this.options["sockets"])%this.options["threads_per_core"]
					break;
				case('cyclic'): 
					if (this.options["cpu_per_task"] % this.options["sockets"] == 0) {
						shift = Math.ceil(this.options["cpu_per_task"] / (this.options["sockets"] * this.options["threads_per_core"]))
						core = task_number * shift +Math.floor(cpu / (this.options["sockets"] * this.options["threads_per_core"]))
					} else {
						shift = Math.ceil(this.options["cpu_per_task"] / this.options["threads_per_core"])
						var current_in_socket = Math.floor(current/this.options["sockets"])
						core = shift * Math.floor(current_in_socket/this.options["cpu_per_task"]) + Math.floor((current_in_socket%this.options["cpu_per_task"])/this.options["threads_per_core"])
					}
					thread = Math.floor((cpu+(task_number * this.options["cpu_per_task"]) % this.options["sockets"])/this.options["sockets"])%this.options["threads_per_core"]
					//TODO: Auffüllen der Lüclen
					break;
				case('fcyclic'): 
					core = Math.floor((current%number_of_cores)/(this.options["sockets"]))
					socket = (this.options["cpu_per_task"] != 1) ? (current%number_of_cores)%this.options["sockets"]: socket
					thread = Math.floor(current / number_of_cores)
					break;
			}
		}

		socket = this.socket_arr[socket];
			
		return [outer_pos, socket, thread, core];
	}
	
	getNextUnbindedCore(tasks, task){
		var cores_per_socket = this.getCoresPerSocket()
		if(this.options["distribution_node"] == 'block'){
			var node = this.node_allocation[task];
		}else{
			var node = task%this.options["nodes"];
		}
		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;
		for(var socket=0; socket<this.options["sockets"]; socket++){
			for(var core=0; core<cores_per_socket[socket]; core++){
				for(var thread=0; thread<this.options["threads_per_core"]; thread++){
					if(!this.isBinded(tasks, outer_pos, this.socket_arr[socket], thread, core)){
						return [outer_pos, this.socket_arr[socket], thread, core];
					}
				}
			}
			
		}
		
		return null;
	}

	getCoresPerSocket() {
		var number_of_cores = Math.ceil(Math.floor(this.options["task"]/this.options["nodes"]) * this.options["cpu_per_task"] / this.options["threads_per_core"]);
		var cores_per_socket = new Array(this.options["sockets"]);
		if (this.options["distribution_socket"] == "cyclic") {
			var full_tasks = Math.floor(number_of_cores/Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"]))
			for (var s = 0; s < this.options["sockets"]; s++) {
				cores_per_socket[s] = Math.floor(full_tasks/this.options["sockets"]) * Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"])
				if (s < full_tasks % this.options["sockets"]) cores_per_socket[s] += Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"])
			}
			if ((Math.floor(this.options["task"]/this.options["nodes"]) - full_tasks) * this.options["cpu_per_task"] > full_tasks) {
				cores_per_socket[full_tasks%this.options["sockets"]] += Math.ceil(((Math.floor(this.options["task"]/this.options["nodes"]) - full_tasks) * this.options["cpu_per_task"] - full_tasks)/this.options["threads_per_core"])
			}
			for (var s = 0; s < this.options["sockets"]; s++) {
				if (cores_per_socket[s] > this.options["cores"]) {
					cores_per_socket[s+1] += cores_per_socket[s] - this.options["cores"];
					cores_per_socket[s] = this.options["cores"]
				}
			}
		} else {
			for (var s = 0; s < this.options["sockets"]; s++) {
				cores_per_socket[s] = this.options["cores"]
			}
		}
		return cores_per_socket
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
