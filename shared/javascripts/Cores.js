import { CPU_Bind } from './CPU_Bind.js';

export class Cores extends CPU_Bind{
	/**
	 * Calculates for a specific CPU of a specific task to which NUMA-socket, core and thread it is pinned.
	 */
	getCoreToBind(tasks, node, task_number, cpu){
		let shift = parseInt(task_number/this._options["numa_sockets"]);
		
		// Distribution-Socket Block
		let numa_socket, core, thread;
		if(this._options["distribution_socket"] === 'block'){
			if(this._options["threads_per_core"]===1){
				switch(this._options["distribution_core"]){
					case('block'):
						thread =(cpu+(task_number*this._options["cpu_per_task"]))%this._options["threads_per_core"];
						core = parseInt((cpu+(task_number*this._options["cpu_per_task"]))/this._options["threads_per_core"])%this._options["cores"];
						numa_socket = this._numa_socket_arr[parseInt((task_number*this._options["cpu_per_task"]+cpu)/
							(this._options["threads_per_core"]*this._options["cores"]))%this._options["numa_sockets"]];
						break;
					case('cyclic'):
						thread = cpu%this._options["threads_per_core"];
						core = (task_number*parseInt(this._options["cpu_per_task"]/this._options["threads_per_core"]+0.5)
								+parseInt(cpu/this._options["threads_per_core"]))%this._options["cores"];
						numa_socket = this._numa_socket_arr[parseInt((task_number*(this._options["cpu_per_task"]+this._options["cpu_per_task"]%
								this._options["threads_per_core"])+cpu)/(this._options["cores"]*this._options["threads_per_core"]))%this._options["numa_sockets"]];
						break;
					case('fcyclic'):
						if(this._options["cores"]%this._options["cpu_per_task"]===0 || this._options["cpu_per_task"]%this._options["cores"]===0){
							core = (task_number*this._options["cpu_per_task"]+cpu)%this._options["cores"]; 
							thread = parseInt((task_number*this._options["cpu_per_task"]+cpu)/
										(this._options["cores"]*this._options["numa_sockets"]))%this._options["threads_per_core"];
							numa_socket = this._numa_socket_arr[parseInt((task_number*this._options["cpu_per_task"]+cpu)/
										this._options["cores"])%this._options["numa_sockets"]];
						}else{
							core = (task_number*this._options["cpu_per_task"]+cpu)%this._options["cores"]; 
							thread = parseInt((task_number*this._options["cpu_per_task"]+cpu)/
										this._options["cores"])%this._options["threads_per_core"];
							numa_socket = this._numa_socket_arr[parseInt((task_number*this._options["cpu_per_task"]+cpu)/
										(this._options["cores"]*this._options["numa_sockets"]))%this._options["numa_sockets"]];
						}
						break;
				}
			}else{
				core = (task_number*this._options["cpu_per_task"]+cpu)%this._options["cores"];
				thread = 0;
				numa_socket = parseInt((task_number*this._options["cpu_per_task"]+cpu)/this._options["cores"])%this._options["numa_sockets"];
			}

		// Distribution-Socket Cyclic
		}else if(this._options["distribution_socket"] === 'cyclic'){
			numa_socket = this._numa_socket_arr[(task_number + parseInt(((parseInt(task_number/this._options["numa_sockets"])*this._options["cpu_per_task"])+cpu)/
					(this._options["cores"]*this._options["threads_per_core"])))%this._options["numa_sockets"]];
			if(this._options["threads_per_core"]!== 1){
				switch(this._options["distribution_core"]){
					case('block'):
						core = parseInt((cpu+(shift*this._options["cpu_per_task"]))/this._options["threads_per_core"])%this._options["cores"];
						thread = (cpu+(shift*this._options["cpu_per_task"]))%this._options["threads_per_core"];
						break;
					case('cyclic'):
						thread = cpu%this._options["threads_per_core"];
						core = (parseInt(task_number/this._options["numa_sockets"])*parseInt(this._options["cpu_per_task"]/this._options["threads_per_core"]+0.5)
								+parseInt(cpu/this._options["threads_per_core"]))%this._options["cores"];
						break;
					case('fcyclic'):
						core = ((parseInt(task_number/this._options["numa_sockets"])*this._options["cpu_per_task"])+cpu)%this._options["cores"];
						thread = parseInt(((parseInt(task_number/this._options["numa_sockets"])*this._options["cpu_per_task"])+cpu)/(this._options["cores"]))%this._options["threads_per_core"];
						break;
				}
			}else{
				core = (parseInt(task_number/this._options["numa_sockets"])*this._options["cpu_per_task"]+cpu)%this._options["cores"];
				numa_socket = (numa_socket + parseInt(((parseInt(task_number/this._options["numa_sockets"])*this._options["cpu_per_task"])+cpu)/(this._options["cores"])))%this._options["numa_sockets"];
				thread = 0;
			}

		// Distribution-Socket Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			if(this._options["threads_per_core"]!==1){
				numa_socket = this._numa_socket_arr[(cpu+task_number)%this._options["numa_sockets"]];
				switch(this._options["distribution_core"]){
					case('block'):
						core = parseInt(((task_number*this._options["cpu_per_task"])+cpu)/(this._options["threads_per_core"]*this._options["numa_sockets"]));
						thread = parseInt(((task_number*this._options["cpu_per_task"])+cpu)/this._options["numa_sockets"])%this._options["threads_per_core"];
						break;
					case('fcyclic'):
						core = parseInt(((task_number*this._options["cpu_per_task"])+cpu)/(this._options["numa_sockets"]))%this._options["cores"];
						thread = parseInt((parseInt(((task_number*this._options["cpu_per_task"])+cpu)/
								(this._options["numa_sockets"]))/this._options["cores"])%this._options["threads_per_core"])%this._options["threads_per_core"];
						break;
				}
			}else{
				core = parseInt(((task_number*this._options["cpu_per_task"])+cpu)/(this._options["numa_sockets"]))%this._options["cores"];
				thread = 0;
				numa_socket = this._numa_socket_arr[(cpu+task_number)%this._options["numa_sockets"]];
			}
		}
		return [numa_socket, thread, core];
		
	}
}
