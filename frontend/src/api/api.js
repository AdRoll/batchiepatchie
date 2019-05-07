import jobs from './jobs.json';

class API {
    static baseURL = process.env.API_BASE_URL;

    getJob(id) {
        return this.get(this.joinUrls(`jobs/${id}`));
    }

    getJobs(params) {
        return this.get(this.joinUrls('jobs', params));
    }

    getLogs(id) {
        // This is some machinery to turn text response into a list of {
        // 'Message': line } objects.
        function to_text(response) {
            return response.text();
        }
        function parse_text(text) {
            let parsed = [];
            const lines = text.split(/\n/);
            for (let line in lines) {
                parsed.push({ 'Message': lines[line] });
            }
            return new Promise((resolve, reject) => resolve(parsed));
        }
        return window.fetch(this.joinUrls(`jobs/${id}/logs?format=text`), { 'method': 'GET' }).then(this.checkStatus).then(to_text).then(parse_text);
    }

    getStats() {
        return this.get(this.joinUrls('stats'));
    }

    getJobQueues() {
        return this.get(this.joinUrls('job_queues/active'));
    }

    getAllJobQueues() {
        return this.get(this.joinUrls('job_queues/all'));
    }

    activateJobQueue(job_queue_name) {
        return this.post(this.joinUrls(`job_queues/${job_queue_name}/activate`), []);
    }

    deactivateJobQueue(job_queue_name) {
        return this.post(this.joinUrls(`job_queues/${job_queue_name}/deactivate`), []);
    }

    killJobs(ids) {
        return this.post(this.joinUrls('jobs/kill'), { ids });
    }

    get(url) {
        return this.fetch('get', url);
    }

    post(url, body) {
        return this.fetch('post', url, JSON.stringify(body));
    }

    put(url, body) {
        return this.fetch('put', url, JSON.stringify(body));
    }

    delete(url) {
        return this.fetch('delete', url);
    }

    fetch(method, url, body) {
        return window.fetch(url, { method, body })
            .then(this.checkStatus)
            .then(this.parseJSON);
    }

    checkStatus(response) {
        // Request is good
        if (response.ok) {
            return response;
        }

        // Request failed
        const error = new Error(response.statusText);
        error.response = response;
        throw error;
    }

    parseJSON(response) {
        return response.json();
    };

    joinUrls(endpoint, params) {
        const formattedParams = params ?
            '?' + this.formatQueryParams(params) :
            '';

        return `${API.baseURL}/${endpoint}${formattedParams}`;
    }

    formatQueryParams(params) {
        return Object.keys(params)
            .filter(k => !!params[k])
            .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
            .join('&');
    }
}

export default new API();
