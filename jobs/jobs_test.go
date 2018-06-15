package jobs_test

import (
	"encoding/json"
	"testing"

	"github.com/SemanticSugar/batchiepatchie/jobs"
)

func TestJobStruct(t *testing.T) {
	j := jobs.Job{
		Id: "myId",
	}

	_, err := json.Marshal(j)
	if err != nil {
		t.Error(err)
	}
}
