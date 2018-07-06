package jobs

import (
	"github.com/opentracing/opentracing-go"
	log "github.com/sirupsen/logrus"
)

func KillTimedOutJobs(finder FinderStorer) error {
	span := opentracing.StartSpan("KillTimedOutJobs")
	defer span.Finish()

	timed_out_jobs, err := finder.FindTimedoutJobs()
	if err != nil {
		return err
	}
	killer, err := NewKillerHandler()
	if err != nil {
		return err
	}

	log.Info("There are ", len(timed_out_jobs), " that need killing.")

	for _, job_id := range timed_out_jobs {
		err = killer.KillOne(job_id, "timeout", finder)
		if err != nil {
			log.Info("Requested termination for ", job_id)
		}
	}
	log.Info("Timed out killer round complete.")
	return nil
}
