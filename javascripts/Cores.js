class Cores {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, 
		distribution_socket, distribution_core, hint, task, mode){
		this.name = 'Cores';
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
		this.threads_per_cores = threads_per_cores;
		this.distribution_node = distribution_node;
		this.distribution_socket = distribution_socket;
		this.distribution_core = distribution_core;
		this.hint = hint;
		this.mode = mode;
		this.binded = new Array(nodes);
		for(var node=0; node<nodes; node++){
			this.binded[node] = new Array(sockets);
			for(var socket=0; socket<sockets; socket++){
				var array_for_task = new Array(threads_per_cores);
				for(var thread=0; thread<threads_per_cores; thread++){
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
			for(var k=0; k < parseInt(task/this.nodes); k++){
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
		var node, socket, thread, core, start_index = 0, task_number;
		// Distributon-Node
		if(this.mode == 'Task' || this.distribution_node == 'block'){
			node = this.node_allocation[task]
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index
		}else{
			node = task%this.nodes;
			task_number = parseInt(task/this.sockets);
		}
		var shift = parseInt(task_number/this.sockets)
		
		// Distribution Socket Block
		if(this.distribution_socket == 'block'){
			if(this.hint=='-'){
				switch(this.distribution_core){
					case('block'):
						thread =(cpu+(task_number*cpu_per_task))%this.threads_per_cores;
						core = parseInt((cpu+(task_number*cpu_per_task))/this.threads_per_cores)%this.cores;
						socket = this.socket_arr[parseInt((task_number*cpu_per_task+cpu)/
							(this.threads_per_cores*this.cores))%this.sockets];
						break;
					case('cyclic'):
						thread = cpu%this.threads_per_cores; 
						core = (task_number*parseInt(cpu_per_task/this.threads_per_cores+0.5)
								+parseInt(cpu/this.threads_per_cores))%this.cores 
						socket = this.socket_arr[parseInt((task_number*(cpu_per_task+cpu_per_task%
							this.threads_per_cores)+cpu)/(this.cores*this.threads_per_cores))%this.sockets];
						break;
					case('fcyclic'):
						if(this.cores%cpu_per_task==0 || cpu_per_task%this.cores==0){
							core = (task_number*cpu_per_task+cpu)%this.cores; 
							thread = parseInt((task_number*cpu_per_task+cpu)/
										(this.cores*this.sockets))%this.threads_per_cores
							socket = this.socket_arr[parseInt((task_number*cpu_per_task+cpu)/
										this.cores)%this.sockets];
						}else{
							core = (task_number*cpu_per_task+cpu)%this.cores; 
							thread = parseInt((task_number*cpu_per_task+cpu)/
										this.cores)%this.threads_per_cores;
							socket = this.socket_arr[parseInt((task_number*cpu_per_task+cpu)/
										(this.cores*this.sockets))%this.sockets];
						}
						break;
				}
			}else{
				core = (task_number*cpu_per_task+cpu)%this.cores;
				thread = 0;
				socket = parseInt((task_number*cpu_per_task+cpu)/this.cores)%this.sockets;
			}
			
		// Distribution Socket Cyclic
		}else if(this.distribution_socket == 'cyclic'){
			socket = this.socket_arr[task_number%this.sockets] + 
					parseInt(((parseInt(task_number/this.sockets)*cpu_per_task)+cpu)/(this.cores*this.threads_per_cores))%this.sockets;
			if(this.hint=='-'){
				switch(this.distribution_core){
					case('block'):
						core = parseInt((cpu+(shift*cpu_per_task))/this.threads_per_cores)%this.cores;
						thread = (cpu+(shift*cpu_per_task))%this.threads_per_cores;
						break;
					case('cyclic'):
						thread = cpu%this.threads_per_cores ;
						core = (parseInt(task_number/this.sockets)*parseInt(cpu_per_task/this.threads_per_cores+0.5)
											+parseInt(cpu/this.threads_per_cores))%this.cores;
						break;
					case('fcyclic'):
						core = ((parseInt(task_number/this.sockets)*cpu_per_task)+cpu)%this.cores;
						thread = parseInt(((parseInt(task_number/this.sockets)*cpu_per_task)+cpu)/(this.cores))%this.threads_per_cores;
						break;
				}
			}else{
				core = (parseInt(task_number/this.sockets)*cpu_per_task+cpu)%this.cores;
				socket = socket + parseInt(((parseInt(task_number/this.sockets)*cpu_per_task)+cpu)/(this.cores))%this.sockets;
				thread = 0;
				if(!this.isBinded(node, socket, thread, core)){
					this.bindCore(node, socket, thread, core);
					return [node, socket, thread, core];
				}else{
					console.log('help')
					return this.getNextUnbindedCore(task, cpu_per_task, cpu);
				}
			}
		// Distribution Socket Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			if(this.hint=='-'){
				socket = this.socket_arr[(cpu+task_number)%this.sockets];
				switch(this.distribution_core){
					case('block'):
						core = parseInt(((task_number*cpu_per_task)+cpu)/(this.threads_per_cores*this.sockets)) 
						thread = parseInt(((task_number*cpu_per_task)+cpu)/this.sockets)%this.threads_per_cores
						break;
					case('fcyclic'):
						core = parseInt(((task_number*cpu_per_task)+cpu)/(this.sockets))%this.cores;
						thread = parseInt((parseInt(((task_number*cpu_per_task)+cpu)/
								(this.sockets))/this.cores)%this.threads_per_cores)%this.threads_per_cores;
						break;
				}
			}else{
				core = parseInt(((task_number*cpu_per_task)+cpu)/(this.sockets))%this.cores;
				thread = 0;
				socket = this.socket_arr[(cpu+task_number)%this.sockets];
			}
		}
		this.bindCore(node, socket, thread, core);
		return [node, socket, thread, core];
		
	}
	
	getNextUnbindedCore(task, cpus_per_task, cpu){
		if(this.distribution_node == 'block'){
			var node = this.node_allocation[task];
		}else{
			var node = task%this.nodes;
		}
		for(var socket=0; socket<this.sockets; socket++){
			for(var core=0; core<this.cores; core++){
				if(!this.isBinded(node, this.socket_arr[socket], 0, core)){
					this.bindCore(node, this.socket_arr[socket], 0, core);
					return [node, this.socket_arr[socket], 0, core];
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
