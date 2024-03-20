class Threads {
	constructor(nodes, sockets, cores, threads, distribution_node, 
		distribution_socket, distribution_core, threads_per_core, task){
		this.nodes = nodes;
		this.sockets = sockets;
		if(sockets == 8){
			this.socket_arr = [3, 1, 7, 5, 2, 0, 6, 4]
		}else{
			this.socket_arr = new Array(sockets)
			for(var i=0; i<sockets; i++){
				this.socket_arr[i] = i;
			}
		}
		this.cores = cores;
		this.threads = threads;
		this.distribution_node = distribution_node;
		this.distribution_socket = distribution_socket;
		this.distribution_core = distribution_core;
		this.tasks = task;
		this.threads_per_core = threads_per_core

		this.binded = new Array(nodes);
		for(var node=0; node<nodes; node++){
			this.binded[node] = new Array(sockets);
			for(var socket=0; socket<sockets; socket++){
				var array_for_task = new Array(threads);
				for(var thread=0; thread<threads; thread++){
					array_for_task[thread] = new Array(cores);
					for(var core=0; core<cores; core++){
						array_for_task[thread][core] = 'n';
					}
				}
				this.binded[node][socket] = array_for_task;
			}
		}
		this.node_allocation = {}; //task->node
		var task_number = 0;
		for(var node=0; node<this.nodes; node++){
			for(var k=0; k < Math.floor(task/this.nodes); k++){
				this.node_allocation[task_number] = node;
				task_number++;
			}
			if(node<(task%this.nodes)){
				this.node_allocation[task_number] = node;
				task_number++;
			}
		}
	}
	
	getCoreToBind(task, cpu_per_task, cpu){
		var node, socket, thread, core, start_index = 0, task_number, current, tasks_in_node;
		// Distributon-Node
		if(this.distribution_node == 'block'){
			node = this.node_allocation[task]
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index
		}else{
			node = task%this.nodes;
			task_number = Math.floor(task/this.nodes);
		}
		var shift = Math.floor(task_number/this.sockets)

		current = task_number*cpu_per_task+cpu;
		tasks_in_node = Math.floor(this.tasks/this.nodes);
		if (node < this.tasks%this.nodes) {
			tasks_in_node = tasks_in_node +1;
		}
		
		// Distribution Socket Block
		var number_of_cores = Math.ceil(tasks_in_node * cpu_per_task / this.threads_per_core);
		if(this.distribution_socket == 'block'){
			switch(this.distribution_core){
				case('block'):
					thread =current%this.threads_per_core;
					core = Math.floor(current/this.threads_per_core)%this.cores;
					socket = Math.floor(current/(this.threads_per_core*this.cores))%this.sockets;
					break;
				case('cyclic'):
					thread = cpu%this.threads_per_core; 
					core = (task_number*Math.round(cpu_per_task/this.threads_per_core)+Math.floor(cpu/this.threads_per_core))%this.cores 
					socket = Math.floor((task_number*(cpu_per_task+cpu_per_task%this.threads_per_core)+cpu)/(this.cores*this.threads_per_core))%this.sockets;
					if (socket == Math.floor(number_of_cores / this.cores) && core >= number_of_cores % this.cores) 
						return this.getNextUnbindedCore(task, cpu_per_task, cpu);
					break;
				case('fcyclic'):
					if(this.cores%cpu_per_task==0 || cpu_per_task%this.cores==0){
						thread = Math.floor(current/number_of_cores)%this.threads_per_core;
						if (number_of_cores % cpu_per_task == 0 || cpu_per_task % number_of_cores == 0) {
							socket = Math.floor((current - thread * number_of_cores) / this.cores);
							core = (current - thread * number_of_cores) % this.cores; 
						} else {
							socket = Math.floor(current/this.cores)%this.sockets;
							var cores_in_socket = (socket < Math.floor(number_of_cores/this.cores)) ? this.cores : number_of_cores%this.cores
							core = current%number_of_cores; 
						}
					}else{
						socket = Math.floor(current/(this.cores*this.sockets))%this.sockets;
						var cores_in_socket = (socket < Math.floor(number_of_cores/this.cores)) ? this.cores : number_of_cores%this.cores
						var current_in_socket = current - socket * this.cores * this.threads_per_core
						core = current_in_socket%cores_in_socket; 
						thread = Math.floor(current_in_socket/cores_in_socket)%this.threads_per_core;
					}
					break;
			}
		// Distribution Socket Cyclic 
		}else if(this.distribution_socket == 'cyclic'){
			socket = task_number%this.sockets;
			switch(this.distribution_core){
				case('block'):
					core = Math.floor((cpu+shift*cpu_per_task)/this.threads_per_core)%this.cores;
					thread = (cpu+shift*cpu_per_task)%this.threads_per_core;
					break;
				case('cyclic'): 
					thread = cpu%this.threads_per_core ;
					core = (shift*Math.round(cpu_per_task/this.threads_per_core)+Math.floor(cpu/this.threads_per_core));
					
					var full_tasks = Math.floor(number_of_cores/Math.ceil(cpu_per_task/this.threads_per_core))
					var cores_per_socket = new Array(this.sockets);
					for (var s = 0; s < this.sockets; s++) {
						cores_per_socket[s] = Math.floor(full_tasks/this.sockets) * Math.ceil(cpu_per_task/this.threads_per_core)
						if (s < full_tasks % this.sockets) cores_per_socket[s] += Math.ceil(cpu_per_task/this.threads_per_core)
					}
					if ((tasks_in_node - full_tasks) * cpu_per_task > full_tasks) {
						cores_per_socket[full_tasks%this.sockets] += Math.ceil(((tasks_in_node - full_tasks) * cpu_per_task - full_tasks)/this.threads_per_core)
					}
					for (var s = 0; s < this.sockets; s++) {
						if (cores_per_socket[s] > this.cores) {
							cores_per_socket[s+1] += cores_per_socket[s] - this.cores;
							cores_per_socket[s] = this.cores
						}
					}
					
					if (core >= cores_per_socket[socket]) {
						if ((tasks_in_node - full_tasks) * cpu_per_task > full_tasks || task_number < full_tasks) {
							socket = (socket + 1) % this.sockets
						}
						for (var s = socket; s < socket + this.sockets; s++) {
							for(var core=0; core<cores_per_socket[s%this.sockets]; core++){
								for(var thread=0; thread<this.threads_per_core; thread++){
									if(!this.isBinded(node, this.socket_arr[s%this.sockets], thread, core)){
										this.bindCore(node, this.socket_arr[s%this.sockets], thread, core);
										return [node, this.socket_arr[s%this.sockets], thread, core];
									}
								}
							}
						}
					}
					break;
				case('fcyclic'):
					core = ((shift*cpu_per_task)+cpu);
					thread = Math.floor(((shift*cpu_per_task)+cpu)/this.cores)%this.threads_per_core;
					var full_tasks_in_socket = Math.floor(tasks_in_node / this.sockets);
					if(socket < tasks_in_node % this.sockets) full_tasks_in_socket = full_tasks_in_socket + 1;

					if (core >= Math.ceil(full_tasks_in_socket * cpu_per_task / this.threads_per_core)) {
						for(var core=0; core<this.cores; core++){
							for(var thread=0; thread<this.threads_per_core; thread++){
								if(!this.isBinded(node, this.socket_arr[socket], thread, core)){
									this.bindCore(node, this.socket_arr[socket], thread, core);
									return [node, this.socket_arr[socket], thread, core];
								}
							}
						}
					}
					break;
			}
		// Distribution Socket Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			socket = current%this.sockets;
			switch(this.distribution_core){
				case('block'): 
					core = Math.floor(current/(this.threads_per_core*this.sockets)) 
					thread = Math.floor(current/this.sockets)%this.threads_per_core
					break;
				case('cyclic'): 
					if (cpu_per_task % this.sockets == 0) {
						shift = Math.ceil(cpu_per_task / (this.sockets * this.threads_per_core))
						core = task_number * shift +Math.floor(cpu / (this.sockets * this.threads_per_core))
					} else {
						shift = Math.ceil(cpu_per_task / this.threads_per_core)
						var current_in_socket = Math.floor(current/this.sockets)
						core = shift * Math.floor(current_in_socket/cpu_per_task) + Math.floor((current_in_socket%cpu_per_task)/this.threads_per_core)
					}
					thread = Math.floor((cpu+(task_number * cpu_per_task) % this.sockets)/this.sockets)%this.threads_per_core
					//TODO: Auffüllen der Lüclen
					break;
				case('fcyclic'): 
					core = Math.floor((current%number_of_cores)/(this.sockets))
					socket = (cpu_per_task != 1) ? (current%number_of_cores)%this.sockets: socket
					thread = Math.floor(current / number_of_cores)
					break;
			}
		}

		socket = this.socket_arr[socket];
			
		if(!this.isBinded(node, socket, thread, core)){
			this.bindCore(node, socket, thread, core);
			return [node, socket, thread, core];
		}else{
			return this.getNextUnbindedCore(task, cpu_per_task, cpu);
		}
	}
	
	getNextUnbindedCore(task, cpus_per_task, cpu){
		if(this.distribution_node == 'block'){
			var node = this.node_allocation[task];
		}else{
			var node = task%this.nodes;
		}
		for(var socket=0; socket<this.sockets; socket++){
			for(var core=0; core<this.cores; core++){
				for(var thread=0; thread<this.threads_per_core; thread++){
					if(!this.isBinded(node, this.socket_arr[socket], thread, core)){
						this.bindCore(node, this.socket_arr[socket], thread, core);
						return [node, this.socket_arr[socket], thread, core];
					}
				}
			}
			
		}
		
		return null;
	}
	
	bindCore(node, socket, thread, core){
		this.binded[node][socket][thread][core] = 'y';
	}
	
	isBinded(node, socket, thread, core){
		if(this.binded[node][socket][thread][core] == 'y'){
			return true;
		}else{
			return false;
		}
	}
}
