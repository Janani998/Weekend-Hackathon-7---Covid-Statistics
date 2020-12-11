const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const port = 8080;

// Parse JSON bodies (as sent by API clients)
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
const { connection } = require("./connector");

function aggregateSum() {
  const sumData = connection.aggregate([
    {
      $group: {
        _id: null,
        totalRecovered: {
          $sum: "$recovered"
        },
        totalActive: {
          $sum: "$infected"
        },
        totalDeath: {
          $sum: "$death"
        }
      }
    }
  ]);
  return sumData;
}

app.get("/totalRecovered", (req, res) => {
  connection
    .aggregate([
      {
        $group: {
          _id: null,
          totalRecovered: {
            $sum: "$recovered"
          }
        }
      }
    ])
    .then((result) => {
      const recoveredResponse = {
        data: {
          _id: "total",
          recovered: result[0].totalRecovered
        }
      };
      res.send(recoveredResponse);
    })
    .catch((error) => res.status(404).send(error));
});

app.get("/totalActive", (req, res) => {
  connection
    .aggregate([
      {
        $group: {
          _id: null,
          totalActive: {
            $sum: {
              $subtract: ["$infected", "$recovered"]
            }
          }
        }
      }
    ])
    .then((result) => {
      const activeResponse = {
        data: {
          _id: "total",
          active: result[0].totalActive
        }
      };
      res.send(activeResponse);
    })
    .catch((error) => res.status(404).send(error));
});

app.get("/totalDeath", (req, res) => {
  connection
    .aggregate([
      {
        $group: {
          _id: null,
          totaldeath: {
            $sum: "$death"
          }
        }
      }
    ])
    .then((result) => {
      const deathResponse = {
        data: {
          _id: "total",
          death: result[0].totaldeath
        }
      };
      res.send(deathResponse);
    })
    .catch((error) => res.status(404).send(error));
});

app.get("/hotspotStates", (req, res) => {
  connection
    .aggregate([
      {
        $project: {
          state: 1,
          rate: {
            $round: [
              {
                $divide: [
                  {
                    $subtract: ["$infected", "$recovered"]
                  },
                  "$infected"
                ]
              },
              5
            ]
          }
        }
      },
      {
        $match: { rate: { $gt: 0.1 } }
      }
    ])
    .then((results) => {
      const hotspots = results.map((result) => {
        return { state: result.state, rate: result.rate };
      });
      const hostspotResponse = {
        data: hotspots
      };
      res.send(hostspotResponse);
    })
    .catch((error) => res.status(404).send(error));
});

app.get("/healthyStates", (req, res) => {
  connection
    .aggregate([
      {
        $project: {
          state: 1,
          mortality: {
            $round: [
              {
                $divide: ["$death", "$infected"]
              },
              5
            ]
          }
        }
      },
      {
        $match: { mortality: { $lt: 0.005 } }
      }
    ])
    .then((results) => {
      const healthyStates = results.map((result) => {
        return { state: result.state, mortality: result.mortality };
      });
      const healthyStatesResponse = {
        data: healthyStates
      };
      res.send(healthyStatesResponse);
    })
    .catch((error) => res.status(404).send(error));
});

app.listen(port, () => console.log(`App listening on port ${port}!`));

module.exports = app;
