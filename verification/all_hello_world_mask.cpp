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

#include "mpi.h"
#include <omp.h>
#include <iostream>
#include <iomanip>
#include <unistd.h>

using namespace std;

int main(int argc, char *argv[]) {
  int size, rank, namelen;
  char processor_name[MPI_MAX_PROCESSOR_NAME];
  int thread = 0, np = 1;

  MPI_Init(&argc, &argv);
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &size);
  MPI_Get_processor_name(processor_name, &namelen);

  usleep(50000);

  for (int i=0; i<size; i++){
    if(i==rank){
      #pragma omp parallel default(shared) private(thread, np)
      {
        np = omp_get_num_threads();
        thread = omp_get_thread_num();
        #pragma omp critical
        cout << setw(6) << rank << setw(6) << thread << setw(6) << sched_getcpu() << "  " << processor_name << "  " << argv[0] << "\n" << flush;
      }
    }
    MPI_Barrier(MPI_COMM_WORLD);
  }
  MPI_Finalize();
}
