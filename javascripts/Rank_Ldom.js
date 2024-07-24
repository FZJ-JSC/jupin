class Rank_Ldom {
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
		this.last = [-1,-1]
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
				this.last = [task, socket]
				tasks[outer_pos][socket][thread][core] = task;
			}
		}
		return tasks;
	}
	
	getCoreToBind(tasks, task, cpu){
		var node, socket, core, thread, cores_per_socket, start_index = 0, task_number, current, tasks_in_node;
		
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
		core = Math.floor((Math.floor(task_number / this.options["sockets"]) * this.options["cpu_per_task"] + cpu) / this.options["threads_per_core"]);
		thread = (Math.floor(task_number / this.options["sockets"]) * this.options["cpu_per_task"] + cpu) % this.options["threads_per_core"];
		cores_per_socket = this.getCoresPerSocket();
		//Block 
		if(this.options["distribution_socket"] == 'block'){
			var number_of_sockets = Math.ceil(tasks_in_node * this.options["cpu_per_task"]/(this.options["cores"] * this.options["threads_per_core"]))
			socket = task_number % number_of_sockets;
			if (core >= cores_per_socket[socket]) return this.getNextUnbindedCore(tasks,task);
		//Cyclic 
		}else if(this.options["distribution_socket"] == 'cyclic'){
			socket = task_number % this.options["sockets"];
			if (core >= this.options["cores"]) core = this.options["cores"] - 1; 
			thread = (Math.floor(task_number / this.options["sockets"]) * this.options["cpu_per_task"] + cpu) % this.options["threads_per_core"];
		//Fcyclic
		}else if(this.options["distribution_socket"] == 'fcyclic'){
			socket = task_number % this.options["sockets"];
			while (core >= cores_per_socket[socket]) {
				socket  = socket + 1;
				var diff = (core - cores_per_socket[socket]) * this.options["threads_per_core"] + thread;
				core = Math.floor((Math.floor(task_number / this.options["sockets"]) * this.options["cpu_per_task"] + diff) / this.options["threads_per_core"]);
				thread = (Math.floor(task_number / this.options["sockets"]) * this.options["cpu_per_task"] + diff) % this.options["threads_per_core"];
			}
		}

		socket = this.socket_arr[socket];
		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;
		return [outer_pos, socket, thread, core];
	}
	
	getNextUnbindedCore(tasks, task, overflow = false){
		//Distribution-Node
		if(this.options["distribution_node"] == 'block'){
			var node = this.node_allocation[task]
		}else{
			var node = task%this.options["nodes"];
		}
		if(this.options["mode"] == "task") var outer_pos = task; else var outer_pos = node;

		//get unbinded core
		var cores_per_socket = this.getCoresPerSocket()
		var socket = this.socket_arr.indexOf(this.last[1])
		//change socket, if new task
		if (this.last[0] != task || overflow) {
			socket = (socket + 1) % this.options["sockets"]
		}
		for (var s = socket; s < socket + this.options["sockets"]; s++) {
			for(var core=0; core<cores_per_socket[s%this.options["sockets"]]; core++){
				for(var thread=0; thread<this.options["threads_per_core"]; thread++){
					if(!this.isBinded(tasks,outer_pos, this.socket_arr[s%this.options["sockets"]], thread, core)){
						return [outer_pos, s%this.options["sockets"], thread, core];
					}
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

	getCoresPerSocket() {
		var cores_per_socket = new Array(this.options["sockets"]).fill(0);
		if(this.options["distribution_node"] == 'block'){
			var node = this.node_allocation[task]
		}else{
			var node = task%this.options["nodes"];
		}
		var tasks_in_node = Math.floor(this.options["task"]/this.options["nodes"]);
		if (node < this.options["task"]%this.options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}
		if (this.options["distribution_socket"] == "cyclic") {
			var block = Math.ceil(this.options["cpu_per_task"]/this.options["threads_per_core"])
			var number_of_blocks = Math.floor((tasks_in_node*this.options["cpu_per_task"])/(block*this.options["threads_per_core"]))
			var socket = 0

			//allocate core-blocks
			for (var b = 0; b < number_of_blocks; b++) {
				cores_per_socket[socket] += block
				//if socket completely filled, use next socket
				while (cores_per_socket[socket] > this.options["cores"]) {
					var tmp = cores_per_socket[socket] - this.options["cores"]
					cores_per_socket[socket] = this.options["cores"]
					socket = (socket+1)%this.options["sockets"]
					cores_per_socket[socket] += tmp
				}
				socket = (socket+1)%this.options["sockets"]
			}

			//allocate remaining cores
			cores_per_socket[socket] += Math.ceil(((this.options["task"]*this.options["cpu_per_task"])%(block*this.options["threads_per_core"]))/this.options["threads_per_core"])
			//if socket completely filled, use next socket
			while (cores_per_socket[socket] > this.options["cores"]) {
				var tmp = cores_per_socket[socket] - this.options["cores"]
				cores_per_socket[socket] = this.options["cores"]
				socket = (socket+1)%this.options["sockets"]
				cores_per_socket[socket] += tmp
			}
		} else {
			//allocate full sockets
			for (var socket = 0; socket < this.options["sockets"]; socket++) {
				cores_per_socket[socket] = this.options["cores"]
			}
		}
		return cores_per_socket
	}
}
