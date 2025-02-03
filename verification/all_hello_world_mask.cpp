#include <stdio.h>
#include "mpi.h"
#include <omp.h>
#include <cstdlib>
#include <sched.h>
#include <iostream>
#include <iomanip>
#include <istream>
#include <stdlib.h>
#include <sys/types.h>
#include <unistd.h>
#include <cstring>

using namespace std;

void print_aff(int rank, int real_cores, int sep_pos)
{
  cpu_set_t mask;
  unsigned int len = sizeof(mask);
  char processor_name[MPI_MAX_PROCESSOR_NAME];
  int namelen;
  int pid = getpid();
  int cpu = sched_getcpu();
  int sep = sep_pos -1;

  MPI_Get_processor_name(processor_name, &namelen);

  // get current mask
  if(sched_getaffinity(pid, len, &mask)==0)
    {
      cout << "rank: " << rank << " running on CPU: " << cpu << " on node: "<< processor_name << endl;
      for (int i=0; i<real_cores; i++){
        cout << CPU_ISSET(i,&mask) ;
        if(i==sep && i<real_cores-1){
	  cout << " " ;
	  sep+=sep_pos;
	}
      }
      cout << endl;
      sep = sep_pos -1;
      for (int i=0; i<real_cores; i++){
        cout << CPU_ISSET(i+real_cores, &mask) ;
        if(i==sep && i<real_cores-1){
	  cout << " " ;
	  sep+=sep_pos;
	}
      }
      cout << endl;
    }
}


int main(int argc, char *argv[]) {

  int size, rank, namelen;
  char processor_name[MPI_MAX_PROCESSOR_NAME];
  int thread = 0, np = 1;
  int REAL_CORES_NUM = 0;
  int SPACE_SEPARATOR_POS = 0;


  if( argc != 2 ) {
    printf("One argument expected. Supported arguments are: jr, jw or js\n");
    exit(1);
  }
  if(strcmp("jr",argv[1]) == 0) {
    REAL_CORES_NUM = 128;
    SPACE_SEPARATOR_POS = 16;
    // printf("JR %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else if(strcmp("jrt",argv[1]) == 0) {
    REAL_CORES_NUM = 128;
    SPACE_SEPARATOR_POS = 16;
    // printf("JRT %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else if(strcmp("jw",argv[1]) == 0) {
    REAL_CORES_NUM = 48;
    SPACE_SEPARATOR_POS = 24;
    // printf("JW %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else if(strcmp("jwt",argv[1]) == 0) {
    REAL_CORES_NUM = 48;
    SPACE_SEPARATOR_POS = 24;
    // printf("JWT %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else if(strcmp("jwb",argv[1]) == 0) {
    REAL_CORES_NUM = 48;
    SPACE_SEPARATOR_POS = 6;
    // printf("JWB %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else if(strcmp("js",argv[1]) == 0) {
    REAL_CORES_NUM = 128;
    SPACE_SEPARATOR_POS = 16;
    // printf("JS %i %i\n",REAL_CORES_NUM,SPACE_SEPARATOR_POS);
  }
  else {
    printf("Supported arguments are: jr, jw or js\n");
    exit(1);
  }

  MPI_Init(&argc, &argv);
  MPI_Comm_rank(MPI_COMM_WORLD, &rank);
  MPI_Comm_size(MPI_COMM_WORLD, &size);
  // if(rank==0)printf("SLURM_JOB_NUM_NODES = %s\n",std::getenv("SLURM_JOB_NUM_NODES"));
  // if(rank==0)printf("SLURM_NTASKS = %s\n",std::getenv("SLURM_NTASKS"));
  // if(rank==0)printf("SLURM_NTASKS_PER_NODE = %s\n",std::getenv("SLURM_NTASKS_PER_NODE"));
  // if(rank==0)printf("SLURM_CPUS_PER_TASK = %s\n",std::getenv("SLURM_CPUS_PER_TASK"));
  // if(rank==0)printf("SLURM_CPU_BIND = %s\n",std::getenv("SLURM_CPU_BIND"));
  // if(rank==0)printf("SLURM_CPU_BIND_TYPE = %s\n",std::getenv("SLURM_CPU_BIND_TYPE"));
  // if(rank==0)printf("SLURM_CPU_BIND_LIST = %s\n",std::getenv("SLURM_CPU_BIND_LIST"));
  // if(rank==0)printf("SLURM_DISTRIBUTION = %s\n",std::getenv("SLURM_DISTRIBUTION"));
  // if(rank==0)printf("SLURM_HINT = %s\n\n\n",std::getenv("SLURM_HINT"));
  // if(rank==0)printf("KMP_AFFINITY = %s\n\n\n",std::getenv("KMP_AFFINITY"));
  // if(rank==0)printf(" = %s\n",std::getenv(""));

  // MPI_Barrier(MPI_COMM_WORLD);

  // for (int i=0; i<size; i++){
  //   if( i==rank){
  //     print_aff(rank, REAL_CORES_NUM, SPACE_SEPARATOR_POS);
  //   }
  //   MPI_Barrier(MPI_COMM_WORLD);
  // }

  // MPI_Barrier(MPI_COMM_WORLD);
  MPI_Get_processor_name(processor_name, &namelen);

  usleep(50000);

  // if(rank==0) cout << "\n\nrank, thread, sched_getcpu(), processor_name, argv[0]\n" << endl;

  for (int i=0; i<size; i++){
    if(i==rank){

#pragma omp parallel default(shared) private(thread, np)
  {
    np = omp_get_num_threads();
    thread = omp_get_thread_num();
    // printf("Hello from thread %d out of %d from process %d out of %d on %s\n",
    //       thread, np, rank, size, processor_name);
#pragma omp critical
    cout << setw(6) << rank << setw(6) << thread << setw(6) << sched_getcpu() << "  " << processor_name << "  " << argv[0] << "\n" << flush;
    //    printf("%2d %2d %2d %.9s %s\n", rank, thread, sched_getcpu(), processor_name, argv[0]);
  }
    }
    MPI_Barrier(MPI_COMM_WORLD);
  }

  //  const char* s = getenv("PATH");
  //  printf("PATH :%s\n",(s!=NULL)? s : "getenv returned NULL");  

   MPI_Finalize();

}
