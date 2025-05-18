/**
 * JuPin PinningTool
 * Copyright (C) 2020-2025
 * Forschungszentrum Juelich GmbH, Juelich Supercomputing Centre
 * http://www.fz-juelich.de/jsc/jupin
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * 
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { CPU_Bind } from './CPU_Bind.js';

export class Threads extends CPU_Bind{
	/**
	 * Calculates for a specific CPU of a specific task to which numa_socket, core and thread it is pinned.
	 */
	getCoreToBind(tasks, node, task_number, cpu){
		let shift = parseInt(task_number/this._options["numa_sockets"]);
		let current = task_number*this._options["cpu_per_task"]+cpu;
		let tasks_in_node = Math.floor(this._options["task"]/this._options["nodes"]);
		if (node < this._options["task"]%this._options["nodes"]) {
			tasks_in_node = tasks_in_node +1;
		}
		let numa_socket, core, thread;
		let number_of_cores = Math.ceil(tasks_in_node * this._options["cpu_per_task"] / this._options["threads_per_core"]);

		//Distribution-Socket Block
		if(this._options["distribution_socket"] === 'block'){
			switch(this._options["distribution_core"]){
				//Distribution-Core Block
				case('block'):
					numa_socket = Math.floor(current/(this._options["threads_per_core"]*this._options["cores"]))%this._options["numa_sockets"];
					core = Math.floor(current/this._options["threads_per_core"])%this._options["cores"];
					thread =current%this._options["threads_per_core"];
					break;

				//Distribution-Core Cyclic
				case('cyclic'):
					numa_socket = Math.floor((task_number*(this._options["cpu_per_task"]+this._options["cpu_per_task"]%this._options["threads_per_core"])+cpu)/
							(this._options["cores"]*this._options["threads_per_core"]))%this._options["numa_sockets"];
					core = (task_number*Math.round(this._options["cpu_per_task"]/this._options["threads_per_core"])+
							Math.floor(cpu/this._options["threads_per_core"]))%this._options["cores"];
					thread = cpu%this._options["threads_per_core"];
					if (numa_socket === Math.floor(number_of_cores / this._options["cores"]) && core >= number_of_cores % this._options["cores"])
						return this.getNextUnbindedCore(tasks, node, task_number);
					break;

				//Distribution-Core Fcyclic
				case('fcyclic'):
					if(this._options["cores"]%this._options["cpu_per_task"]===0 || this._options["cpu_per_task"]%this._options["cores"]===0){
						thread = Math.floor(current/number_of_cores)%this._options["threads_per_core"];
						if (number_of_cores % this._options["cpu_per_task"] === 0 || this._options["cpu_per_task"] % number_of_cores === 0) {
							numa_socket = Math.floor((current - thread * number_of_cores) / this._options["cores"]);
							core = (current - thread * number_of_cores) % this._options["cores"];
						} else {
							numa_socket = Math.floor(current/this._options["cores"])%this._options["numa_sockets"];
							core = current%number_of_cores;
						}
					}else{
						numa_socket = Math.floor(current/(this._options["cores"]*this._options["numa_sockets"]))%this._options["numa_sockets"];
						let cores_in_numa_socket = (numa_socket < Math.floor(number_of_cores/this._options["cores"])) ? this._options["cores"] : number_of_cores%this._options["cores"];
						let current_in_numa_socket = current - numa_socket * this._options["cores"] * this._options["threads_per_core"];
						core = current_in_numa_socket%cores_in_numa_socket;
						thread = Math.floor(current_in_numa_socket/cores_in_numa_socket)%this._options["threads_per_core"];
					}
					break;
			}

		//Distribution-Socket Cyclic
		}else if(this._options["distribution_socket"] === 'cyclic'){
			numa_socket = this._numa_socket_arr.indexOf(this._last[node][1]);
			//change numa_socket, if new task
			if (this._last[node][0] !== task_number) {
				do {
					numa_socket = (numa_socket + 1) % this._options["numa_sockets"];
				} while (this.isFull(tasks, node, numa_socket));
			}

			switch(this._options["distribution_core"]){
				//Distribution-Core Block
				case('block'):
					core = Math.floor((cpu+shift*this._options["cpu_per_task"])/this._options["threads_per_core"])%this._options["cores"];
					thread = (cpu+shift*this._options["cpu_per_task"])%this._options["threads_per_core"];
					break;

				//Distribution-Core Cyclic
				case('cyclic'):
					if (cpu === 0) {
						for(let thread=0; thread<this._options["threads_per_core"]; thread++){
							for(let core=0; core<this._cores_per_numa_socket[node][numa_socket]; core++){
								if(!this.isBinded(tasks,node, this._numa_socket_arr[numa_socket], thread, core)){
									return [this._numa_socket_arr[numa_socket], thread, core];
								}
							}
						}
					} else {
						for(let core=this._last[node][2]; core<this._cores_per_numa_socket[node][numa_socket]; core++){
							for(let thread=0; thread<this._options["threads_per_core"]; thread++){
								if(!this.isBinded(tasks,node, this._numa_socket_arr[numa_socket], thread, core)){
									return [this._numa_socket_arr[numa_socket], thread, core];
								}
							}
						}
					}

					//Get next unbinded core if numa_socket is too full
					return this.getNextUnbindedCore(tasks, node, task_number, true);

				//Distribution-Core Fcyclic
				case('fcyclic'):
					for (let s = numa_socket; s < numa_socket + this._options["numa_sockets"]; s++) {
						for(let thread=0; thread<this._options["threads_per_core"]; thread++){
							for(let core=0; core<this._cores_per_numa_socket[node][s%this._options["numa_sockets"]]; core++){
								if(!this.isBinded(tasks,node, this._numa_socket_arr[s%this._options["numa_sockets"]], thread, core)){
									return [this._numa_socket_arr[s%this._options["numa_sockets"]], thread, core];
								}
							}
						}
					}
					break;
			}

		//Distribution-Socket Fcyclic
		}else if(this._options["distribution_socket"] === 'fcyclic'){
			numa_socket = current%this._options["numa_sockets"];

			switch(this._options["distribution_core"]){
				//Distribution-Core Block
				case('block'):
					core = Math.floor(current/(this._options["threads_per_core"]*this._options["numa_sockets"]));
					thread = Math.floor(current/this._options["numa_sockets"])%this._options["threads_per_core"];
					break;

				//Distribution-Core Cyclic
				case('cyclic'):
					if (this._options["cpu_per_task"] % this._options["numa_sockets"] === 0) {
						shift = Math.ceil(this._options["cpu_per_task"] / (this._options["numa_sockets"] * this._options["threads_per_core"]));
						core = task_number * shift +Math.floor(cpu / (this._options["numa_sockets"] * this._options["threads_per_core"]));
					} else {
						shift = Math.ceil(this._options["cpu_per_task"] / this._options["threads_per_core"]);
						let current_in_numa_socket = Math.floor(current/this._options["numa_sockets"]);
						core = shift * Math.floor(current_in_numa_socket/this._options["cpu_per_task"]) +
								Math.floor((current_in_numa_socket%this._options["cpu_per_task"])/this._options["threads_per_core"]);
					}
					thread = Math.floor((cpu+(task_number * this._options["cpu_per_task"]) % this._options["numa_sockets"])/this._options["numa_sockets"])%this._options["threads_per_core"];
					break;

				//Distribution-Core Fcyclic
				case('fcyclic'):
					numa_socket = (this._options["cpu_per_task"] !== 1) ? (current%number_of_cores)%this._options["numa_sockets"]: numa_socket;
					core = Math.floor((current%number_of_cores)/(this._options["numa_sockets"]));
					thread = Math.floor(current / number_of_cores);
					break;
			}
		}

		return [this._numa_socket_arr[numa_socket], thread, core];
	}

	/**
	 * Checks whether there are no more free threads in a given numa_socket
	 */
	isFull(tasks, node, numa_socket) {
		for (let core = 0; core < this._cores_per_numa_socket[node][numa_socket]; core++) {
			for (let thread = 0; thread < this._options["threads_per_core"]; thread++) {
				if (!this.isBinded(tasks,node, this._numa_socket_arr[numa_socket], thread, core)) {
					return false;
				}
			}
		}
		return true;
	}
}
