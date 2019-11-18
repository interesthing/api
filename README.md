# API interesthing

Interesthing is a RESTful API implemented with [Express][express]. The goal of this API REST is to show the point of interest in every town of the world like a graffity, a funny place etc. Basically, users can : 

* **log in** to the API
* **post** some points of interest (POI)
* **see** all of the points of interest (POI)
* **rate** the other points of interest (POI)

Visit this [links][doc] for an app demo. 

## Requirements

* [Node.js][node] 12.x
* [MongoDB][mongo] 4.x

## Usage

```bash
git clone https://github.com/interesthing/api.git
cd api
npm ci
npm start
```

Visit [http://localhost:3000](http://localhost:3000).

To automatically reload the code and re-generate the API documentation on changes, use `npm run dev` instead of `npm start`.

## Documentation

The documentation of the API is available at the index page of the app. 
You can also read the documentation on-line [here][doc].

## Real-time component 

Websocket is implemented for the real-time component. An insight message is generated on every post and delete actions for ratings, points of intereste & users. The message format is generated in JSON, like this : 

```JSON
{
  "TotalUser": 2,
  "TotalPoi": 9,
  "TotalRating": 0
}
```

The websocket service is available at this URL : 
```
ws://{PATH_to_the_application}
``` 
For example, if you work on your machine, the path should be like this : 
```
ws://localhost:3000/
```
If you want to test this service, you can use this [webservice][ws].

[express]: https://expressjs.com
[mongo]: https://www.mongodb.com
[node]: https://nodejs.org/
[doc]: https://interesthing.herokuapp.com/
[ws]: https://msg-central.herokuapp.com/ws
