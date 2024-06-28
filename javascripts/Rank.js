class Rank {
	constructor(options){
		this.options = options
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
				tasks[outer_pos][socket][thread][core] = task;
			}
		}
		return tasks;
	}
	
	getCoreToBind(task, cpu){ 
		var node, socket, core, thread, number_of_cores, cores_per_socket, start_index = 0, task_number, current, tasks_in_node;
		
		//Distribution-Node
		if(this.options["distribution_node"] == 'block'){
			node = this.node_allocation[task];
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index;
		}else{
			node = task%this.options["nodes"];
			task_number = Math.floor(task/this.options["nodes"]);
		}

		current = task_number*this.options["cpu_per_task"]+cpu;
		tasks_in_node = Math.floor(this.options["task"]/this.options["nodes"]);
		tasks_in_node += (node < this.options["task"]%this.options["nodes"]) ? 1 : 0

		//Distribution-Socket
		number_of_cores = Math.ceil(tasks_in_node * this.options["cpu_per_task"] / this.options["threads_per_core"]);
		thread = Math.floor(current/number_of_cores);
		//Block 
		if(this.options["distribution_socket"] == 'block'){
			socket = Math.floor((current - thread * number_of_cores) / this.options["cores"]);
			core = (current - thread * number_of_cores) % this.options["cores"]; 
		//Cyclic 
		}else if(this.options["distribution_socket"] == 'cyclic'){
			var cores_per_socket = new Array(this.options["sockets"]);
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

			var sum = 0
			for (var t = 0; t < this.options["threads_per_core"]; t++){
				for (var s = 0; s < this.options["sockets"]; s++) {
					sum += cores_per_socket[s]
					if (current < sum) {
						socket = s
						break
					}
				}
				if (current < sum) break
			}

			var used_cores = thread * number_of_cores
			for (var s = 0; s < socket; s++) {
				used_cores += cores_per_socket[s]
			}
			core = (current - used_cores) % cores_per_socket[socket]; 
		//Fcyclic
		}else if(this.options["distribution_socket"] == 'fcyclic'){
			cores_per_socket = Math.ceil(number_of_cores / this.options["sockets"]);
			socket = Math.floor((current - thread * number_of_cores) / cores_per_socket); 
			core = (current - thread * number_of_cores) % cores_per_socket;
		}

		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;
		return [outer_pos, this.socket_arr[socket], thread, core];
	}
}
