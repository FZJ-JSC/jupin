import { CPU_Bind } from './CPU_Bind.js';

export class Rank extends CPU_Bind{
	/**
	 * Calculates for a specific CPU of a specific task to which socket, core and thread it is pinned.
	 */
	getCoreToBind(tasks, node, task_number, cpu){
		let current = task_number*this._options["cpu_per_task"]+cpu;
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		tasks_in_node += (node < this._options["task"]%this._options["nodes"]) ? 1 : 0;

		let socket, core;
		let number_of_cores = Math.ceil(tasks_in_node * this._options["cpu_per_task"] / this._options["threads_per_core"]);
		let thread = Math.floor(current/number_of_cores);

		//Distribution-Socket Block
		if(this._options["distribution_socket"] === 'block'){
			socket = Math.floor((current - thread * number_of_cores) / this._options["cores"]);
			core = (current - thread * number_of_cores) % this._options["cores"];

		//Distribution-Socket Cyclic
		}else if(this._options["distribution_socket"] === 'cyclic'){
			let used_cores = thread * number_of_cores;
			for (let s = 0; s < this._options["sockets"]; s++) {
				if (current < used_cores+this._cores_per_socket[node][s]) {
					socket = s;
					core  = current - used_cores;
					break;
				}
				used_cores += this._cores_per_socket[node][s];
			}

		//Distribution-Socket Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			socket = Math.floor((current - thread * number_of_cores) / this._cores_per_socket[node][0]);
			core = (current - thread * number_of_cores) % this._cores_per_socket[node][socket];
		}

		return [this._socket_arr[socket], thread, core];
	}
}
