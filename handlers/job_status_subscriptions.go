package handlers

import (
	"encoding/json"
	"github.com/AdRoll/batchiepatchie/jobs"
	"github.com/gorilla/websocket"
	"github.com/labstack/echo"
	log "github.com/sirupsen/logrus"
	"time"
)

var (
	upgrader = websocket.Upgrader{}
)

func (s *Server) SubscribeToJobEvent(c echo.Context) error {
	job_id := c.Param("id")

	ws, err := upgrader.Upgrade(c.Response(), c.Request(), nil)
	if err != nil {
		log.Warning("Invalid WebSocket attempt: ", err)
		return err
	}
	defer ws.Close()

	ws.SetReadLimit(1000) // We are not expecting to read anything so set low limit for reads

	events, unsubscribe := s.Storage.SubscribeToJobStatus(job_id)
	defer unsubscribe()

	// Launch a reader. We need it to detect if the connection closes
	// suddenly.
	go func() {
		_, _, _ = ws.ReadMessage()
		ws.Close() // Close is safe to run concurrently.
		log.Info("Stopped reading from websocket.")
	}()

	var previous_status *jobs.Job
	// Immediately send status update on the job. If there is such as job.
	job, err := s.Storage.FindOne(job_id)
	previous_status = job
	if err == nil && job != nil {
		marshalled, err := json.Marshal(*job)
		if err != nil {
			log.Warning("Cannot marshal job status to be sent to WebSocket: ", err)
			return err
		}
		now := time.Now()
		ws.SetWriteDeadline(now.Add(time.Second * 5))
		err = ws.WriteMessage(websocket.TextMessage, marshalled)
		if err != nil {
			log.Warning("Cannot send job status to WebSocket: ", err)
			return err
		}
	}

	for {
		var job_status *jobs.Job
		select {
		case stat := <-events:
			job_status = &stat
		case <-time.After(time.Second * 5):
			job_status = nil
		}

		if job_status != nil {
			previous_status = job_status
			marshalled, err := json.Marshal(*job_status)
			if err != nil {
				log.Warning("Cannot marshal job status to be sent to WebSocket: ", err)
				return err
			}

			now := time.Now()
			ws.SetWriteDeadline(now.Add(time.Second * 5))
			err = ws.WriteMessage(websocket.TextMessage, marshalled)
			if err != nil {
				log.Warning("Cannot send job status to WebSocket: ", err)
				return err
			}
		} else {
			marshalled := []byte("")
			if previous_status != nil {
				marshalled, err = json.Marshal(*previous_status)
				if err != nil {
					log.Warning("Cannot marshal job status to be set to WebSocket: ", err)
					return err
				}
			}
			now := time.Now()
			ws.SetWriteDeadline(now.Add(time.Second * 5))

			err = ws.WriteMessage(websocket.TextMessage, marshalled)
			if err != nil {
				log.Warning("Cannot write to websocket: ", err)
				return err
			}
		}
	}
}
