import { CPU_Bind } from './CPU_Bind.js';

export class Threads extends CPU_Bind{
	getCoreToBind(tasks, node, task_number, cpu){
		let shift = parseInt(task_number/this._options["sockets"]);
		let current = task_number*this._options["cpu_per_task"]+cpu;
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		if (node < this._options["task"]%this._options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}
		
		// Distribution Socket
		let socket, core, thread;
		let number_of_cores = Math.ceil(tasks_in_node * this._options["cpu_per_task"] / this._options["threads_per_core"]);

		//Block
		if(this._options["distribution_socket"] === 'block'){
			switch(this._options["distribution_core"]){
				case('block'):
					socket = Math.floor(current/(this._options["threads_per_core"]*this._options["cores"]))%this._options["sockets"];
					core = Math.floor(current/this._options["threads_per_core"])%this._options["cores"];
					thread =current%this._options["threads_per_core"];
					break;
				case('cyclic'):
					socket = Math.floor((task_number*(this._options["cpu_per_task"]+this._options["cpu_per_task"]%this._options["threads_per_core"])+cpu)/(this._options["cores"]*this._options["threads_per_core"]))%this._options["sockets"];
					core = (task_number*Math.round(this._options["cpu_per_task"]/this._options["threads_per_core"])+Math.floor(cpu/this._options["threads_per_core"]))%this._options["cores"];
					thread = cpu%this._options["threads_per_core"]; 
					if (socket === Math.floor(number_of_cores / this._options["cores"]) && core >= number_of_cores % this._options["cores"])
						return this.getNextUnbindedCore(tasks, node, task_number);
					break;
				case('fcyclic'):
					if(this._options["cores"]%this._options["cpu_per_task"]===0 || this._options["cpu_per_task"]%this._options["cores"]===0){
						thread = Math.floor(current/number_of_cores)%this._options["threads_per_core"];
						if (number_of_cores % this._options["cpu_per_task"] === 0 || this._options["cpu_per_task"] % number_of_cores === 0) {
							socket = Math.floor((current - thread * number_of_cores) / this._options["cores"]);
							core = (current - thread * number_of_cores) % this._options["cores"]; 
						} else {
							socket = Math.floor(current/this._options["cores"])%this._options["sockets"];
							core = current%number_of_cores; 
						}
					}else{
						socket = Math.floor(current/(this._options["cores"]*this._options["sockets"]))%this._options["sockets"];
						let cores_in_socket = (socket < Math.floor(number_of_cores/this._options["cores"])) ? this._options["cores"] : number_of_cores%this._options["cores"];
						let current_in_socket = current - socket * this._options["cores"] * this._options["threads_per_core"];
						core = current_in_socket%cores_in_socket; 
						thread = Math.floor(current_in_socket/cores_in_socket)%this._options["threads_per_core"];
					}
					break;
			}

		//Cyclic 
		}else if(this._options["distribution_socket"] === 'cyclic'){
			socket = this._socket_arr.indexOf(this._last[node][1]);
			//change socket, if new task
			if (this._last[node][0] !== task_number) {
				do {
					socket = (socket + 1) % this._options["sockets"];
				} while (this.isFull(tasks, node, socket));
			}
			switch(this._options["distribution_core"]){
				case('block'):
					core = Math.floor((cpu+shift*this._options["cpu_per_task"])/this._options["threads_per_core"])%this._options["cores"];
					thread = (cpu+shift*this._options["cpu_per_task"])%this._options["threads_per_core"];
					break;
				case('cyclic'): 
					if (cpu === 0) {
						for(let thread=0; thread<this._options["threads_per_core"]; thread++){
							for(let core=0; core<this._cores_per_socket[node][socket]; core++){
								if(!this.isBinded(tasks,node, this._socket_arr[socket], thread, core)){
									return [this._socket_arr[socket], thread, core];
								}
							}
						}
					} else {
						for(let core=this._last[node][2]; core<this._cores_per_socket[node][socket]; core++){
							for(let thread=0; thread<this._options["threads_per_core"]; thread++){
								if(!this.isBinded(tasks,node, this._socket_arr[socket], thread, core)){
									return [this._socket_arr[socket], thread, core];
								}
							}
						}
					}
					
					//Get next unbinded core if socket is too full
					return this.getNextUnbindedCore(tasks, node, task_number, true);
				case('fcyclic'):
					for (let s = socket; s < socket + this._options["sockets"]; s++) {
						for(let thread=0; thread<this._options["threads_per_core"]; thread++){
							for(let core=0; core<this._cores_per_socket[node][s%this._options["sockets"]]; core++){
								if(!this.isBinded(tasks,node, this._socket_arr[s%this._options["sockets"]], thread, core)){
									return [this._socket_arr[s%this._options["sockets"]], thread, core];
								}
							}
						}
					}
					break;
			}

		//Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			socket = current%this._options["sockets"];
			switch(this._options["distribution_core"]){
				case('block'): 
					core = Math.floor(current/(this._options["threads_per_core"]*this._options["sockets"]));
					thread = Math.floor(current/this._options["sockets"])%this._options["threads_per_core"];
					break;
				case('cyclic'): 
					if (this._options["cpu_per_task"] % this._options["sockets"] === 0) {
						shift = Math.ceil(this._options["cpu_per_task"] / (this._options["sockets"] * this._options["threads_per_core"]));
						core = task_number * shift +Math.floor(cpu / (this._options["sockets"] * this._options["threads_per_core"]));
					} else {
						shift = Math.ceil(this._options["cpu_per_task"] / this._options["threads_per_core"]);
						let current_in_socket = Math.floor(current/this._options["sockets"]);
						core = shift * Math.floor(current_in_socket/this._options["cpu_per_task"]) + Math.floor((current_in_socket%this._options["cpu_per_task"])/this._options["threads_per_core"]);
					}
					thread = Math.floor((cpu+(task_number * this._options["cpu_per_task"]) % this._options["sockets"])/this._options["sockets"])%this._options["threads_per_core"];
					break;
				case('fcyclic'): 
					socket = (this._options["cpu_per_task"] !== 1) ? (current%number_of_cores)%this._options["sockets"]: socket;
					core = Math.floor((current%number_of_cores)/(this._options["sockets"]));
					thread = Math.floor(current / number_of_cores);
					break;
			}
		}

		return [this._socket_arr[socket], thread, core];
	}

	isFull(tasks, node, socket) {
		for (let core = 0; core < this._cores_per_socket[node][socket]; core++) {
			for (let thread = 0; thread < this._options["threads_per_core"]; thread++) {
				if (!this.isBinded(tasks,node, this._socket_arr[socket], thread, core)) {
					return false;
				}
			}
		}
		return true;
	}
}
