const { plot, Plot } = require("nodeplotlib");
const fs = require('fs');


let X, Y, n = 1000, i;


async function print() {
  X = fs.readFileSync('X.txt', 'utf8' , (err, data) => {
    if (err) {
      console.error(err)
      return
    }
  });
  
  Y = fs.readFileSync('Y.txt', 'utf8' , (err, data) => {
    if (err) {
      console.error(err)
      return
    }
  })

  X = JSON.parse(X);
  X.map(item => parseInt(item))

  Y = JSON.parse(Y);
  Y.map(item => parseInt(item))
  
  const data = [
    {
      x: X,
      y: Y,
      type: "scattergl",
      mode: "markers",
      marker: {
        line: {
          width: 1,
          color: "#404040",
        },
      }
    },
  ];
  await plot(data);
}

print()
