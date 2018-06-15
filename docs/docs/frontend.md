Batchiepatchie - Frontend
-------------------------

To build the frontend static files and JavaScript, you will need `node`, `npm`
and `yarn`.

Operation
---------

The official way is to use [yarn](https://yarnpkg.com/lang/en/) to install dependencies.

```bash
$ cd frontend
$ yarn
$ npm run build      # This creates unminified build
$ npm run build:dist # This creates minified build
```

The static files are placed in `frontend/dist` in Batchiepatchie repository.
The `test.toml` file that comes with Batchiepatchie is pointed to this
directory from root of batchiepatchie repository.

For development, if you do not want to use the `docker-compose` mechanism described in our [quickstart page](quickstart), you can instead do:

```bash
$ npm run dev
```
