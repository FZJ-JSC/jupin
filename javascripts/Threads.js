class Threads {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, 
		distribution_socket, distribution_core, hint, task){
		this.nodes = nodes;
		this.sockets = sockets;
		this.cores = cores;
		this.threads_per_cores = threads_per_cores;
		this.distribution_node = distribution_node;
		this.distribution_socket = distribution_socket;
		this.distribution_core = distribution_core;
		this.hint = hint;
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
		if(this.distribution_node == 'block'){
			node = this.node_allocation[task]
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			task_number = task - start_index
		}else{
			node = task%this.nodes;
			task_number = parseInt(task/this.nodes);
		}
		var shift = parseInt(task_number/this.sockets)
		
		// Distribution Socket Block
		if(this.distribution_socket == 'block'){
			if(this.hint=='-'){
				switch(this.distribution_core){
					case('block'):
						thread =(cpu+(task_number*cpu_per_task))%this.threads_per_cores;
						core = parseInt((cpu+(task_number*cpu_per_task))/this.threads_per_cores)%this.cores;
						socket = parseInt((task_number*cpu_per_task+cpu)/
							(this.threads_per_cores*this.cores))%this.sockets;
						break;
					case('cyclic'):
						thread = cpu%this.threads_per_cores; 
						core = (task_number*parseInt(cpu_per_task/this.threads_per_cores+0.5)
								+parseInt(cpu/this.threads_per_cores))%this.cores 
						socket = parseInt((task_number*(cpu_per_task+cpu_per_task%
							this.threads_per_cores)+cpu)/(this.cores*this.threads_per_cores))%this.sockets;
						break;
					case('fcyclic'):
						if(this.cores%cpu_per_task==0 || cpu_per_task%this.cores==0){
							core = (task_number*cpu_per_task+cpu)%this.cores; 
							thread = parseInt((task_number*cpu_per_task+cpu)/
										(this.cores*this.sockets))%this.threads_per_cores
							socket = parseInt((task_number*cpu_per_task+cpu)/
										this.cores)%this.sockets
						}else{
							core = (task_number*cpu_per_task+cpu)%this.cores; 
							thread = parseInt((task_number*cpu_per_task+cpu)/
										this.cores)%this.threads_per_cores;
							socket = parseInt((task_number*cpu_per_task+cpu)/
										(this.cores*this.sockets))%this.sockets;
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
			if(this.hint=='-'){
				socket = task_number%this.sockets;
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
				core = (task_number*cpu_per_task+cpu)%this.cores;
				thread = 0;
				socket = parseInt((task_number*cpu_per_task+cpu)/this.cores)%this.sockets;
			}
		// Distribution Socket Fcyclic
		}else if(this.distribution_socket == 'fcyclic'){
			if(this.hint=='-'){
				socket = (cpu+task_number)%this.sockets;
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
				socket = (cpu+task_number)%this.sockets;
			}
		}
			
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
		if(this.hint=='-'){
			for(var socket=0; socket<this.sockets; socket++){
				for(var core=0; core<this.cores; core++){
					for(var thread=0; thread<this.threads_per_cores; thread++){
						if(!this.isBinded(node, socket, thread, core)){
							this.bindCore(node, socket, thread, core);
							return [node, socket, thread, core];
						}
					}
				}
				
			}
		}else{
			for(var socket=0; socket<this.sockets; socket++){
				for(var core=0; core<this.cores; core++){
					if(!this.isBinded(node, socket, 0, core)){
						this.bindCore(node, socket, 0, core);
						return [node, socket, 0, core];
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
