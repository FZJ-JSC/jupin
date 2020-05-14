//Abbruchbedingung passt nicht ganz
class Rank {
	constructor(nodes, sockets, cores, threads_per_cores, distribution_node, hint, task){
		this.nodes = nodes;
		this.sockets = sockets;
		this.cores = cores;
		this.threads_per_cores = threads_per_cores;
		this.distribution_node = distribution_node;
		this.hint = hint;
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
		if(this.distribution_node == 'block'){ //HELP
			var node = this.node_allocation[task]
			var start_index = 0;
			for(var key_node in this.node_allocation){
				if(this.node_allocation[key_node] == node) break; else start_index++;
			}
			var core = ((task-start_index)*cpus_per_task+cpu)%this.cores;
			var socket = parseInt(((task-start_index)*cpus_per_task+cpu)/this.cores)%this.sockets;
			if(this.hint=='-'){
				var thread = parseInt(((task-start_index)*cpus_per_task+cpu)/
								(this.cores*this.sockets))%this.threads_per_cores;
			}else{
				var thread = 0;
			}
		}else{
			var node = task%this.nodes;
			var core = (parseInt(task/this.nodes)*cpus_per_task+cpu)%this.cores;
			var socket = parseInt((parseInt(task/this.nodes)*cpus_per_task+cpu)/this.cores)%this.sockets;
			if(this.hint=='-'){
				var thread = parseInt((parseInt(task/this.nodes)*cpus_per_task+cpu)/
								(this.cores*this.sockets))%this.threads_per_cores;
			}else{
				var thread = 0;
			}
		}
		return [node, socket, thread, core];
		
	}
}
