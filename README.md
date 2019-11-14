# API interesthing

The goal of this API REST is to show the point of interest in every town of the world like a graffity, a funny place etc. Basically, the users can : 

* **log in** to the API
* **post** some points of interest (POI)
* **see** all of the points of interest
* **rate** the other points of interest

## Documentation

The documentation of the API is available at the index page of the app. 

## Real-time component 

Websocket is implemented for the real-time component. An insight message is generated on every post and delete for ratings, points of intereste & users. The message format is generated in JSON, like this : 

```
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
