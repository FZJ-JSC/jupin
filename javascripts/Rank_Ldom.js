//Abbruchbedingung passt nicht ganz
class Rank_Ldom {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, hint, task){
		this.nodes = nodes;
		this.sockets = sockets;
		this.cores = cores;
		this.threads_per_cores = threads_per_cores;
		this.distribution_node = distribution_node;
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
	
	getCoreToBind(task, cpus_per_task, cpu){
		var node, thread, core, socket;
		if(this.distribution_node == 'block'){
			var node = this.node_allocation[task]
			var start_index = 0;
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			var shift = parseInt((task-start_index)/this.sockets);
			if(this.hint=='-'){
				thread = (shift*cpus_per_task+cpu)%this.threads_per_cores;
				core = parseInt((shift*cpus_per_task+cpu)/this.threads_per_cores)%this.cores;
			}else{
				thread = 0;
				core = (shift*cpus_per_task+cpu)%this.cores;
			}
			socket =(task-start_index)%this.sockets
		}else{
			node = task%this.nodes;
			var shift = parseInt(task/(this.sockets*this.nodes));
			if(this.hint=='-'){
				thread = (shift*cpus_per_task+cpu)%this.threads_per_cores;
				core = parseInt((shift*cpus_per_task+cpu)/this.threads_per_cores)%this.cores;
			}else{
				thread = 0;
				core = (shift*cpus_per_task+cpu)%this.cores;
			}
			socket =parseInt(task/this.sockets)%this.sockets;
		}
		if(!this.isBinded(node, socket, thread, core)){
			this.bindCore(node, socket, thread, core);
			return [node, socket, thread, core];
		}else{
			return this.getNextUnbindedCore(task, cpus_per_task, cpu);
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
