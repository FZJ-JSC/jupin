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
