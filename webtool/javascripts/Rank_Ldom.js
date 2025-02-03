import { CPU_Bind } from './CPU_Bind.js';

export class Rank_Ldom extends CPU_Bind{
	getCoreToBind(tasks, node, task_number, cpu){
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		tasks_in_node += (node < this._options["task"]%this._options["nodes"]) ? 1 : 0;

		//Distribution-Socket
		let socket, core, thread;

		//Block 
		if(this._options["distribution_socket"] === 'block'){
			socket = task_number % Math.ceil(tasks_in_node * this._options["cpu_per_task"]/(this._options["cores"] * this._options["threads_per_core"]));
			core = Math.floor((Math.floor(task_number / this._options["sockets"]) * this._options["cpu_per_task"] + cpu) / this._options["threads_per_core"]);
			thread = (Math.floor(task_number / this._options["sockets"]) * this._options["cpu_per_task"] + cpu) % this._options["threads_per_core"];
			if (core >= this._cores_per_socket[node][socket]) return this.getNextUnbindedCore(tasks,node,task_number);

		//Cyclic 
		}else if(this._options["distribution_socket"] === 'cyclic'){
			return this.getNextUnbindedCore(tasks, node, task_number);

		//Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			socket = task_number % this._options["sockets"];
			while (core >= this._cores_per_socket[node][socket]) {
				socket  = socket + 1;
				let diff = (core - this._cores_per_socket[node][socket]) * this._options["threads_per_core"] + thread;
				core = Math.floor((Math.floor(task_number / this._options["sockets"]) * this._options["cpu_per_task"] + diff) / this._options["threads_per_core"]);
				thread = (Math.floor(task_number / this._options["sockets"]) * this._options["cpu_per_task"] + diff) % this._options["threads_per_core"];
			}
		}

		return [this._socket_arr[socket], thread, core];
	}
}
